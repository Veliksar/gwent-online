<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DeveloperSandboxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeveloperSandboxController extends Controller
{
    public function __construct(
        private DeveloperSandboxService $sandbox,
        private MatchController $matchController,
    ) {}

    public function status(): JsonResponse
    {
        return response()->json([
            'enabled' => (bool) config('gwent.developer_mode_enabled', false),
            'reveal_bot_hand' => (bool) config('gwent.sandbox_reveal_bot_hand', true),
        ]);
    }

    public function start(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'faction' => 'required|string|in:realms,nilfgaard,monsters,scoiatael,skellige',
            'leader_id' => 'required|integer|min:0',
            'cards' => 'required|array|min:1',
            'cards.*' => 'array|size:2',
            'cards.*.0' => 'integer|min:0',
            'cards.*.1' => 'integer|min:1',
            'bot_faction' => 'nullable|string|in:realms,nilfgaard,monsters,scoiatael,skellige',
            'bot_leader_id' => 'nullable|integer|min:0',
            'bot_cards' => 'nullable|array|min:1',
            'bot_cards.*' => 'array|size:2',
            'bot_cards.*.0' => 'integer|min:0',
            'bot_cards.*.1' => 'integer|min:1',
            'prefer_first' => 'nullable|boolean',
        ]);

        $user = $request->user();

        $humanDeck = [
            'deck_faction' => $validated['faction'],
            'deck_leader_id' => (int) $validated['leader_id'],
            'deck_cards' => array_map(
                fn(array $pair) => [(int) $pair[0], (int) $pair[1]],
                $validated['cards']
            ),
        ];

        $botDeck = null;
        if (!empty($validated['bot_faction']) && !empty($validated['bot_leader_id']) && !empty($validated['bot_cards'])) {
            $botDeck = [
                'deck_faction' => $validated['bot_faction'],
                'deck_leader_id' => (int) $validated['bot_leader_id'],
                'deck_cards' => array_map(
                    fn(array $pair) => [(int) $pair[0], (int) $pair[1]],
                    $validated['bot_cards']
                ),
            ];
        }

        $match = $this->sandbox->start($user, $humanDeck, $botDeck);

        return response()->json([
            'message' => 'Sandbox-матч создан.',
            'match' => $this->matchController->presentMatch($match, $user->id),
        ]);
    }

    public function leave(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->sandbox->cancelActiveSandboxMatches($user->id);

        return response()->json(['message' => 'Sandbox-сессия завершена.']);
    }
}
