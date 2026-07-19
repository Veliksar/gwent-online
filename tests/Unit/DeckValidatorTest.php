<?php

namespace Tests\Unit;

use App\Services\DeckValidator;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class DeckValidatorTest extends TestCase
{
    /** Валидная колода realms: 22+ юнитов, лидер Foltest (24) */
    private function validRealmsDeck(): array
    {
        // 16 = Blue Stripes Commando (count 3), 30/28/19 (count 3), плюс одиночные юниты
        return [
            [30, 3], [28, 3], [19, 3], [29, 2], [1, 3], // decoy - спец
            [33, 1], [34, 1], [39, 1], [51, 1], [12, 1], [14, 1], [15, 1],
            [27, 1], [17, 1], [45, 1], [54, 1], [55, 1], [32, 1], [41, 1],
            [47, 1], [6, 1], [18, 1], [49, 1], [0, 1],
        ];
    }

    public function test_valid_deck_passes(): void
    {
        $result = DeckValidator::validate('realms', 24, $this->validRealmsDeck());

        $this->assertSame('realms', $result['faction']);
        $this->assertSame(24, $result['leader_id']);
        $this->assertNotEmpty($result['cards']);
    }

    public function test_rejects_unknown_faction(): void
    {
        $this->expectException(InvalidArgumentException::class);
        DeckValidator::validate('elves', 24, $this->validRealmsDeck());
    }

    public function test_rejects_leader_from_other_faction(): void
    {
        $this->expectException(InvalidArgumentException::class);
        // 59 = Emhyr (nilfgaard) для колоды realms
        DeckValidator::validate('realms', 59, $this->validRealmsDeck());
    }

    public function test_rejects_non_leader_card_as_leader(): void
    {
        $this->expectException(InvalidArgumentException::class);
        DeckValidator::validate('realms', 30, $this->validRealmsDeck());
    }

    public function test_rejects_too_few_units(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/юнитов/u');
        DeckValidator::validate('realms', 24, [[30, 3], [28, 3]]);
    }

    public function test_rejects_too_many_copies(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/копий/u');
        $deck = $this->validRealmsDeck();
        $deck[] = [33, 5]; // одиночная карта x5
        DeckValidator::validate('realms', 24, $deck);
    }

    public function test_rejects_foreign_faction_card(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $deck = $this->validRealmsDeck();
        $deck[] = [63, 1]; // карта Нильфгаарда в колоде realms
        DeckValidator::validate('realms', 24, $deck);
    }

    public function test_rejects_too_many_specials(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/специальных/u');
        $deck = $this->validRealmsDeck();
        // decoy уже 3; добавляем спецкарты сверх лимита 10: 3+3+3+2 = 11
        $deck[] = [5, 3];  // Commander's Horn
        $deck[] = [2, 3];  // Biting Frost
        $deck[] = [11, 2]; // Torrential Rain
        DeckValidator::validate('realms', 24, $deck);
    }

    public function test_merges_duplicate_entries(): void
    {
        $deck = $this->validRealmsDeck();
        // 30 уже [30,3]; дубль сверх лимита копий должен отклоняться
        $deck[] = [30, 1];
        $this->expectException(InvalidArgumentException::class);
        DeckValidator::validate('realms', 24, $deck);
    }

    public function test_rejects_leader_card_in_deck(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $deck = $this->validRealmsDeck();
        $deck[] = [22, 1]; // лидер в списке карт
        DeckValidator::validate('realms', 24, $deck);
    }
}
