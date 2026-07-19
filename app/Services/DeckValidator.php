<?php

namespace App\Services;

use InvalidArgumentException;

/**
 * Серверная валидация колоды (канон: DeckMaker.startNewGame / deckFromJSON в public/gwent.js).
 *
 * Правила:
 * - фракция из списка играбельных;
 * - лидер существует, принадлежит фракции и имеет row === 'leader';
 * - каждая карта существует, не лидер, её deck из {faction, neutral, special, weather};
 * - копий не больше card['count'];
 * - юнитов минимум 22; спецкарт (special + weather) максимум 10.
 */
class DeckValidator
{
    public const FACTIONS = ['realms', 'nilfgaard', 'monsters', 'scoiatael', 'skellige'];

    public const MIN_UNITS = 22;
    public const MAX_SPECIALS = 10;

    /**
     * @param array<mixed> $cards список пар [index, count]
     * @return array{faction: string, leader_id: int, cards: array<int, array{0: int, 1: int}>}
     * @throws InvalidArgumentException
     */
    public static function validate(string $faction, int $leaderId, array $cards): array
    {
        if (!in_array($faction, self::FACTIONS, true)) {
            throw new InvalidArgumentException('Неизвестная фракция.');
        }

        $leader = GwentCardData::get($leaderId);
        if (!$leader || ($leader['row'] ?? '') !== 'leader') {
            throw new InvalidArgumentException('Выбранная карта не является лидером.');
        }
        if (($leader['deck'] ?? '') !== $faction) {
            throw new InvalidArgumentException('Лидер не принадлежит выбранной фракции.');
        }

        // Слияние дублей индексов
        $counts = [];
        foreach ($cards as $entry) {
            if (!is_array($entry) || count($entry) !== 2) {
                throw new InvalidArgumentException('Неверный формат списка карт.');
            }
            [$index, $count] = array_values($entry);
            if (!is_int($index) && !ctype_digit((string) $index)) {
                throw new InvalidArgumentException('Неверный индекс карты.');
            }
            $index = (int) $index;
            $count = (int) $count;
            if ($count < 1) {
                throw new InvalidArgumentException('Количество копий карты должно быть не меньше 1.');
            }
            $counts[$index] = ($counts[$index] ?? 0) + $count;
        }

        if ($counts === []) {
            throw new InvalidArgumentException('Колода пуста.');
        }

        $units = 0;
        $specials = 0;
        $normalized = [];

        foreach ($counts as $index => $count) {
            $card = GwentCardData::get($index);
            if (!$card) {
                throw new InvalidArgumentException("Карта с индексом {$index} не существует.");
            }
            if (($card['row'] ?? '') === 'leader') {
                throw new InvalidArgumentException("Карта «{$card['name']}» — лидер, её нельзя добавить в колоду.");
            }

            $cardDeck = $card['deck'] ?? '';
            if (!in_array($cardDeck, [$faction, 'neutral', 'special', 'weather'], true)) {
                throw new InvalidArgumentException("Карта «{$card['name']}» не принадлежит фракции колоды.");
            }

            $maxCopies = (int) ($card['count'] ?? 1);
            if ($count > $maxCopies) {
                throw new InvalidArgumentException("Карта «{$card['name']}»: не больше {$maxCopies} копий.");
            }

            if ($cardDeck === 'special' || $cardDeck === 'weather') {
                $specials += $count;
            } else {
                $units += $count;
            }

            $normalized[] = [(int) $index, $count];
        }

        if ($units < self::MIN_UNITS) {
            throw new InvalidArgumentException('В колоде должно быть не меньше ' . self::MIN_UNITS . ' карт юнитов.');
        }

        if ($specials > self::MAX_SPECIALS) {
            throw new InvalidArgumentException('В колоде может быть не больше ' . self::MAX_SPECIALS . ' специальных карт.');
        }

        return [
            'faction' => $faction,
            'leader_id' => $leaderId,
            'cards' => $normalized,
        ];
    }
}
