<?php

namespace App\Services;

class GwentEngine
{
    private const ROWS = ['close', 'ranged', 'siege'];
    private const WEATHER_ROW = ['frost' => 'close', 'fog' => 'ranged', 'rain' => 'siege'];
    private const AVENGER_SUMMON = ['avenger' => 21, 'avenger_kambi' => 196];

    public static function initGame(array $playerIds, array $playerDecks, array $options = []): array
    {
        $state = [
            'players' => [],
            'weather' => ['close' => false, 'ranged' => false, 'siege' => false],
            'weather_cards' => [],
            'special_cards' => [],
            'horns' => [],
            'leader_horns' => [],
            'mardroeme_rows' => [],
            'half_weather_rows' => [],
            'pending_medic' => null,
            'leader_result' => null,
            'random_respawn' => false,
            'double_spy_power' => false,
            'leaders_disabled' => false,
            'round' => 1,
            'turn_number' => 0,
            'round_history' => [],
            'last_round_winner_id' => null,
            'first_player_id' => null,
            'scoiatael_first_choice_user_id' => null,
        ];

        foreach ($playerIds as $i => $userId) {
            $deck = $playerDecks[$userId];
            $cardIndices = self::expandDeck($deck['deck_cards']);
            shuffle($cardIndices);

            $hand = array_splice($cardIndices, 0, 10);

            $state['players'][$userId] = [
                'deck'             => $cardIndices,
                'hand'             => $hand,
                'board'            => ['close' => [], 'ranged' => [], 'siege' => []],
                'grave'            => [],
                'health'           => 2,
                'passed'           => false,
                'leader_used'      => false,
                'leader_disabled'  => false,
                'faction'          => $deck['deck_faction'],
                'leader_index'     => $deck['deck_leader_id'],
                'redraw_remaining' => 2,
            ];

            foreach (self::ROWS as $row) {
                $state['horns'][$userId . '_' . $row] = false;
                $state['leader_horns'][$userId . '_' . $row] = false;
                $state['mardroeme_rows'][$userId . '_' . $row] = false;
            }
        }

        $state = self::applyGameStartLeaderPassives($state, $playerIds);
        $state = self::initializeFirstPlayer($state, $playerIds, $options);

        return self::sortAllHands($state);
    }

    public static function reDrawCard(array $state, int $userId, int $handPos): array
    {
        $player = $state['players'][$userId];

        if (($player['redraw_remaining'] ?? 0) <= 0) {
            throw new \InvalidArgumentException('Больше нет попыток замены карт.');
        }

        if (!array_key_exists($handPos, $player['hand'])) {
            throw new \InvalidArgumentException('Неверная позиция в руке.');
        }

        $cardToReturn = $player['hand'][$handPos];
        array_splice($state['players'][$userId]['hand'], $handPos, 1);

        $state['players'][$userId]['deck'][] = $cardToReturn;
        shuffle($state['players'][$userId]['deck']);

        if (!empty($state['players'][$userId]['deck'])) {
            $drawn = array_shift($state['players'][$userId]['deck']);
            $state['players'][$userId]['hand'][] = $drawn;
        }

        $state['players'][$userId]['redraw_remaining']--;

        return self::sortHand($state, $userId);
    }

    public static function skipRedraw(array $state, int $userId): array
    {
        $state['players'][$userId]['redraw_remaining'] = 0;
        return $state;
    }

    public static function playCard(
        array $state,
        int $userId,
        int $cardIndex,
        string $row,
        int $opponentId,
        ?int $targetIndex = null
    ): array {
        $player = $state['players'][$userId];

        $handPos = array_search($cardIndex, $player['hand']);
        if ($handPos === false) {
            throw new \InvalidArgumentException('Карта не найдена в руке.');
        }

        $card = GwentCardData::get($cardIndex);
        if (!$card) {
            throw new \InvalidArgumentException('Неизвестная карта.');
        }

        array_splice($state['players'][$userId]['hand'], $handPos, 1);

        $abilities = $card['abilities'];

        if (in_array('spy', $abilities)) {
            $state = self::applySpy($state, $userId, $opponentId, $cardIndex, $row, $card);
        } elseif (in_array('frost', $abilities) || in_array('fog', $abilities) || in_array('rain', $abilities)) {
            $state = self::applyWeather($state, $card, $userId, $cardIndex);
        } elseif (in_array('clear', $abilities)) {
            $state = self::applyClearWeather($state, $userId, $cardIndex);
        } elseif (in_array('horn', $abilities) && $card['row'] === '') {
            $state = self::applyHorn($state, $userId, $row, $cardIndex);
        } elseif (in_array('mardroeme', $abilities) && $card['row'] === '') {
            $state = self::applyMardroeme($state, $userId, $row, $cardIndex);
        } elseif (in_array('mardroeme', $abilities)) {
            // Юнит с mardroeme (Ermion): ставится на ряд и применяет эффект, слот спецкарты не занимает
            $state = self::placeCard($state, $userId, $cardIndex, $row, $card);
            $unitRow = in_array($card['row'], self::ROWS) ? $card['row'] : (in_array($row, self::ROWS) ? $row : 'close');
            $state = self::applyMardroemeEffect($state, $userId, $unitRow);
        } elseif (in_array('scorch', $abilities) && $card['row'] === '') {
            $state = self::applyGlobalScorch($state);
            $state['players'][$userId]['grave'][] = $cardIndex;
        } elseif (in_array('scorch_c', $abilities)) {
            $state = self::placeCard($state, $userId, $cardIndex, $row, $card);
            $state = self::applyRowScorch($state, $opponentId, 'close');
        } elseif (in_array('scorch_r', $abilities)) {
            $state = self::placeCard($state, $userId, $cardIndex, $row, $card);
            $state = self::applyRowScorch($state, $opponentId, 'ranged');
        } elseif (in_array('scorch_s', $abilities)) {
            $state = self::placeCard($state, $userId, $cardIndex, $row, $card);
            $state = self::applyRowScorch($state, $opponentId, 'siege');
        } elseif (in_array('medic', $abilities)) {
            $state = self::placeCard($state, $userId, $cardIndex, $row, $card);
            if ($targetIndex !== null) {
                $state = self::applyMedic($state, $userId, $targetIndex);
            } elseif (!empty($state['players'][$userId]['grave'])) {
                $state['pending_medic'] = ['user_id' => $userId, 'row' => $row];
            }
        } elseif (in_array('muster', $abilities)) {
            $state = self::applyMuster($state, $userId, $cardIndex, $row, $card);
        } elseif (in_array('decoy', $abilities)) {
            if ($targetIndex !== null) {
                $state = self::applyDecoy($state, $userId, $cardIndex, $targetIndex);
            }
        } else {
            $state = self::placeCard($state, $userId, $cardIndex, $row, $card);
        }

        $state['turn_number'] = ($state['turn_number'] ?? 0) + 1;

        return self::sortAllHands($state);
    }

