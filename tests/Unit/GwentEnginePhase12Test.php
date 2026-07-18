<?php

namespace Tests\Unit;

use App\Services\GwentEngine;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Фаза 12: воскрешение шпиона медиком, сортировка руки,
 * жизненный цикл погодных и спецкарт (контейнеры + кладбище).
 */
class GwentEnginePhase12Test extends TestCase
{
    private const P1 = 1;
    private const P2 = 2;

    private const DECOY = 1;        // special
    private const FROST = 2;        // weather - Biting Frost
    private const CLEAR = 4;        // weather - Clear Weather
    private const HORN = 5;         // special - Commander's Horn
    private const FOG = 9;          // weather - Impenetrable Fog
    private const SCORCH = 10;      // special - Scorch
    private const TRISS = 12;       // hero, close, 7
    private const VESEMIR = 13;     // unit, close, 6
    private const EMIEL = 7;        // unit, close, 5
    private const DUN_MEDIC = 32;   // realms medic, siege, 5
    private const THALER = 49;      // realms spy, siege, 1
    private const ERMION = 195;     // skellige hero mardroeme, ranged, 8
    private const MARDROEME = 202;  // special mardroeme
    private const YOUNG_BERSERKER = 210; // skellige berserker, ranged, 2
    private const TRANSFORMED_YOUNG = 207; // Young Berserker (vildkaarl)

    #[Test]
    public function medic_revives_spy_to_opponent_board_with_two_draws(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['hand'] = [self::DUN_MEDIC];
        $state['players'][self::P1]['deck'] = [self::VESEMIR, self::EMIEL];
        $state['players'][self::P1]['grave'] = [self::THALER];

        $state = GwentEngine::playCard($state, self::P1, self::DUN_MEDIC, 'siege', self::P2);
        $this->assertSame(self::P1, $state['pending_medic']['user_id'] ?? null);

        $state = GwentEngine::medicResolve($state, self::P1, 0);

        // Шпион выставлен на поле соперника, не на своё
        $this->assertContains(self::THALER, $state['players'][self::P2]['board']['siege']);
        $this->assertNotContains(self::THALER, $state['players'][self::P1]['board']['siege']);
        $this->assertNotContains(self::THALER, $state['players'][self::P1]['grave']);

        // Две карты добора пришли текущему игроку
        $this->assertCount(2, $state['players'][self::P1]['hand']);
        $this->assertSame([], $state['players'][self::P1]['deck']);
    }

    #[Test]
    public function medic_revived_medic_continues_chain(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['hand'] = [self::DUN_MEDIC];
        $state['players'][self::P1]['grave'] = [self::DUN_MEDIC, self::VESEMIR];

        $state = GwentEngine::playCard($state, self::P1, self::DUN_MEDIC, 'siege', self::P2);
        $state = GwentEngine::medicResolve($state, self::P1, 0);

        // Воскрешённый медик размещён и снова ждёт выбора из кладбища
        $this->assertCount(2, $state['players'][self::P1]['board']['siege']);
        $this->assertSame(self::P1, $state['pending_medic']['user_id'] ?? null);

        $state = GwentEngine::medicResolve($state, self::P1, 0);
        $this->assertContains(self::VESEMIR, $state['players'][self::P1]['board']['close']);
        $this->assertNull($state['pending_medic']);
    }

    #[Test]
    public function hand_sorted_actions_then_units_then_heroes(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['hand'] = [self::TRISS, self::VESEMIR, self::FROST, self::HORN];

        $state = GwentEngine::sortHand($state, self::P1);

        $this->assertSame(
            [self::HORN, self::FROST, self::VESEMIR, self::TRISS],
            $state['players'][self::P1]['hand']
        );
    }

    #[Test]
    public function weather_card_tracked_and_duplicate_goes_to_grave(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['hand'] = [self::FROST];
        $state['players'][self::P2]['hand'] = [self::FROST];

        $state = GwentEngine::playCard($state, self::P1, self::FROST, 'close', self::P2);

        $this->assertTrue($state['weather']['close']);
        $this->assertCount(1, $state['weather_cards']);
        $this->assertSame(self::P1, $state['weather_cards'][0]['owner']);

        $state = GwentEngine::playCard($state, self::P2, self::FROST, 'close', self::P1);

        // Дубликат по имени сразу уходит в кладбище владельца, погода остаётся
        $this->assertTrue($state['weather']['close']);
        $this->assertCount(1, $state['weather_cards']);
        $this->assertContains(self::FROST, $state['players'][self::P2]['grave']);
    }

