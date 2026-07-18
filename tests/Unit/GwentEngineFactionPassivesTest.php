<?php

namespace Tests\Unit;

use App\Services\GwentEngine;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GwentEngineFactionPassivesTest extends TestCase
{
    private const P1 = 1;
    private const P2 = 2;

    #[Test]
    public function nilfgaard_wins_round_draw_when_only_one_player_is_nilfgaard(): void
    {
        $state = $this->baseState('nilfgaard', 'realms');
        $state['players'][self::P1]['board']['close'] = [16];
        $state['players'][self::P2]['board']['close'] = [16];

        $state = GwentEngine::endRound($state, [self::P1, self::P2]);

        $this->assertSame(self::P1, $state['last_round_winner_id']);
        $this->assertSame(2, $state['players'][self::P1]['health']);
        $this->assertSame(1, $state['players'][self::P2]['health']);
    }

    #[Test]
    public function northern_realms_draws_after_winning_round(): void
    {
        $state = $this->baseState('realms', 'monsters');
        $state['players'][self::P1]['board']['close'] = [13];
        $state['players'][self::P2]['board']['close'] = [16];
        $state['players'][self::P1]['deck'] = [31];

        $state = GwentEngine::endRound($state, [self::P1, self::P2]);

        $this->assertContains(31, $state['players'][self::P1]['hand']);
        $this->assertEmpty($state['players'][self::P1]['deck']);
    }

    #[Test]
    public function monsters_keep_one_unit_between_rounds(): void
    {
        $state = $this->baseState('monsters', 'realms');
        $state['players'][self::P1]['board']['close'] = [16, 31];
        $state['players'][self::P2]['board']['close'] = [48];

        $state = GwentEngine::endRound($state, [self::P1, self::P2]);

        $remaining = array_merge(
            $state['players'][self::P1]['board']['close'],
            $state['players'][self::P1]['board']['ranged'],
            $state['players'][self::P1]['board']['siege']
        );

        $this->assertCount(1, $remaining);
        $this->assertCount(1, $state['players'][self::P1]['grave']);
    }

    #[Test]
    public function scoiatael_can_choose_first_player_before_first_action(): void
    {
        $state = GwentEngine::initGame([self::P1, self::P2], [
            self::P1 => $this->deck('scoiatael', 139),
            self::P2 => $this->deck('realms', 22),
        ], ['first_player_id' => self::P2]);

        $this->assertSame(self::P1, $state['scoiatael_first_choice_user_id']);

        $state = GwentEngine::chooseFirstPlayer($state, self::P1, true, [self::P1, self::P2]);

        $this->assertSame(self::P1, GwentEngine::startingPlayerForCurrentRound($state, [self::P1, self::P2]));
        $this->assertNull($state['scoiatael_first_choice_user_id']);
    }

    #[Test]
    public function skellige_restores_two_units_from_grave_at_round_three_start(): void
    {
        $state = $this->baseState('skellige', 'realms');
        $state['round'] = 2;
        $state['players'][self::P1]['grave'] = [16, 31, 8];
        $state['players'][self::P1]['board']['close'] = [8];
        $state['players'][self::P2]['board']['close'] = [16];

        $state = GwentEngine::endRound($state, [self::P1, self::P2]);

        $restored = array_merge(
            $state['players'][self::P1]['board']['close'],
            $state['players'][self::P1]['board']['ranged'],
            $state['players'][self::P1]['board']['siege']
        );

        $this->assertSame(3, $state['round']);
        $this->assertCount(2, array_intersect([16, 31], $restored));
    }

    #[Test]
    public function next_round_starter_alternates_from_first_player(): void
    {
        $state = $this->baseState('realms', 'realms');
        $state['first_player_id'] = self::P1;
        $state['players'][self::P1]['board']['close'] = [13];
        $state['players'][self::P2]['board']['close'] = [16];

        $state = GwentEngine::endRound($state, [self::P1, self::P2]);

        $this->assertSame(self::P2, GwentEngine::startingPlayerForCurrentRound($state, [self::P1, self::P2]));
    }

    private function baseState(string $p1Faction, string $p2Faction): array
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
            'leader_index' => 22,
        ];

        $state = [
            'players' => [
                self::P1 => array_merge($emptyPlayer, ['faction' => $p1Faction]),
                self::P2 => array_merge($emptyPlayer, ['faction' => $p2Faction]),
            ],
            'weather' => ['close' => false, 'ranged' => false, 'siege' => false],
            'horns' => [],
            'leader_horns' => [],
            'mardroeme_rows' => [],
            'half_weather_rows' => [],
            'pending_medic' => null,
            'leader_result' => null,
            'random_respawn' => false,
            'double_spy_power' => false,
            'round' => 1,
            'turn_number' => 0,
            'first_player_id' => self::P1,
        ];

        foreach ([self::P1, self::P2] as $uid) {
            foreach (['close', 'ranged', 'siege'] as $row) {
                $state['horns'][$uid . '_' . $row] = false;
                $state['leader_horns'][$uid . '_' . $row] = false;
                $state['mardroeme_rows'][$uid . '_' . $row] = false;
            }
        }

        return $state;
    }

    private function deck(string $faction, int $leader): array
    {
        return [
            'deck_faction' => $faction,
            'deck_leader_id' => $leader,
            'deck_cards' => [[16, 20], [31, 20], [48, 20], [55, 20]],
        ];
    }
}