    public static function activateLeader(array $state, int $userId, int $opponentId, array $choices = []): array
    {
        $state['leader_result'] = null;

        if (($state['players'][$userId]['leader_used'] ?? false) || ($state['players'][$userId]['leader_disabled'] ?? false)) {
            throw new \InvalidArgumentException('Способность лидера уже недоступна.');
        }

        $leaderIndex = $state['players'][$userId]['leader_index'] ?? null;
        $leader = is_numeric($leaderIndex) ? GwentCardData::get((int) $leaderIndex) : null;
        if (!$leader || ($leader['row'] ?? null) !== 'leader') {
            throw new \InvalidArgumentException('Лидер не найден.');
        }

        $ability = $leader['abilities'][0] ?? null;
        if (!$ability || !self::isActivatedLeaderAbility($ability)) {
            throw new \InvalidArgumentException('У этого лидера нет активируемой способности.');
        }

        $state['players'][$userId]['leader_used'] = true;

        switch ($ability) {
            case 'foltest_king':
                $state = self::playWeatherFromDeck($state, $userId, 'Impenetrable Fog');
                break;
            case 'foltest_lord':
                $state = self::applyClearWeather($state);
                break;
            case 'foltest_siegemaster':
                $state = self::applyLeaderHorn($state, $userId, 'siege');
                break;
            case 'foltest_steelforged':
                $state = self::applyRowScorch($state, $opponentId, 'siege');
                break;
            case 'foltest_son':
                $state = self::applyRowScorch($state, $opponentId, 'ranged');
                break;
            case 'emhyr_imperial':
                $state = self::playWeatherFromDeck($state, $userId, 'Torrential Rain');
                break;
            case 'emhyr_emperor':
                $state['leader_result'] = [
                    'type' => 'reveal_hand',
                    'cards' => self::pickRandomValues($state['players'][$opponentId]['hand'] ?? [], 3),
                ];
                break;
            case 'emhyr_relentless':
                $state = self::moveGraveUnitToHand($state, $opponentId, $userId, $choices['grave_pos'] ?? null);
                break;
            case 'eredin_commander':
                $state = self::applyLeaderHorn($state, $userId, 'close');
                break;
            case 'eredin_bringer_of_death':
                $state = self::moveGraveUnitToHand($state, $userId, $userId, $choices['grave_pos'] ?? null);
                break;
            case 'eredin_destroyer':
                $state = self::applyEredinDestroyer($state, $userId, $choices);
                break;
            case 'eredin_king':
                $state = self::playWeatherChoiceFromDeck($state, $userId, $choices['choice_index'] ?? null);
                break;
            case 'francesca_queen':
                $state = self::applyRowScorch($state, $opponentId, 'close');
                break;
            case 'francesca_beautiful':
                $state = self::applyLeaderHorn($state, $userId, 'ranged');
                break;
            case 'francesca_pureblood':
                $state = self::playWeatherFromDeck($state, $userId, 'Biting Frost');
                break;
            case 'francesca_hope':
                $state = self::moveAgileUnitsToBestRows($state, $userId);
                break;
            case 'crach_an_craite':
                $state = self::shuffleGravesIntoDecks($state);
                break;
        }

        $state['turn_number'] = ($state['turn_number'] ?? 0) + 1;

        return self::sortAllHands($state);
    }

    public static function chooseFirstPlayer(array $state, int $chooserUserId, bool $preferFirst, array $playerIds): array
    {
        if (($state['turn_number'] ?? 0) > 0) {
            throw new \InvalidArgumentException('Первый ход уже нельзя изменить.');
        }

        if (($state['scoiatael_first_choice_user_id'] ?? null) !== $chooserUserId) {
            throw new \InvalidArgumentException('Выбор первого хода недоступен этому игроку.');
        }

        $opponentId = self::opponentId($playerIds, $chooserUserId);
        $state['first_player_id'] = $preferFirst ? $chooserUserId : $opponentId;
        $state['scoiatael_first_choice_user_id'] = null;

        return $state;
    }

    public static function startingPlayerForCurrentRound(array $state, array $playerIds): int
    {
        $firstPlayerId = $state['first_player_id'] ?? $playerIds[0];
        $round = (int) ($state['round'] ?? 1);

        if ($round % 2 === 1) {
            return $firstPlayerId;
        }

        return self::opponentId($playerIds, (int) $firstPlayerId);
    }

