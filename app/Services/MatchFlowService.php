<?php

namespace App\Services;

use App\Events\MatchGameEnd;
use App\Events\MatchPassed;
use App\Events\MatchRoundEnd;
use App\Models\GameMatch;
use App\Models\LobbyMember;
use App\Models\LobbyRoom;
use App\Models\MatchPlayer;
use App\Models\MatchResult;
use Illuminate\Support\Facades\DB;

class MatchFlowService
{
    public function turnTimeoutSeconds(): int
    {
        return (int) config('gwent.turn_timeout_seconds', 180);
    }

    public function resetTurnTimer(GameMatch $match): void
    {
        if ($match->current_player_id) {
            $match->update(['turn_started_at' => now()]);
        }
    }

    public function isTurnExpired(GameMatch $match): bool
    {
        if ($match->status !== GameMatch::STATUS_IN_PROGRESS) {
            return false;
        }

        if (!$match->current_player_id || !$match->turn_started_at) {
            return false;
        }

        return now()->gte(
            $match->turn_started_at->copy()->addSeconds($this->turnTimeoutSeconds())
        );
    }

    public function ensureTurnFresh(GameMatch $match): GameMatch
    {
        $match = $match->fresh(['players.user.profile']);

        if (
            $match->status === GameMatch::STATUS_IN_PROGRESS
            && $match->current_player_id
            && !$match->turn_started_at
        ) {
            $this->resetTurnTimer($match);
            $match = $match->fresh(['players.user.profile']);
        }

        if (($match->state_snapshot['scoiatael_first_choice_user_id'] ?? null) !== null) {
            return $match;
        }

        $guard = 0;

        while (
            $match->status === GameMatch::STATUS_IN_PROGRESS
            && $this->isTurnExpired($match)
            && $guard < 5
        ) {
            $guard++;
            $match = $this->applyTimeoutAction($match)['match'];
            $match = $match->fresh(['players.user.profile']);
        }

        return $match;
    }

    private function applyTimeoutAction(GameMatch $match): array
    {
        $userId = (int) $match->current_player_id;
        $state = $match->state_snapshot ?? [];

        if (($state['pending_medic']['user_id'] ?? null) === $userId) {
            $choices = GwentEngine::getValidGraveMedic($state, $userId);
            if ($choices !== []) {
                return $this->applyMedicResolve($match, $userId, (int) $choices[0]['pos'], true);
            }
        }

        return $this->applyPass($match, $userId, true);
    }

    public function applyPass(GameMatch $match, int $userId, bool $auto = false): array
    {
        $match = $match->fresh(['players.user.profile']);
        $player = $match->players->firstWhere('user_id', $userId);

        if (!$player) {
            return ['match' => $match, 'round_ended' => false, 'game_ended' => false];
        }

        $player->update(['passed' => true]);

        $state = $match->state_snapshot ?? [];
        $state['players'][$userId]['passed'] = true;
        $state['turn_number'] = ($state['turn_number'] ?? 0) + 1;
        $match->update(['state_snapshot' => $state]);

        $player->loadMissing('user');
        broadcast(new MatchPassed($match->fresh(['players.user.profile']), $player->user))->toOthers();

        $opponent = $match->players->firstWhere('user_id', '!=', $userId);

        if ($opponent && $opponent->passed) {
            return $this->endRound($match);
        }

        if ($opponent) {
            $match->update(['current_player_id' => $opponent->user_id]);
            $this->resetTurnTimer($match->fresh());
        }

        return [
            'match'        => $match->fresh(['players.user.profile']),
            'round_ended'  => false,
            'game_ended'   => false,
            'auto_pass'    => $auto,
        ];
    }

    public function applyMedicResolve(GameMatch $match, int $userId, int $gravePos, bool $auto = false): array
    {
        $match = $match->fresh(['players.user.profile']);
        $player = $match->players->firstWhere('user_id', $userId);
        $opponent = $match->players->firstWhere('user_id', '!=', $userId);

        if (!$player || !$opponent) {
            return ['match' => $match, 'round_ended' => false, 'game_ended' => false];
        }

        $state = $match->state_snapshot ?? [];
        $newState = GwentEngine::medicResolve($state, $userId, $gravePos);
        $scores = GwentEngine::calculateScores($newState);

        DB::transaction(function () use ($match, $newState, $scores, $userId, $opponent, $player) {
            $match->update(['state_snapshot' => $newState]);
            $player->update(['round_score' => $scores[$userId] ?? 0]);
            $opponent->update(['round_score' => $scores[$opponent->user_id] ?? 0]);

            if (!$opponent->passed) {
                $match->update(['current_player_id' => $opponent->user_id]);
            }
        });

        $match = $match->fresh(['players.user.profile']);

        if ($opponent->passed) {
            return $this->endRound($match);
        }

        $this->resetTurnTimer($match);

        return [
            'match'       => $match->fresh(['players.user.profile']),
            'round_ended' => false,
            'game_ended'  => false,
            'auto_medic'  => $auto,
        ];
    }

