<?php

namespace Tests\Unit;

use App\Services\GwentEngine;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GwentEngineMechanicsTest extends TestCase
{
    private const P1 = 1;
    private const P2 = 2;

    private const DECOY = 1;
    private const HORN = 5;
    private const DANDELION = 6;
    private const EMIEL = 7;
    private const SCORCH = 10;
    private const VESEMIR = 13;
    private const VILLEN = 14;
    private const ZOLTAN = 16;
    private const COW = 20;
    private const BDF = 21;
    private const YOUNG_EMISSARY_1 = 90;
    private const YOUNG_EMISSARY_2 = 91;
    private const HEMDALL = 196;
    private const KAMBI = 199;
    private const STORM = 204;
    private const GAUNTER = 18;
    private const GAUNTER_DARKNESS = 19;

    #[Test]
    public function gaunter_muster_plays_all_copies_from_hand_and_deck(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['hand'] = [self::GAUNTER_DARKNESS, self::GAUNTER_DARKNESS, self::GAUNTER];
        $state['players'][self::P1]['deck'] = [self::GAUNTER_DARKNESS];

        $state = GwentEngine::playCard($state, self::P1, self::GAUNTER_DARKNESS, 'ranged', self::P2);

        $this->assertSame([], $state['players'][self::P1]['hand']);
        $this->assertSame([], $state['players'][self::P1]['deck']);
        $this->assertSame(
            [self::GAUNTER_DARKNESS, self::GAUNTER_DARKNESS, self::GAUNTER_DARKNESS],
            $state['players'][self::P1]['board']['ranged']
        );
        $this->assertSame([self::GAUNTER], $state['players'][self::P1]['board']['siege']);
    }

    #[Test]
    public function global_scorch_kills_by_current_power_not_base(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['board']['close'] = [self::YOUNG_EMISSARY_1, self::YOUNG_EMISSARY_2];
        $state['players'][self::P2]['board']['close'] = [self::VESEMIR];
        $state['players'][self::P1]['hand'] = [self::SCORCH];

        $state = GwentEngine::playCard($state, self::P1, self::SCORCH, 'close', self::P2);

        $this->assertNotContains(self::YOUNG_EMISSARY_1, $state['players'][self::P1]['board']['close']);
        $this->assertNotContains(self::YOUNG_EMISSARY_2, $state['players'][self::P1]['board']['close']);
        $this->assertContains(self::VESEMIR, $state['players'][self::P2]['board']['close']);
        $this->assertContains(self::SCORCH, $state['players'][self::P1]['grave']);
    }

    #[Test]
    public function global_scorch_card_goes_to_grave(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['board']['close'] = [self::VESEMIR];
        $state['players'][self::P1]['hand'] = [self::SCORCH];

        $state = GwentEngine::playCard($state, self::P1, self::SCORCH, 'close', self::P2);

        $this->assertContains(self::SCORCH, $state['players'][self::P1]['grave']);
        $this->assertNotContains(self::SCORCH, $state['players'][self::P1]['hand']);
    }

    #[Test]
    public function global_scorch_respects_weather_and_horn_for_target_selection(): void
    {
        $state = $this->baseState();
        $state['weather']['close'] = true;
        $state['horns'][self::P1 . '_close'] = true;
        $state['players'][self::P1]['board']['close'] = [self::ZOLTAN];
        $state['players'][self::P2]['board']['close'] = [self::EMIEL];
        $state['players'][self::P1]['hand'] = [self::SCORCH];

        $this->assertSame(2, GwentEngine::calculateCardPower($state, self::P1, 'close', self::ZOLTAN));
        $this->assertSame(1, GwentEngine::calculateCardPower($state, self::P2, 'close', self::EMIEL));

        $state = GwentEngine::playCard($state, self::P1, self::SCORCH, 'close', self::P2);

        $this->assertContains(self::ZOLTAN, $state['players'][self::P1]['grave']);
        $this->assertContains(self::EMIEL, $state['players'][self::P2]['board']['close']);
    }

    #[Test]
    public function row_scorch_only_affects_opponent_row_when_total_at_least_ten(): void
    {
        $state = $this->baseState();
        $state['players'][self::P2]['board']['close'] = [self::VESEMIR, self::ZOLTAN];
        $state['players'][self::P1]['board']['close'] = [self::EMIEL];
        $state['players'][self::P1]['hand'] = [self::VILLEN];

        $this->assertSame(11, GwentEngine::calculateRowScore($state, self::P2, 'close'));

        $state = GwentEngine::playCard($state, self::P1, self::VILLEN, 'close', self::P2);

        $this->assertNotContains(self::VESEMIR, $state['players'][self::P2]['board']['close']);
        $this->assertContains(self::ZOLTAN, $state['players'][self::P2]['board']['close']);
        $this->assertContains(self::EMIEL, $state['players'][self::P1]['board']['close']);
        $this->assertContains(self::VILLEN, $state['players'][self::P1]['board']['close']);
    }

    #[Test]
    public function row_scorch_does_nothing_when_opponent_row_total_below_ten(): void
    {
        $state = $this->baseState();
        $state['players'][self::P2]['board']['close'] = [self::ZOLTAN];
        $state['players'][self::P1]['hand'] = [self::VILLEN];

        $this->assertSame(5, GwentEngine::calculateRowScore($state, self::P2, 'close'));

        $state = GwentEngine::playCard($state, self::P1, self::VILLEN, 'close', self::P2);

        $this->assertContains(self::ZOLTAN, $state['players'][self::P2]['board']['close']);
    }

    #[Test]
    public function storm_applies_fog_on_ranged_and_rain_on_siege(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['hand'] = [self::STORM];

        $state = GwentEngine::playCard($state, self::P1, self::STORM, 'close', self::P2);

        $this->assertFalse($state['weather']['close']);
        $this->assertTrue($state['weather']['ranged']);
        $this->assertTrue($state['weather']['siege']);
    }

    #[Test]
    public function avenger_summons_bdf_when_cow_is_scorched(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['board']['close'] = [self::COW];
        $state['players'][self::P1]['hand'] = [self::SCORCH];

        $state = GwentEngine::playCard($state, self::P1, self::SCORCH, 'close', self::P2);

        $this->assertContains(self::COW, $state['players'][self::P1]['grave']);
        $this->assertContains(self::BDF, $state['players'][self::P1]['board']['close']);
    }

    #[Test]
    public function avenger_kambi_summons_hemdall_when_removed_via_decoy(): void
    {
        $state = $this->baseState();
        $state['players'][self::P2]['board']['close'] = [self::KAMBI];
        $state['players'][self::P2]['hand'] = [self::DECOY];

        $state = GwentEngine::playCard($state, self::P2, self::DECOY, 'close', self::P1, self::KAMBI);

        $this->assertContains(self::KAMBI, $state['players'][self::P2]['hand']);
        $this->assertContains(self::HEMDALL, $state['players'][self::P2]['board']['close']);
    }

    #[Test]
    public function decoy_returns_target_to_hand_and_places_decoy_on_row(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['board']['close'] = [self::VESEMIR];
        $state['players'][self::P1]['hand'] = [self::DECOY];

        $state = GwentEngine::playCard($state, self::P1, self::DECOY, 'close', self::P2, self::VESEMIR);

        $this->assertContains(self::VESEMIR, $state['players'][self::P1]['hand']);
        $this->assertContains(self::DECOY, $state['players'][self::P1]['board']['close']);
        $this->assertSame(0, GwentEngine::calculateCardPower($state, self::P1, 'close', self::DECOY));
    }

    #[Test]
    public function unit_horn_does_not_double_itself_but_doubles_other_units(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['board']['close'] = [self::DANDELION];

        $this->assertSame(2, GwentEngine::calculateCardPower($state, self::P1, 'close', self::DANDELION));

        $state['horns'][self::P1 . '_close'] = true;
        $state['players'][self::P1]['board']['close'] = [self::DANDELION, self::ZOLTAN];

        $this->assertSame(4, GwentEngine::calculateCardPower($state, self::P1, 'close', self::DANDELION));
        $this->assertSame(10, GwentEngine::calculateCardPower($state, self::P1, 'close', self::ZOLTAN));
    }

    #[Test]
    public function king_bran_half_weather_halves_power_and_horn_still_doubles(): void
    {
        $state = $this->baseState();
        $state['weather']['close'] = true;
        $state['half_weather_rows'][self::P1 . '_close'] = true;
        $state['players'][self::P1]['board']['close'] = [self::EMIEL];

        $this->assertSame(2, GwentEngine::calculateCardPower($state, self::P1, 'close', self::EMIEL));

        $state['horns'][self::P1 . '_close'] = true;

        $this->assertSame(4, GwentEngine::calculateCardPower($state, self::P1, 'close', self::EMIEL));
    }

    #[Test]
    public function half_weather_without_flag_caps_to_one_like_normal_weather(): void
    {
        $state = $this->baseState();
        $state['weather']['close'] = true;
        $state['players'][self::P1]['board']['close'] = [self::EMIEL];

        $this->assertSame(1, GwentEngine::calculateCardPower($state, self::P1, 'close', self::EMIEL));
    }

    #[Test]
    public function playing_commanders_horn_sets_row_horn_flag(): void
    {
        $state = $this->baseState();
        $state['players'][self::P1]['hand'] = [self::HORN];
        $state['players'][self::P1]['board']['close'] = [self::ZOLTAN];

        $state = GwentEngine::playCard($state, self::P1, self::HORN, 'close', self::P2);

        $this->assertTrue($state['horns'][self::P1 . '_close']);
        $this->assertSame(10, GwentEngine::calculateCardPower($state, self::P1, 'close', self::ZOLTAN));
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
            'faction' => 'realms',
            'leader_index' => 0,
        ];

        return [
            'players' => [
                self::P1 => $emptyPlayer,
                self::P2 => $emptyPlayer,
            ],
            'weather' => ['close' => false, 'ranged' => false, 'siege' => false],
            'horns' => [],
            'half_weather_rows' => [],
            'pending_medic' => null,
            'round' => 1,
        ];
    }
}