    public static function medicResolve(array $state, int $userId, int $graveIndex): array
    {
        $state['pending_medic'] = null;
        $state = self::applyMedic($state, $userId, $graveIndex);

        return self::sortAllHands($state);
    }

    public static function calculateScores(array $state): array
    {
        $scores = [];
        foreach ($state['players'] as $userId => $player) {
            $total = 0;
            foreach (self::ROWS as $row) {
                $total += self::calculateRowScore($state, (int) $userId, $row);
            }
            $scores[$userId] = $total;
        }
        return $scores;
    }

    public static function calculateRowScore(array $state, int $userId, string $row): int
    {
        $cards = $state['players'][$userId]['board'][$row] ?? [];
        if (empty($cards)) {
            return 0;
        }

        $total = 0;
        foreach ($cards as $ci) {
            $total += self::calculateCardPower($state, $userId, $row, $ci);
        }

        return $total;
    }

    public static function calculateCardPower(array $state, int $userId, string $row, int $cardIndex): int
    {
        $card = GwentCardData::get($cardIndex);
        if (!$card) {
            return 0;
        }

        if ($card['name'] === 'Decoy') {
            return 0;
        }

        $modifiers = self::getRowModifiers($state, $userId, $row);

        return self::computeCardPower(
            $card,
            $modifiers['weatherActive'],
            $modifiers['halfWeather'],
            $modifiers['hornCount'],
            $modifiers['moraleBonus'],
            $modifiers['bondGroups'],
            $state['double_spy_power'] ?? false
        );
    }

    public static function endRound(array $state, array $playerIds): array
    {
        $scores = self::calculateScores($state);

        $p1 = $playerIds[0];
        $p2 = $playerIds[1];
        $winnerId = null;

        if ($scores[$p1] > $scores[$p2]) {
            $state['players'][$p2]['health']--;
            $winnerId = $p1;
        } elseif ($scores[$p2] > $scores[$p1]) {
            $state['players'][$p1]['health']--;
            $winnerId = $p2;
        } else {
            $p1Nilfgaard = ($state['players'][$p1]['faction'] ?? null) === 'nilfgaard';
            $p2Nilfgaard = ($state['players'][$p2]['faction'] ?? null) === 'nilfgaard';

            if ($p1Nilfgaard xor $p2Nilfgaard) {
                $winnerId = $p1Nilfgaard ? $p1 : $p2;
                $loserId = $p1Nilfgaard ? $p2 : $p1;
                $state['players'][$loserId]['health']--;
            } else {
                $state['players'][$p1]['health']--;
                $state['players'][$p2]['health']--;
            }
        }

        $state['last_round_winner_id'] = $winnerId;
        $state['round_history'][] = [
            'round' => $state['round'] ?? 1,
            'winner_id' => $winnerId,
            'scores' => $scores,
        ];

        $persisting = self::pickMonstersPersistingCards($state, $playerIds);

        foreach ($playerIds as $uid) {
            $player = $state['players'][$uid];
            foreach (self::ROWS as $row) {
                $nextRow = [];
                foreach ($player['board'][$row] as $pos => $ci) {
                    if (($persisting[$uid . '_' . $row] ?? null) === $pos) {
                        $nextRow[] = $ci;
                    } else {
                        $state['players'][$uid]['grave'][] = $ci;
                    }
                }
                $state['players'][$uid]['board'][$row] = $nextRow;
                $state['horns'][$uid . '_' . $row] = false;
                $state['leader_horns'][$uid . '_' . $row] = false;
                $state['mardroeme_rows'][$uid . '_' . $row] = false;
            }
            $state['players'][$uid]['passed'] = false;
        }

        // Канон Row.clear: спецкарта из слота уходит в кладбище владельца
        foreach (($state['special_cards'] ?? []) as $key => $ci) {
            $uid = (int) explode('_', (string) $key)[0];
            if (isset($state['players'][$uid])) {
                $state['players'][$uid]['grave'][] = (int) $ci;
            }
        }
        $state['special_cards'] = [];

        // Канон Weather.clearWeather при endRound: погодные карты в кладбища владельцев
        foreach (($state['weather_cards'] ?? []) as $wc) {
            $uid = (int) $wc['owner'];
            if (isset($state['players'][$uid])) {
                $state['players'][$uid]['grave'][] = (int) $wc['index'];
            }
        }
        $state['weather_cards'] = [];

        $state['weather'] = ['close' => false, 'ranged' => false, 'siege' => false];
        $state['pending_medic'] = null;
        $state['leader_result'] = null;

        if (($state['players'][$p1]['health'] ?? 0) > 0 && ($state['players'][$p2]['health'] ?? 0) > 0) {
            $state['round'] = ($state['round'] ?? 1) + 1;
            $state = self::applyRoundStartPassives($state, $playerIds, $winnerId);
        }

        return self::sortAllHands($state);
    }

    public static function getValidGraveMedic(array $state, int $userId): array
    {
        $grave = $state['players'][$userId]['grave'] ?? [];
        $valid = [];
        foreach ($grave as $pos => $ci) {
            $c = GwentCardData::get($ci);
            if ($c && !in_array('hero', $c['abilities']) && $c['row'] !== '' && $c['row'] !== 'leader') {
                $valid[] = ['pos' => $pos, 'index' => $ci, 'card' => $c];
            }
        }
        return $valid;
    }

    public static function getPlayerBoardScore(array $state, int $userId): int
    {
        $total = 0;
        foreach (self::ROWS as $row) {
            $total += self::calculateRowScore($state, $userId, $row);
        }
        return $total;
    }

