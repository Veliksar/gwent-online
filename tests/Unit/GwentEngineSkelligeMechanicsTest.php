<?php

namespace Tests\Unit;

use App\Services\GwentEngine;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GwentEngineSkelligeMechanicsTest extends TestCase
{
    private const P1 = 1;
    private const P2 = 2;

    #[Test]
    public function mardroeme_transforms_berserkers_already_on_row(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['board']['close'] = [181];
        $state['players'][self::P1]['hand'] = [202];

        $state = GwentEngine::playCard($state, self::P1, 202, 'close', self::P2);

        $this->assertTrue($state['mardroeme_rows'][self::P1 . '_close']);
        $this->assertNotContains(181, $state['players'][self::P1]['board']['close']);
        $this->assertContains(206, $state['players'][self::P1]['board']['close']);
    }

    #[Test]
    public function berserker_played_onto_mardroeme_row_transforms_immediately(): void
    {
        $state = $this->baseState();
        $state['mardroeme_rows'][self::P1 . '_ranged'] = true;
        $state['players'][self::P1]['hand'] = [210];

        $state = GwentEngine::playCard($state, self::P1, 210, 'ranged', self::P2);

        $this->assertNotContains(210, $state['players'][self::P1]['board']['ranged']);
        $this->assertContains(207, $state['players'][self::P1]['board']['ranged']);
        $this->assertSame(8, GwentEngine::calculateCardPower($state, self::P1, 'ranged', 207));
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
            'faction' => 'skellige',
            'leader_index' => 212,
        ];

        $state = [
            'players' => [
                self::P1 => $emptyPlayer,
                self::P2 => $emptyPlayer,
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
}