    #[Test]
    public function clear_weather_moves_weather_cards_to_owner_graves(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['hand'] = [self::FROST];
        $state['players'][self::P2]['hand'] = [self::CLEAR];

        $state = GwentEngine::playCard($state, self::P1, self::FROST, 'close', self::P2);
        $state = GwentEngine::playCard($state, self::P2, self::CLEAR, 'close', self::P1);

        $this->assertFalse($state['weather']['close']);
        $this->assertSame([], $state['weather_cards']);
        $this->assertContains(self::FROST, $state['players'][self::P1]['grave']);
        $this->assertContains(self::CLEAR, $state['players'][self::P2]['grave']);
    }

    #[Test]
    public function horn_and_weather_cards_go_to_graves_at_round_end(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['hand'] = [self::HORN, self::FOG];

        $state = GwentEngine::playCard($state, self::P1, self::HORN, 'close', self::P2);
        $state = GwentEngine::playCard($state, self::P1, self::FOG, 'ranged', self::P2);

        $this->assertSame(self::HORN, $state['special_cards'][self::P1 . '_close'] ?? null);
        $this->assertCount(1, $state['weather_cards']);

        $state = GwentEngine::endRound($state, [self::P1, self::P2]);

        $this->assertContains(self::HORN, $state['players'][self::P1]['grave']);
        $this->assertContains(self::FOG, $state['players'][self::P1]['grave']);
        $this->assertSame([], $state['special_cards']);
        $this->assertSame([], $state['weather_cards']);
        $this->assertFalse($state['weather']['ranged']);
    }

    #[Test]
    public function second_special_on_same_row_is_rejected(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['hand'] = [self::HORN, self::MARDROEME];

        $state = GwentEngine::playCard($state, self::P1, self::HORN, 'close', self::P2);

        $this->expectException(\InvalidArgumentException::class);
        GwentEngine::playCard($state, self::P1, self::MARDROEME, 'close', self::P2);
    }

    #[Test]
    public function ermion_places_on_row_and_applies_mardroeme_without_slot(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['hand'] = [self::ERMION];
        $state['players'][self::P1]['board']['ranged'] = [self::YOUNG_BERSERKER];

        $state = GwentEngine::playCard($state, self::P1, self::ERMION, 'ranged', self::P2);

        $this->assertContains(self::ERMION, $state['players'][self::P1]['board']['ranged']);
        $this->assertContains(self::TRANSFORMED_YOUNG, $state['players'][self::P1]['board']['ranged']);
        $this->assertTrue($state['mardroeme_rows'][self::P1 . '_ranged']);
        // Слот спецкарты свободен - Ermion юнит, не спецкарта
        $this->assertArrayNotHasKey(self::P1 . '_ranged', $state['special_cards'] ?? []);
    }

    #[Test]
    public function leader_horn_skips_when_special_slot_occupied(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['hand'] = [self::HORN];
        $state = GwentEngine::playCard($state, self::P1, self::HORN, 'siege', self::P2);

        // foltest_siegemaster: leaderHorn siege
        $state['players'][self::P1]['leader_index'] = $this->leaderIndexByAbility('foltest_siegemaster');
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);

        // Слот занят реальным рогом - виртуальный рог лидера молча пропущен (канон)
        $this->assertFalse($state['leader_horns'][self::P1 . '_siege'] ?? false);
        $this->assertTrue($state['players'][self::P1]['leader_used']);
    }

    private function leaderIndexByAbility(string $ability): int
    {
        foreach (\App\Services\GwentCardData::all() as $i => $card) {
            if (($card['row'] ?? null) === 'leader' && in_array($ability, $card['abilities'], true)) {
                return $i;
            }
        }

        $this->fail('Лидер с способностью ' . $ability . ' не найден.');
    }

    private function baseState(): array
    {
        $emptyPlayer = [
            'deck' => [],
            'hand' => [],
            'board' => ['close' => [], 'ranged' => [], 'siege' => []],
            'grave' => [],
            'health' => 2,
            'passed' => false,
            'leader_used' => false,
            'leader_disabled' => false,
            'faction' => 'realms',
            'leader_index' => 0,
        ];

        return [
            'players' => [
                self::P1 => $emptyPlayer,
                self::P2 => $emptyPlayer,
            ],
            'weather' => ['close' => false, 'ranged' => false, 'siege' => false],
            'weather_cards' => [],
            'special_cards' => [],
            'horns' => [],
            'leader_horns' => [],
            'mardroeme_rows' => [],
            'half_weather_rows' => [],
            'pending_medic' => null,
            'round' => 1,
        ];
    }
}