    private static function getRowModifiers(array $state, int $userId, string $row): array
    {
        $cards = $state['players'][$userId]['board'][$row] ?? [];
        $hornKey = $userId . '_' . $row;
        $hornCount = ($state['horns'][$hornKey] ?? false) ? 1 : 0;
        $hornCount += ($state['leader_horns'][$hornKey] ?? false) ? 1 : 0;
        $moraleBonus = 0;

        foreach ($cards as $ci) {
            $c = GwentCardData::get($ci);
            if (!$c || in_array('hero', $c['abilities'])) {
                continue;
            }
            if (in_array('morale', $c['abilities'])) {
                $moraleBonus++;
            }
            if (in_array('horn', $c['abilities'])) {
                $hornCount++;
            }
        }

        $bondGroups = [];
        foreach ($cards as $ci) {
            $c = GwentCardData::get($ci);
            if ($c && in_array('bond', $c['abilities'])) {
                $bondGroups[$c['name']] = ($bondGroups[$c['name']] ?? 0) + 1;
            }
        }

        return [
            'weatherActive' => $state['weather'][$row] ?? false,
            'halfWeather' => $state['half_weather_rows'][$hornKey] ?? false,
            'hornCount' => $hornCount,
            'moraleBonus' => $moraleBonus,
            'bondGroups' => $bondGroups,
        ];
    }

    private static function computeCardPower(
        array $card,
        bool $weatherActive,
        bool $halfWeather,
        int $hornCountOnRow,
        int $moraleBonus,
        array $bondGroups,
        bool $doubleSpyPower = false
    ): int {
        if (in_array('hero', $card['abilities'])) {
            return (int) $card['strength'];
        }

        $power = (int) $card['strength'];

        if ($weatherActive) {
            if ($halfWeather) {
                $power = max(1, (int) floor($power / 2));
            } else {
                $power = min(1, $power);
            }
        }

        if ($doubleSpyPower && in_array('spy', $card['abilities'])) {
            $power *= 2;
        }

        if (in_array('bond', $card['abilities']) && ($bondGroups[$card['name']] ?? 0) > 1) {
            $power *= 2;
        }

        $power += max(0, $moraleBonus - (in_array('morale', $card['abilities']) ? 1 : 0));

        $effectiveHorn = $hornCountOnRow - (in_array('horn', $card['abilities']) ? 1 : 0);
        if ($effectiveHorn > 0) {
            $power *= 2;
        }

        return $power;
    }

    private static function isUnitCard(array $card): bool
    {
        if (in_array('hero', $card['abilities'])) {
            return false;
        }

        return in_array($card['row'], self::ROWS, true) || $card['row'] === 'agile';
    }

    private static function removeCardFromBoard(array $state, int $userId, string $row, int $cardIndex): array
    {
        $board = &$state['players'][$userId]['board'][$row];
        $pos = array_search($cardIndex, $board, true);
        if ($pos === false) {
            return $state;
        }

        array_splice($board, $pos, 1);
        $state = self::triggerAvengerOnRemoval($state, $userId, $cardIndex);

        return $state;
    }

    private static function triggerAvengerOnRemoval(array $state, int $userId, int $removedCardIndex): array
    {
        $card = GwentCardData::get($removedCardIndex);
        if (!$card) {
            return $state;
        }

        foreach (self::AVENGER_SUMMON as $ability => $summonIndex) {
            if (in_array($ability, $card['abilities'], true)) {
                $state['players'][$userId]['board']['close'][] = $summonIndex;
                break;
            }
        }

        return $state;
    }

    private static function placeCard(array $state, int $userId, int $cardIndex, string $row, array $card): array
    {
        $effectiveRow = $row;
        if ($card['row'] === 'agile') {
            $effectiveRow = in_array($row, ['close', 'ranged']) ? $row : 'close';
        } elseif (in_array($card['row'], self::ROWS)) {
            $effectiveRow = $card['row'];
        }

        if (in_array('berserker', $card['abilities']) && ($state['mardroeme_rows'][$userId . '_' . $effectiveRow] ?? false)) {
            $cardIndex = self::transformedBerserkerIndex($card);
            $card = GwentCardData::get($cardIndex) ?? $card;
            $effectiveRow = in_array($card['row'], self::ROWS) ? $card['row'] : $effectiveRow;
        }

        $state['players'][$userId]['board'][$effectiveRow][] = $cardIndex;
        return $state;
    }

    private static function applySpy(array $state, int $userId, int $opponentId, int $cardIndex, string $row, array $card): array
    {
        $effectiveRow = in_array($card['row'], self::ROWS) ? $card['row'] : 'close';
        $state['players'][$opponentId]['board'][$effectiveRow][] = $cardIndex;

        for ($i = 0; $i < 2; $i++) {
            if (!empty($state['players'][$userId]['deck'])) {
                $drawn = array_shift($state['players'][$userId]['deck']);
                $state['players'][$userId]['hand'][] = $drawn;
            }
        }

        return $state;
    }

    private static function applyWeather(array $state, array $card, ?int $ownerId = null, ?int $cardIndex = null): array
    {
        foreach ($card['abilities'] as $ability) {
            if (isset(self::WEATHER_ROW[$ability])) {
                $state['weather'][self::WEATHER_ROW[$ability]] = true;
            }
        }

        if ($ownerId === null || $cardIndex === null) {
            return $state;
        }

        // Канон Weather.addCard: дубликат по имени сразу уходит в кладбище владельца
        foreach (($state['weather_cards'] ?? []) as $wc) {
            $existing = GwentCardData::get((int) $wc['index']);
            if ($existing && $existing['name'] === $card['name']) {
                $state['players'][$ownerId]['grave'][] = $cardIndex;
                return $state;
            }
        }

        $state['weather_cards'][] = ['index' => $cardIndex, 'owner' => $ownerId];

        return $state;
    }