    public function endRound(GameMatch $match): array
    {
        $match = $match->fresh(['players.user.profile']);
        $players = $match->players;
        $playerIds = $players->pluck('user_id')->toArray();

        $state = GwentEngine::endRound($match->state_snapshot ?? [], $playerIds);

        $p1 = $players[0];
        $p2 = $players[1];

        $p1Health = $state['players'][$p1->user_id]['health'] ?? $p1->health;
        $p2Health = $state['players'][$p2->user_id]['health'] ?? $p2->health;

        $roundWinnerId = $state['last_round_winner_id'] ?? null;

        $p1->update(['passed' => false, 'round_score' => 0, 'health' => $p1Health]);
        $p2->update(['passed' => false, 'round_score' => 0, 'health' => $p2Health]);

        if ($p1Health <= 0 || $p2Health <= 0) {
            return $this->endGame($match, $state);
        }

        $match->increment('current_round');
        $nextPlayer = GwentEngine::startingPlayerForCurrentRound($state, $playerIds);

        $match->update([
            'current_player_id' => $nextPlayer,
            'state_snapshot'    => $state,
        ]);

        $this->resetTurnTimer($match->fresh());

        broadcast(new MatchRoundEnd($match->fresh(['players.user.profile']), $roundWinnerId))->toOthers();

        return [
            'match'           => $match->fresh(['players.user.profile']),
            'round_ended'     => true,
            'game_ended'      => false,
            'round_winner_id' => $roundWinnerId,
        ];
    }

    public function endGame(GameMatch $match, array $finalState): array
    {
        $match = $match->fresh(['players.user.profile']);
        $players = $match->players;
        $p1 = $players[0];
        $p2 = $players[1];

        $p1Health = $finalState['players'][$p1->user_id]['health'] ?? $p1->health;
        $p2Health = $finalState['players'][$p2->user_id]['health'] ?? $p2->health;

        $winnerId = null;
        $loserId = null;
        $isDraw = false;

        if ($p1Health > $p2Health) {
            $winnerId = $p1->user_id;
            $loserId = $p2->user_id;
        } elseif ($p2Health > $p1Health) {
            $winnerId = $p2->user_id;
            $loserId = $p1->user_id;
        } else {
            $isDraw = true;
        }

        $duration = $match->started_at ? $match->started_at->diffInSeconds(now()) : 0;

        DB::transaction(function () use ($match, $winnerId, $loserId, $isDraw, $duration, $finalState) {
            MatchResult::create([
                'match_id'         => $match->id,
                'winner_user_id'   => $winnerId,
                'loser_user_id'    => $loserId,
                'is_draw'          => $isDraw,
                'winner_rounds'    => 2,
                'loser_rounds'     => max(0, $match->current_round - 2),
                'total_rounds'     => $match->current_round,
                'duration_seconds' => $duration,
            ]);

            $match->update([
                'status'         => GameMatch::STATUS_FINISHED,
                'ended_at'       => now(),
                'state_snapshot' => $finalState,
            ]);

            $this->applyStats($match, $winnerId, $isDraw);
            $this->cleanupLobby($match);
        });

        broadcast(new MatchGameEnd($match->fresh()))->toOthers();

        return [
            'match'      => $match->fresh(['players.user.profile']),
            'game_ended' => true,
            'winner_id'  => $winnerId,
            'is_draw'    => $isDraw,
        ];
    }

    public function forfeitMatch(GameMatch $match, int $loserUserId): void
    {
        if ($match->status !== GameMatch::STATUS_IN_PROGRESS) {
            return;
        }

        $winner = $match->players()->where('user_id', '!=', $loserUserId)->first();

        if (!$winner) {
            $match->update([
                'status'   => GameMatch::STATUS_CANCELLED,
                'ended_at' => now(),
            ]);
            $this->cleanupLobby($match);

            return;
        }

        $winnerId = $winner->user_id;
        $duration = $match->started_at ? $match->started_at->diffInSeconds(now()) : 0;

        DB::transaction(function () use ($match, $winnerId, $loserUserId, $duration) {
            MatchResult::create([
                'match_id'         => $match->id,
                'winner_user_id'   => $winnerId,
                'loser_user_id'    => $loserUserId,
                'is_draw'          => false,
                'winner_rounds'    => 2,
                'loser_rounds'     => 0,
                'total_rounds'     => $match->current_round,
                'duration_seconds' => $duration,
            ]);

            $match->update([
                'status'   => GameMatch::STATUS_FINISHED,
                'ended_at' => now(),
            ]);

            $this->applyStats($match, $winnerId, false);
            $this->cleanupLobby($match);
        });

        broadcast(new MatchGameEnd($match->fresh()))->toOthers();
    }

    private function applyStats(GameMatch $match, ?int $winnerId, bool $isDraw): void
    {
        foreach ($match->players as $p) {
            if (!$p->user_id) {
                continue;
            }
            $profile = $p->user->profile;
            if ($isDraw) {
                $profile->increment('draws');
            } elseif ($p->user_id === $winnerId) {
                $profile->increment('wins');
            } else {
                $profile->increment('losses');
            }
        }
    }

    private function cleanupLobby(GameMatch $match): void
    {
        if (!$match->lobby_room_id) {
            return;
        }

        LobbyMember::where('room_id', $match->lobby_room_id)->delete();
        LobbyRoom::where('id', $match->lobby_room_id)->update([
            'status' => LobbyRoom::STATUS_CANCELLED,
        ]);
    }
}
