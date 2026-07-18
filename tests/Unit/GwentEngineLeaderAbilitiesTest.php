<?php

namespace Tests\Unit;

use App\Services\GwentEngine;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GwentEngineLeaderAbilitiesTest extends TestCase
{
    private const P1 = 1;
    private const P2 = 2;

    #[Test]
    public function foltest_leaders_apply_their_effects(): void
    {
        $state = $this->stateWithLeader(22);
        $state['players'][self::P1]['deck'] = [9];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertTrue($state['weather']['ranged']);
        $this->assertNotContains(9, $state['players'][self::P1]['deck']);

        $state = $this->stateWithLeader(23);
        $state['weather'] = ['close' => true, 'ranged' => true, 'siege' => true];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertSame(['close' => false, 'ranged' => false, 'siege' => false], $state['weather']);

        $state = $this->stateWithLeader(24);
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertTrue($state['leader_horns'][self::P1 . '_siege']);

        $state = $this->stateWithLeader(25);
        $state['players'][self::P2]['board']['siege'] = [27, 55];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertContains(27, $state['players'][self::P2]['grave']);

        $state = $this->stateWithLeader(26);
        $state['players'][self::P2]['board']['ranged'] = [31, 48];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertContains(31, $state['players'][self::P2]['grave']);
    }

    #[Test]
    public function emhyr_leaders_apply_their_effects(): void
    {
        $state = $this->stateWithLeader(56);
        $state['players'][self::P1]['deck'] = [11];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertTrue($state['weather']['siege']);

        $state = $this->stateWithLeader(57);
        $state['players'][self::P2]['hand'] = [16, 31, 48, 55];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertSame('reveal_hand', $state['leader_result']['type']);
        $this->assertCount(3, $state['leader_result']['cards']);

        $state = GwentEngine::initGame([self::P1, self::P2], [
            self::P1 => $this->deck('nilfgaard', 58),
            self::P2 => $this->deck('realms', 22),
        ], ['first_player_id' => self::P1]);
        $this->assertTrue($state['players'][self::P1]['leader_disabled']);
        $this->assertTrue($state['players'][self::P2]['leader_disabled']);

        $state = $this->stateWithLeader(59);
        $state['players'][self::P2]['grave'] = [16];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertContains(16, $state['players'][self::P1]['hand']);
        $this->assertEmpty($state['players'][self::P2]['grave']);

        $state = GwentEngine::initGame([self::P1, self::P2], [
            self::P1 => $this->deck('nilfgaard', 60),
            self::P2 => $this->deck('realms', 22),
        ], ['first_player_id' => self::P1]);
        $this->assertTrue($state['random_respawn']);
    }

    #[Test]
    public function eredin_leaders_apply_their_effects(): void
    {
        $state = $this->stateWithLeader(93);
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertTrue($state['leader_horns'][self::P1 . '_close']);

        $state = $this->stateWithLeader(94);
        $state['players'][self::P1]['grave'] = [16];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertContains(16, $state['players'][self::P1]['hand']);

        $state = $this->stateWithLeader(95);
        $state['players'][self::P1]['hand'] = [16, 31, 48];
        $state['players'][self::P1]['deck'] = [55, 27];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2, [
            'discard_indices' => [16, 31],
            'draw_index' => 27,
        ]);
        $this->assertContains(16, $state['players'][self::P1]['grave']);
        $this->assertContains(31, $state['players'][self::P1]['grave']);
        $this->assertContains(27, $state['players'][self::P1]['hand']);

        $state = $this->stateWithLeader(96);
        $state['players'][self::P1]['deck'] = [2, 9, 11];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2, ['choice_index' => 2]);
        $this->assertTrue($state['weather']['close']);

        $state = GwentEngine::initGame([self::P1, self::P2], [
            self::P1 => $this->deck('monsters', 97),
            self::P2 => $this->deck('realms', 22),
        ], ['first_player_id' => self::P1]);
        $state['players'][self::P2]['board']['close'] = [41];
        $this->assertSame(10, GwentEngine::calculateCardPower($state, self::P2, 'close', 41));
    }

    #[Test]
    public function francesca_leaders_apply_their_effects(): void
    {
        $state = $this->stateWithLeader(139);
        $state['players'][self::P2]['board']['close'] = [13, 16];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertContains(13, $state['players'][self::P2]['grave']);

        $state = $this->stateWithLeader(140);
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertTrue($state['leader_horns'][self::P1 . '_ranged']);

        $state = GwentEngine::initGame([self::P1, self::P2], [
            self::P1 => $this->deck('scoiatael', 141),
            self::P2 => $this->deck('realms', 22),
        ], ['first_player_id' => self::P1]);
        $this->assertCount(11, $state['players'][self::P1]['hand']);

        $state = $this->stateWithLeader(142);
        $state['players'][self::P1]['deck'] = [2];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertTrue($state['weather']['close']);

        $state = $this->stateWithLeader(143);
        $state['weather']['close'] = true;
        $state['players'][self::P1]['board']['close'] = [144];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertNotContains(144, $state['players'][self::P1]['board']['close']);
        $this->assertContains(144, $state['players'][self::P1]['board']['ranged']);
    }

    #[Test]
    public function skellige_leaders_apply_their_effects(): void
    {
        $state = $this->stateWithLeader(211);
        $state['players'][self::P1]['grave'] = [16];
        $state['players'][self::P2]['grave'] = [31];
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);
        $this->assertEmpty($state['players'][self::P1]['grave']);
        $this->assertEmpty($state['players'][self::P2]['grave']);
        $this->assertContains(16, $state['players'][self::P1]['deck']);
        $this->assertContains(31, $state['players'][self::P2]['deck']);

        $state = GwentEngine::initGame([self::P1, self::P2], [
            self::P1 => $this->deck('skellige', 212),
            self::P2 => $this->deck('realms', 22),
        ], ['first_player_id' => self::P1]);
        $this->assertTrue($state['half_weather_rows'][self::P1 . '_close']);
    }

    #[Test]
    public function leader_cannot_be_activated_twice(): void
    {
        $state = $this->stateWithLeader(23);
        $state = GwentEngine::activateLeader($state, self::P1, self::P2);

        $this->expectException(\InvalidArgumentException::class);
        GwentEngine::activateLeader($state, self::P1, self::P2);
    }

    private function stateWithLeader(int $leaderIndex): array
    {
        $state = $this->baseState();
        $state['players'][self::P1]['leader_index'] = $leaderIndex;

        return $state;
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
            'leader_index' => 22,
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

    private function deck(string $faction, int $leader): array
    {
        return [
            'deck_faction' => $faction,
            'deck_leader_id' => $leader,
            'deck_cards' => [[16, 20], [31, 20], [48, 20], [55, 20], [2, 3], [9, 3], [11, 2]],
        ];
    }
}