    private static function applyClearWeather(array $state, ?int $ownerId = null, ?int $clearCardIndex = null): array
    {
        // Канон Weather.clearWeather: карты из погодного слота уходят в кладбища владельцев
        foreach (($state['weather_cards'] ?? []) as $wc) {
            $owner = (int) $wc['owner'];
            if (isset($state['players'][$owner])) {
                $state['players'][$owner]['grave'][] = (int) $wc['index'];
            }
        }
        $state['weather_cards'] = [];

        if ($ownerId !== null && $clearCardIndex !== null) {
            $state['players'][$ownerId]['grave'][] = $clearCardIndex;
        }

        $state['weather'] = ['close' => false, 'ranged' => false, 'siege' => false];
        return $state;
    }

    private static function specialSlotOccupied(array $state, string $key): bool
    {
        return isset($state['special_cards'][$key])
            || ($state['horns'][$key] ?? false)
            || ($state['leader_horns'][$key] ?? false);
    }

    private static function applyHorn(array $state, int $userId, string $row, int $cardIndex): array
    {
        $effectiveRow = in_array($row, self::ROWS) ? $row : 'close';
        $key = $userId . '_' . $effectiveRow;

        // Канон: спец-слот ряда вмещает одну карту (Row.special !== null - ряд недоступен)
        if (self::specialSlotOccupied($state, $key)) {
            throw new \InvalidArgumentException('В этом ряду уже есть спецкарта.');
        }

        $state['horns'][$key] = true;
        $state['special_cards'][$key] = $cardIndex;

        return $state;
    }

    private static function applyGlobalScorch(array $state): array
    {
        $maxPower = 0;
        $targets = [];

        foreach ($state['players'] as $uid => $player) {
            foreach (self::ROWS as $row) {
                foreach ($player['board'][$row] as $ci) {
                    $c = GwentCardData::get($ci);
                    if (!$c || !self::isUnitCard($c)) {
                        continue;
                    }
                    $power = self::calculateCardPower($state, (int) $uid, $row, $ci);
                    if ($power > $maxPower) {
                        $maxPower = $power;
                        $targets = [[(int) $uid, $row, $ci]];
                    } elseif ($power === $maxPower) {
                        $targets[] = [(int) $uid, $row, $ci];
                    }
                }
            }
        }

        if (empty($targets)) {
            return $state;
        }

        foreach ($targets as [$uid, $row, $ci]) {
            $state = self::removeCardFromBoard($state, $uid, $row, $ci);
            $state['players'][$uid]['grave'][] = $ci;
        }

        return $state;
    }

    private static function applyRowScorch(array $state, int $opponentId, string $row): array
    {
        if (self::calculateRowScore($state, $opponentId, $row) < 10) {
            return $state;
        }

        $maxPower = 0;
        $targets = [];

        foreach ($state['players'][$opponentId]['board'][$row] as $ci) {
            $c = GwentCardData::get($ci);
            if (!$c || !self::isUnitCard($c)) {
                continue;
            }
            $power = self::calculateCardPower($state, $opponentId, $row, $ci);
            if ($power > $maxPower) {
                $maxPower = $power;
                $targets = [$ci];
            } elseif ($power === $maxPower) {
                $targets[] = $ci;
            }
        }

        foreach ($targets as $ci) {
            $state = self::removeCardFromBoard($state, $opponentId, $row, $ci);
            $state['players'][$opponentId]['grave'][] = $ci;
        }

        return $state;
    }

    private static function applyMedic(array $state, int $userId, int $gravePos): array
    {
        if ($state['random_respawn'] ?? false) {
            $gravePos = self::firstValidGraveUnitPos($state, $userId, true);
            if ($gravePos === null) {
                return $state;
            }
        }

        $grave = $state['players'][$userId]['grave'];
        if (!isset($grave[$gravePos])) {
            return $state;
        }

        $ci = $grave[$gravePos];
        $card = GwentCardData::get($ci);

        if (!$card || in_array('hero', $card['abilities']) || $card['row'] === '' || $card['row'] === 'leader') {
            return $state;
        }

        array_splice($state['players'][$userId]['grave'], $gravePos, 1);

        // Канон (abilities.js medic): воскрешённая карта разыгрывается заново
        // (autoplay + placed-хуки: шпион уходит на сторону соперника с добором,
        // медик продолжает цепочку, muster призывает копии, scorch_* жгут ряд)
        $abilities = $card['abilities'];
        $row = in_array($card['row'], self::ROWS) ? $card['row'] : 'close';
        $opponentId = self::opponentOf($state, $userId);

        if ($opponentId !== null && in_array('spy', $abilities)) {
            return self::applySpy($state, $userId, $opponentId, $ci, $row, $card);
        }

        if (in_array('muster', $abilities)) {
            return self::applyMuster($state, $userId, $ci, $row, $card);
        }

        if ($opponentId !== null && in_array('scorch_c', $abilities)) {
            $state = self::placeCard($state, $userId, $ci, $row, $card);
            return self::applyRowScorch($state, $opponentId, 'close');
        }

        if ($opponentId !== null && in_array('scorch_r', $abilities)) {
            $state = self::placeCard($state, $userId, $ci, $row, $card);
            return self::applyRowScorch($state, $opponentId, 'ranged');
        }

        if ($opponentId !== null && in_array('scorch_s', $abilities)) {
            $state = self::placeCard($state, $userId, $ci, $row, $card);
            return self::applyRowScorch($state, $opponentId, 'siege');
        }

        if (in_array('medic', $abilities)) {
            $state = self::placeCard($state, $userId, $ci, $row, $card);
            if (self::getValidGraveMedic($state, $userId) !== []) {
                $state['pending_medic'] = ['user_id' => $userId, 'row' => $row];
            }
            return $state;
        }

        return self::placeCard($state, $userId, $ci, $row, $card);
    }

