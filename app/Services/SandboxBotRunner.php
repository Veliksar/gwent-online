<?php

namespace App\Services;

use App\Events\MatchCardPlayed;
use App\Events\MatchLeaderUsed;
use App\Events\MatchPassed;
use App\Models\GameMatch;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SandboxBotRunner
{
    private const MAX_STEPS = 12;

    public function __construct(
        private LegacyAiBridge $legacyAi,
        private SandboxBotUserService $botUsers,
        private MatchFlowService $matchFlow,
    ) {}

    public function botUserId(): int
    {
        return $this->botUsers->botUserId();
    }

    public function advanceIfNeeded(GameMatch $match): GameMatch
    {
        if (!$match->isSandbox() || $match->status !== GameMatch::STATUS_IN_PROGRESS) {
            return $match;
        }

        $botId = $this->botUserId();
        $steps = 0;

        while ($steps < self::MAX_STEPS) {
            $match = $match->fresh(['players.user.profile']);
            if ($match->status !== GameMatch::STATUS_IN_PROGRESS) {
                break;
            }

            if ((int) $match->current_player_id !== $botId) {
                break;
            }

            $state = $match->state_snapshot ?? [];
            if (($state['scoiatael_first_choice_user_id'] ?? null) === $botId) {
                break;
            }
            if (($state['pending_medic']['user_id'] ?? null) === $botId) {
                $match = $this->resolveBotMedic($match, $botId);
                $steps++;
                continue;
            }

            $humanId = $this->humanUserId($match, $botId);
            if (!$humanId) {
                break;
            }

            $decision = $this->legacyAi->decide($state, $botId, $humanId)
                ?? ['action' => 'pass'];

            $match = $this->applyDecision($match, $botId, $humanId, $decision);
            $steps++;
        }

        return $match->fresh(['players.user.profile']);
    }

    private function humanUserId(GameMatch $match, int $botId): ?int
    {
        $player = $match->players->firstWhere('user_id', '!=', $botId);
        return $player?->user_id;
    }

    private function applyDecision(GameMatch $match, int $botId, int $humanId, array $decision): GameMatch
    {
        return match ($decision['action'] ?? 'pass') {
            'play_card' => $this->applyPlayCard($match, $botId, $humanId, $decision),
            'use_leader' => $this->applyUseLeader($match, $botId, $humanId, $decision),
            'redraw_skip' => $this->applyRedrawSkip($match, $botId),
            default => $this->applyPass($match, $botId),
        };
    }

    private function applyPlayCard(GameMatch $match, int $botId, int $humanId, array $decision): GameMatch
    {
        $cardIndex = (int) ($decision['card_index'] ?? -1);
        $row = (string) ($decision['row'] ?? 'close');
        $targetIndex = isset($decision['target_index']) ? (int) $decision['target_index'] : null;

        try {
            $newState = GwentEngine::playCard(
                $match->state_snapshot,
                $botId,
                $cardIndex,
                $row,
                $humanId,
                $targetIndex
            );
        } catch (\InvalidArgumentException) {
            return $this->applyPass($match, $botId);
        }

        $scores = GwentEngine::calculateScores($newState);
        $botPlayer = $match->players->firstWhere('user_id', $botId);
        $humanPlayer = $match->players->firstWhere('user_id', $humanId);

        DB::transaction(function () use ($match, $newState, $scores, $botId, $humanId, $botPlayer, $humanPlayer) {
            $match->update(['state_snapshot' => $newState]);
            $botPlayer?->update(['round_score' => $scores[$botId] ?? 0]);
            $humanPlayer?->update(['round_score' => $scores[$humanId] ?? 0]);

            if (!isset($newState['pending_medic']) || $newState['pending_medic'] === null) {
                if (!$humanPlayer?->passed) {
                    $match->update(['current_player_id' => $humanId]);
                    $this->matchFlow->resetTurnTimer($match->fresh());
                }
            }
        });

        $match = $match->fresh(['players.user.profile']);
        $botUser = User::find($botId);
        if ($botUser) {
            broadcast(new MatchCardPlayed($match, $botUser, [
                'card_index' => $cardIndex,
                'row' => $row,
                'target_index' => $targetIndex,
            ]))->toOthers();
        }

        return $match;
    }

    private function applyUseLeader(GameMatch $match, int $botId, int $humanId, array $decision): GameMatch
    {
        try {
            $newState = GwentEngine::activateLeader(
                $match->state_snapshot,
                $botId,
                $humanId,
                $decision['choices'] ?? []
            );
        } catch (\InvalidArgumentException) {
            return $this->applyPass($match, $botId);
        }

        $scores = GwentEngine::calculateScores($newState);
        $botPlayer = $match->players->firstWhere('user_id', $botId);
        $humanPlayer = $match->players->firstWhere('user_id', $humanId);

        DB::transaction(function () use ($match, $newState, $scores, $botId, $humanId, $botPlayer, $humanPlayer) {
            $match->update(['state_snapshot' => $newState]);
            $botPlayer?->update(['round_score' => $scores[$botId] ?? 0]);
            $humanPlayer?->update(['round_score' => $scores[$humanId] ?? 0]);

            if (!$humanPlayer?->passed) {
                $match->update(['current_player_id' => $humanId]);
                $this->matchFlow->resetTurnTimer($match->fresh());
            }
        });

        $match = $match->fresh(['players.user.profile']);
        $botUser = User::find($botId);
        if ($botUser) {
            broadcast(new MatchLeaderUsed($match, $botUser, $newState['leader_result'] ?? null))->toOthers();
        }

        return $match;
    }

    private function applyRedrawSkip(GameMatch $match, int $botId): GameMatch
    {
        $newState = GwentEngine::skipRedraw($match->state_snapshot, $botId);
        $match->update(['state_snapshot' => $newState]);
        return $match->fresh(['players.user.profile']);
    }

    private function resolveBotMedic(GameMatch $match, int $botId): GameMatch
    {
        $choices = GwentEngine::getValidGraveMedic($match->state_snapshot, $botId);
        if ($choices === []) {
            return $this->applyPass($match, $botId);
        }

        $result = $this->matchFlow->applyMedicResolve($match, $botId, (int) $choices[0]['pos'], true);
        return $result['match']->fresh(['players.user.profile']);
    }

    private function applyPass(GameMatch $match, int $botId): GameMatch
    {
        $result = $this->matchFlow->applyPass($match, $botId, true);
        $fresh = $result['match']->fresh(['players.user.profile']);
        $botUser = User::find($botId);
        if ($botUser) {
            broadcast(new MatchPassed($fresh, $botUser))->toOthers();
        }
        return $fresh;
    }
}
