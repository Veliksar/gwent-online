<?php

namespace Tests\Unit;

use App\Services\GwentCardData;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class GwentCardDataCanonTest extends TestCase
{
    #[Test]
    public function all_card_indices_match_public_cards_js(): void
    {
        $canon = $this->loadCanonCards();
        $phpCards = GwentCardData::all();

        $this->assertCount(
            count($canon),
            $phpCards,
            'GwentCardData must contain the same number of cards as card_dict'
        );

        foreach ($canon as $index => $canonCard) {
            $this->assertArrayHasKey($index, $phpCards, "Missing card index {$index} in GwentCardData");

            $phpCard = $phpCards[$index];
            $canonAbilities = $this->parseAbilities($canonCard['ability'] ?? '');

            $this->assertSame($canonCard['name'], $phpCard['name'], "name mismatch at index {$index}");
            $this->assertSame($canonCard['id'] ?? '', $phpCard['id'], "id mismatch at index {$index}");
            $this->assertSame($canonCard['deck'], $phpCard['deck'], "deck mismatch at index {$index}");
            $this->assertSame($canonCard['row'] ?? '', $phpCard['row'], "row mismatch at index {$index}");
            $this->assertSame(
                $this->parseStrength($canonCard['strength'] ?? ''),
                $phpCard['strength'],
                "strength mismatch at index {$index}"
            );
            $this->assertSame($canonCard['filename'], $phpCard['filename'], "filename mismatch at index {$index}");
            $this->assertSame((int) ($canonCard['count'] ?? 0), $phpCard['count'], "count mismatch at index {$index}");
            $this->assertSame($canonAbilities, $phpCard['abilities'], "abilities mismatch at index {$index}");
        }
    }

    #[Test]
    public function skellige_cards_are_present_in_canon_order(): void
    {
        $phpCards = GwentCardData::all();

        $this->assertSame('skellige', $phpCards[181]['deck']);
        $this->assertSame('Crach an Craite', $phpCards[211]['name']);
        $this->assertSame(['rain', 'fog'], $phpCards[204]['abilities']);
        $this->assertSame(['eredin_bringer_of_death'], $phpCards[94]['abilities']);
    }

    private function loadCanonCards(): array
    {
        $path = base_path('public/cards.js');
        $source = file_get_contents($path);

        if ($source === false) {
            throw new RuntimeException('Unable to read public/cards.js');
        }

        $json = $this->extractJsonFromCardsJs($source);

        return json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    }

    private function extractJsonFromCardsJs(string $source): string
    {
        $marker = 'JSON.parse(';
        $start = strpos($source, $marker);
        if ($start === false) {
            throw new RuntimeException('Unable to parse card_dict from public/cards.js');
        }

        $quoteStart = strpos($source, "'", $start);
        if ($quoteStart === false) {
            throw new RuntimeException('Unable to parse card_dict from public/cards.js');
        }

        $length = strlen($source);
        $escaped = false;
        for ($i = $quoteStart + 1; $i < $length; $i++) {
            $char = $source[$i];
            if ($escaped) {
                $escaped = false;
                continue;
            }
            if ($char === '\\') {
                $escaped = true;
                continue;
            }
            if ($char === "'") {
                return stripcslashes(substr($source, $quoteStart + 1, $i - $quoteStart - 1));
            }
        }

        throw new RuntimeException('Unable to parse card_dict from public/cards.js');
    }

    private function parseAbilities(string $ability): array
    {
        $ability = trim($ability);

        if ($ability === '') {
            return [];
        }

        return preg_split('/\s+/', $ability) ?: [];
    }

    private function parseStrength(string $strength): int
    {
        if ($strength === '') {
            return 0;
        }

        return (int) $strength;
    }
}