    private static function opponentOf(array $state, int $userId): ?int
    {
        foreach (array_keys($state['players'] ?? []) as $uid) {
            if ((int) $uid !== $userId) {
                return (int) $uid;
            }
        }

        return null;
    }

    /**
     * Жёсткий порядок руки (фаза 12): карты действий (спецкарты, погода),
     * затем обычные отряды, в конце - золотые (герои).
     * Внутри группы - по силе и имени (как канонический Card.compare).
     */
    public static function sortHand(array $state, int $userId): array
    {
        $hand = $state['players'][$userId]['hand'] ?? [];
        usort($hand, function (int $a, int $b) {
            $ca = GwentCardData::get($a);
            $cb = GwentCardData::get($b);

            $groupDiff = self::handSortGroup($ca) <=> self::handSortGroup($cb);
            if ($groupDiff !== 0) {
                return $groupDiff;
            }

            $strengthDiff = (int) ($ca['strength'] ?? 0) <=> (int) ($cb['strength'] ?? 0);
            if ($strengthDiff !== 0) {
                return $strengthDiff;
            }

            return strcmp($ca['name'] ?? '', $cb['name'] ?? '');
        });
        $state['players'][$userId]['hand'] = $hand;

        return $state;
    }

    private static function handSortGroup(?array $card): int
    {
        if (!$card) {
            return 2;
        }
        if ($card['deck'] === 'special') {
            return 0;
        }
        if ($card['deck'] === 'weather') {
            return 1;
        }
        if (in_array('hero', $card['abilities'])) {
            return 3;
        }

        return 2;
    }

    private static function sortAllHands(array $state): array
    {
        foreach (array_keys($state['players'] ?? []) as $uid) {
            $state = self::sortHand($state, (int) $uid);
        }

        return $state;
    }

    private static function applyMuster(array $state, int $userId, int $cardIndex, string $row, array $card): array
    {
        $musterName = self::musterName($card['name']);
        $state = self::placeCard($state, $userId, $cardIndex, $row, $card);

        $newHand = [];
        foreach ($state['players'][$userId]['hand'] as $ci) {
            $c = GwentCardData::get($ci);
            if ($c && str_starts_with($c['name'], $musterName)) {
                $state = self::placeCard($state, $userId, $ci, $row, $c);
            } else {
                $newHand[] = $ci;
            }
        }
        $state['players'][$userId]['hand'] = $newHand;

        $newDeck = [];
        foreach ($state['players'][$userId]['deck'] as $ci) {
            $c = GwentCardData::get($ci);
            if ($c && str_starts_with($c['name'], $musterName)) {
                $state = self::placeCard($state, $userId, $ci, $row, $c);
            } else {
                $newDeck[] = $ci;
            }
        }
        $state['players'][$userId]['deck'] = $newDeck;

        return $state;
    }

    private static function applyDecoy(array $state, int $userId, int $decoyIndex, int $targetCardIndex): array
    {
        $targetRow = null;
        foreach (self::ROWS as $r) {
            if (in_array($targetCardIndex, $state['players'][$userId]['board'][$r], true)) {
                $targetRow = $r;
                break;
            }
        }

        if ($targetRow === null) {
            return $state;
        }

        $targetCard = GwentCardData::get($targetCardIndex);
        if (!$targetCard || in_array('hero', $targetCard['abilities'])) {
            return $state;
        }

        $state = self::removeCardFromBoard($state, $userId, $targetRow, $targetCardIndex);
        $state['players'][$userId]['hand'][] = $targetCardIndex;
        $state['players'][$userId]['board'][$targetRow][] = $decoyIndex;

        return $state;
    }

    private static function applyGameStartLeaderPassives(array $state, array $playerIds): array
    {
        foreach ($playerIds as $uid) {
            $ability = self::leaderAbility($state, $uid);

            if ($ability === 'emhyr_whiteflame') {
                $state['leaders_disabled'] = true;
            } elseif ($ability === 'emhyr_invader') {
                $state['random_respawn'] = true;
            } elseif ($ability === 'eredin_treacherous') {
                $state['double_spy_power'] = true;
            } elseif ($ability === 'francesca_daisy') {
                if (!empty($state['players'][$uid]['deck'])) {
                    $state['players'][$uid]['hand'][] = array_shift($state['players'][$uid]['deck']);
                }
            } elseif ($ability === 'king_bran') {
                foreach (self::ROWS as $row) {
                    $state['half_weather_rows'][$uid . '_' . $row] = true;
                }
            }
        }

        if ($state['leaders_disabled']) {
            foreach ($playerIds as $uid) {
                $state['players'][$uid]['leader_disabled'] = true;
            }
        }

        return $state;
    }

    private static function initializeFirstPlayer(array $state, array $playerIds, array $options): array
    {
        $scoiataelPlayers = array_values(array_filter(
            $playerIds,
            fn($uid) => ($state['players'][$uid]['faction'] ?? null) === 'scoiatael'
        ));

        if (count($scoiataelPlayers) === 1) {
            $chooserId = (int) $scoiataelPlayers[0];
            $state['scoiatael_first_choice_user_id'] = $chooserId;

            if (array_key_exists('prefer_first', $options) && ($options['chooser_user_id'] ?? null) === $chooserId) {
                $state['first_player_id'] = $options['prefer_first']
                    ? $chooserId
                    : self::opponentId($playerIds, $chooserId);
                $state['scoiatael_first_choice_user_id'] = null;
                return $state;
            }
        }

        if (isset($options['first_player_id']) && in_array((int) $options['first_player_id'], $playerIds, true)) {
            $state['first_player_id'] = (int) $options['first_player_id'];
            return $state;
        }

        $state['first_player_id'] = (int) $playerIds[array_rand($playerIds)];

        return $state;
    }

