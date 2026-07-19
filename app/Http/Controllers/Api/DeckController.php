<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserDeck;
use App\Services\DeckValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeckController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $decks = UserDeck::where('user_id', $request->user()->id)
            ->orderBy('faction')
            ->get()
            ->map(fn(UserDeck $deck) => $this->formatDeck($deck));

        return response()->json(['decks' => $decks]);
    }

    public function save(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'faction' => 'required|string|in:' . implode(',', DeckValidator::FACTIONS),
            'leader_id' => 'required|integer',
            'cards' => 'required|array|min:1',
            'cards.*' => 'array|size:2',
        ]);

        try {
            $normalized = DeckValidator::validate(
                $validated['faction'],
                (int) $validated['leader_id'],
                $validated['cards']
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $userId = $request->user()->id;

        $deck = DB::transaction(function () use ($userId, $normalized) {
            UserDeck::where('user_id', $userId)->update(['is_active' => false]);

            return UserDeck::updateOrCreate(
                ['user_id' => $userId, 'faction' => $normalized['faction']],
                [
                    'leader_id' => $normalized['leader_id'],
                    'cards' => $normalized['cards'],
                    'is_active' => true,
                ]
            );
        });

        return response()->json([
            'message' => 'Колода сохранена.',
            'deck' => $this->formatDeck($deck),
        ]);
    }

    private function formatDeck(UserDeck $deck): array
    {
        return [
            'faction' => $deck->faction,
            'leader_id' => $deck->leader_id,
            'cards' => $deck->cards,
            'is_active' => $deck->is_active,
            'updated_at' => $deck->updated_at,
        ];
    }
}
