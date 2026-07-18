<?php

namespace App\Services;

use App\Models\GameMatch;
use App\Models\MatchPlayer;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeveloperSandboxService
{
    public function __construct(
        private SandboxBotUserService $botUsers,
        private SandboxBotRunner $botRunner,
    ) {}

    public function defaultBotDeck(): array
    {
        return [
            'deck_faction' => 'nilfgaard',
            'deck_leader_id' => 59,
            'deck_cards' => [
                [5, 1], [1, 3], [10, 1], [2, 1], [4, 1], [9, 1], [11, 1], [3, 1], [8, 1],
                [63, 1], [64, 1], [70, 1], [73, 1], [75, 1], [84, 1], [81, 1], [14, 1], [15, 1],
                [17, 1], [90, 1], [91, 1], [19, 3], [88, 1], [71, 4], [6, 1], [18, 1], [67, 1],
                [68, 1], [0, 1], [83, 1],
            ],
        ];
    }

    public function start(User $human, array $humanDeck, ?array $botDeck = null): GameMatch
    {
        $bot = $this->botUsers->resolveBotUser();
        $botDeck = $botDeck ?? $this->defaultBotDeck();

        $this->cancelActiveSandboxMatches($human->id);

        $match = DB::transaction(function () use ($human, $bot, $humanDeck, $botDeck) {
            $playerIds = [$human->id, $bot->id];
            $decks = [
                $human->id => $humanDeck,
                $bot->id => $botDeck,
            ];

            $stateSnapshot = GwentEngine::initGame($playerIds, $decks, [
                'chooser_user_id' => $human->id,
                'prefer_first' => true,
            ]);

            $firstPlayerId = GwentEngine::startingPlayerForCurrentRound($stateSnapshot, $playerIds);

            $match = GameMatch::create([
                'lobby_room_id' => null,
                'mode' => GameMatch::MODE_SANDBOX,
                'status' => GameMatch::STATUS_IN_PROGRESS,
                'current_round' => 1,
                'current_player_id' => $firstPlayerId,
                'state_snapshot' => $stateSnapshot,
                'started_at' => now(),
                'turn_started_at' => now(),
            ]);

            foreach ([$human, $bot] as $user) {
                $deck = $decks[$user->id];
                MatchPlayer::create([
                    'match_id' => $match->id,
                    'user_id' => $user->id,
                    'deck_faction' => $deck['deck_faction'],
                    'deck_leader_id' => $deck['deck_leader_id'],
                    'deck_cards' => $deck['deck_cards'],
                    'health' => 2,
                    'passed' => false,
                    'round_score' => 0,
                ]);
            }

            return $match->fresh(['players.user.profile']);
        });

        return $this->botRunner->advanceIfNeeded($match);
    }

    public function cancelActiveSandboxMatches(int $humanUserId): void
    {
        GameMatch::query()
            ->where('mode', GameMatch::MODE_SANDBOX)
            ->where('status', GameMatch::STATUS_IN_PROGRESS)
            ->whereHas('players', fn($q) => $q->where('user_id', $humanUserId))
            ->update([
                'status' => GameMatch::STATUS_CANCELLED,
                'ended_at' => now(),
            ]);
    }
}