    private static function applyRoundStartPassives(array $state, array $playerIds, ?int $lastWinnerId): array
    {
        foreach ($playerIds as $uid) {
            $faction = $state['players'][$uid]['faction'] ?? null;

            if ($faction === 'realms' && $lastWinnerId === $uid && !empty($state['players'][$uid]['deck'])) {
                $state['players'][$uid]['hand'][] = array_shift($state['players'][$uid]['deck']);
            }

            if ($faction === 'skellige' && (int) ($state['round'] ?? 1) === 3) {
                $state = self::restoreSkelligeUnits($state, (int) $uid);
            }
        }

        return $state;
    }

    private static function pickMonstersPersistingCards(array $state, array $playerIds): array
    {
        $persisting = [];

        foreach ($playerIds as $uid) {
            if (($state['players'][$uid]['faction'] ?? null) !== 'monsters') {
                continue;
            }

            $units = [];
            foreach (self::ROWS as $row) {
                foreach (($state['players'][$uid]['board'][$row] ?? []) as $pos => $ci) {
                    $card = GwentCardData::get($ci);
                    if ($card && self::isUnitCard($card)) {
                        $units[] = [$row, $pos];
                    }
                }
            }

            if ($units !== []) {
                [$row, $pos] = $units[array_rand($units)];
                $persisting[$uid . '_' . $row] = $pos;
            }
        }

        return $persisting;
    }

    private static function restoreSkelligeUnits(array $state, int $userId): array
    {
        $positions = [];
        foreach (($state['players'][$userId]['grave'] ?? []) as $pos => $ci) {
            $card = GwentCardData::get($ci);
            if ($card && self::isUnitCard($card)) {
                $positions[] = $pos;
            }
        }

        $positions = self::pickRandomValues($positions, 2);
        rsort($positions);

        foreach ($positions as $pos) {
            $ci = $state['players'][$userId]['grave'][$pos];
            $card = GwentCardData::get($ci);
            array_splice($state['players'][$userId]['grave'], $pos, 1);
            $row = in_array($card['row'], self::ROWS) ? $card['row'] : 'close';
            $state['players'][$userId]['board'][$row][] = $ci;
        }

        return $state;
    }

    private static function applyLeaderHorn(array $state, int $userId, string $row): array
    {
        $key = $userId . '_' . $row;
        // Канон Row.leaderHorn: молча пропускается, если спец-слот занят
        if (!self::specialSlotOccupied($state, $key)) {
            $state['leader_horns'][$key] = true;
        }

        return $state;
    }

    private static function applyMardroeme(array $state, int $userId, string $row, int $cardIndex): array
    {
        $effectiveRow = in_array($row, self::ROWS) ? $row : 'close';
        $key = $userId . '_' . $effectiveRow;

        // Канон: спец-слот ряда вмещает одну карту
        if (self::specialSlotOccupied($state, $key)) {
            throw new \InvalidArgumentException('В этом ряду уже есть спецкарта.');
        }

        $state['special_cards'][$key] = $cardIndex;

        return self::applyMardroemeEffect($state, $userId, $effectiveRow);
    }

    private static function applyMardroemeEffect(array $state, int $userId, string $effectiveRow): array
    {
        $state['mardroeme_rows'][$userId . '_' . $effectiveRow] = true;

        $nextCards = [];
        foreach ($state['players'][$userId]['board'][$effectiveRow] as $ci) {
            $card = GwentCardData::get($ci);
            $nextCards[] = $card && in_array('berserker', $card['abilities'])
                ? self::transformedBerserkerIndex($card)
                : $ci;
        }
        $state['players'][$userId]['board'][$effectiveRow] = $nextCards;

        return $state;
    }

    private static function transformedBerserkerIndex(array $card): int
    {
        return str_contains($card['name'], 'Young') ? 207 : 206;
    }

    private static function playWeatherFromDeck(array $state, int $userId, string $weatherName): array
    {
        foreach ($state['players'][$userId]['deck'] as $pos => $ci) {
            $card = GwentCardData::get($ci);
            if ($card && $card['name'] === $weatherName) {
                array_splice($state['players'][$userId]['deck'], $pos, 1);
                return self::applyWeather($state, $card, $userId, $ci);
            }
        }

        return $state;
    }

    private static function playWeatherChoiceFromDeck(array $state, int $userId, ?int $choiceIndex): array
    {
        foreach ($state['players'][$userId]['deck'] as $pos => $ci) {
            $card = GwentCardData::get($ci);
            if (!$card || $card['deck'] !== 'weather') {
                continue;
            }
            if ($choiceIndex !== null && $ci !== $choiceIndex) {
                continue;
            }
            array_splice($state['players'][$userId]['deck'], $pos, 1);
            if (in_array('clear', $card['abilities'])) {
                return self::applyClearWeather($state, $userId, $ci);
            }
            return self::applyWeather($state, $card, $userId, $ci);
        }

        if ($choiceIndex !== null) {
            return self::playWeatherChoiceFromDeck($state, $userId, null);
        }

        return $state;
    }

    private static function moveGraveUnitToHand(array $state, int $sourceUserId, int $targetUserId, mixed $gravePos): array
    {
        $pos = is_numeric($gravePos) ? (int) $gravePos : self::firstValidGraveUnitPos($state, $sourceUserId);
        if ($pos === null || !isset($state['players'][$sourceUserId]['grave'][$pos])) {
            return $state;
        }

        $ci = $state['players'][$sourceUserId]['grave'][$pos];
        $card = GwentCardData::get($ci);
        if (!$card || !self::isUnitCard($card)) {
            return $state;
        }

        array_splice($state['players'][$sourceUserId]['grave'], $pos, 1);
        $state['players'][$targetUserId]['hand'][] = $ci;

        return $state;
    }

    private static function applyEredinDestroyer(array $state, int $userId, array $choices): array
    {
        $discardIndices = array_slice($choices['discard_indices'] ?? [], 0, 2);
        if (count($discardIndices) < 2) {
            $discardIndices = array_slice($state['players'][$userId]['hand'], 0, 2);
        }

        foreach ($discardIndices as $ci) {
            $pos = array_search((int) $ci, $state['players'][$userId]['hand'], true);
            if ($pos !== false) {
                array_splice($state['players'][$userId]['hand'], $pos, 1);
                $state['players'][$userId]['grave'][] = (int) $ci;
            }
        }

        if (empty($state['players'][$userId]['deck'])) {
            return $state;
        }

        $drawIndex = $choices['draw_index'] ?? $state['players'][$userId]['deck'][0];
        $pos = array_search((int) $drawIndex, $state['players'][$userId]['deck'], true);
        if ($pos === false) {
            $pos = 0;
        }

        $drawn = $state['players'][$userId]['deck'][$pos];
        array_splice($state['players'][$userId]['deck'], $pos, 1);
        $state['players'][$userId]['hand'][] = $drawn;

        return $state;
    }

    private static function moveAgileUnitsToBestRows(array $state, int $userId): array
    {
        foreach (['close', 'ranged'] as $row) {
            $otherRow = $row === 'close' ? 'ranged' : 'close';
            foreach ($state['players'][$userId]['board'][$row] as $pos => $ci) {
                $card = GwentCardData::get($ci);
                if (!$card || $card['row'] !== 'agile') {
                    continue;
                }

                $currentPower = self::calculateCardPower($state, $userId, $row, $ci);
                $testState = $state;
                array_splice($testState['players'][$userId]['board'][$row], $pos, 1);
                $testState['players'][$userId]['board'][$otherRow][] = $ci;
                $otherPower = self::calculateCardPower($testState, $userId, $otherRow, $ci);

                if ($otherPower > $currentPower) {
                    array_splice($state['players'][$userId]['board'][$row], $pos, 1);
                    $state['players'][$userId]['board'][$otherRow][] = $ci;
                }
            }
        }

        return $state;
    }

    private static function shuffleGravesIntoDecks(array $state): array
    {
        foreach (array_keys($state['players']) as $uid) {
            foreach ($state['players'][$uid]['grave'] as $ci) {
                $state['players'][$uid]['deck'][] = $ci;
            }
            $state['players'][$uid]['grave'] = [];
            shuffle($state['players'][$uid]['deck']);
        }

        return $state;
    }

    private static function firstValidGraveUnitPos(array $state, int $userId, bool $random = false): ?int
    {
        $positions = [];
        foreach (($state['players'][$userId]['grave'] ?? []) as $pos => $ci) {
            $card = GwentCardData::get($ci);
            if ($card && self::isUnitCard($card)) {
                $positions[] = $pos;
            }
        }

        if ($positions === []) {
            return null;
        }

        return $random ? $positions[array_rand($positions)] : $positions[0];
    }

    private static function pickRandomValues(array $values, int $limit): array
    {
        $values = array_values($values);
        if (count($values) <= $limit) {
            return $values;
        }

        $keys = array_rand($values, $limit);
        $keys = is_array($keys) ? $keys : [$keys];

        return array_values(array_map(fn($key) => $values[$key], $keys));
    }

    private static function leaderAbility(array $state, int $userId): ?string
    {
        $leaderIndex = $state['players'][$userId]['leader_index'] ?? null;
        $leader = is_numeric($leaderIndex) ? GwentCardData::get((int) $leaderIndex) : null;

        return $leader['abilities'][0] ?? null;
    }

    private static function isActivatedLeaderAbility(string $ability): bool
    {
        return in_array($ability, [
            'foltest_king',
            'foltest_lord',
            'foltest_siegemaster',
            'foltest_steelforged',
            'foltest_son',
            'emhyr_imperial',
            'emhyr_emperor',
            'emhyr_relentless',
            'eredin_commander',
            'eredin_bringer_of_death',
            'eredin_destroyer',
            'eredin_king',
            'francesca_queen',
            'francesca_beautiful',
            'francesca_pureblood',
            'francesca_hope',
            'crach_an_craite',
        ], true);
    }

    private static function opponentId(array $playerIds, int $userId): int
    {
        foreach ($playerIds as $id) {
            if ((int) $id !== $userId) {
                return (int) $id;
            }
        }

        return $userId;
    }

    private static function musterName(string $name): string
    {
        $dashPos = strpos($name, '-');
        return $dashPos === false ? $name : trim(substr($name, 0, $dashPos));
    }

    private static function expandDeck(array $deckCards): array
    {
        $result = [];
        foreach ($deckCards as $entry) {
            if (is_array($entry) && count($entry) >= 2) {
                [$index, $count] = $entry;
                for ($i = 0; $i < (int) $count; $i++) {
                    $result[] = (int) $index;
                }
            }
        }
        return $result;
    }
}
