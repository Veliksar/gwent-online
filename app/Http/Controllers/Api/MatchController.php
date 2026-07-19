<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GameMatch;
use App\Models\LobbyMember;
use App\Models\LobbyRoom;
use App\Models\MatchPlayer;
use App\Models\MatchResult;
use App\Events\MatchStarted;
use App\Events\LobbyStart;
use App\Events\MatchCardPlayed;
use App\Events\MatchLeaderUsed;
use App\Services\GwentEngine;
use App\Services\MatchFlowService;
use App\Services\SandboxBotRunner;
use App\Services\SandboxBotUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MatchController extends Controller
{
    private const BOARD_ROWS = ['close', 'ranged', 'siege'];

    public function __construct(
        private MatchFlowService $matchFlow,
        private SandboxBotRunner $sandboxBotRunner,
        private SandboxBotUserService $sandboxBotUsers,
    ) {}

    public function start(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prefer_first' => 'nullable|boolean',
        ]);

        $user = $request->user();

        $member = LobbyMember::where('user_id', $user->id)
            ->whereHas('room', fn($q) => $q->whereIn('status', [
                LobbyRoom::STATUS_READY,
                LobbyRoom::STATUS_STARTED,
            ]))
            ->first();

        if (!$member) {
            return response()->json(['message' => 'Лобби не готово к началу игры.'], 400);
        }

        $room = $member->room;

        if ($room->status === LobbyRoom::STATUS_STARTED) {
            $existingMatch = GameMatch::where('lobby_room_id', $room->id)
                ->where('status', GameMatch::STATUS_IN_PROGRESS)
                ->with(['players.user.profile'])
                ->first();

            if ($existingMatch) {
                $existingMatch = $this->matchFlow->ensureTurnFresh($existingMatch);

                return response()->json(['match' => $this->formatMatch($existingMatch, $user->id)]);
            }

            return response()->json(['message' => 'Матч уже начат, но не найден.'], 400);
        }

        if (!$room->allReady()) {
            return response()->json(['message' => 'Не все игроки готовы.'], 400);
        }

        if (!$room->isHost($user->id)) {
            return response()->json(['message' => 'Только хост может начать матч.'], 403);
        }

        $match = DB::transaction(function () use ($room, $validated, $user) {
            $members = $room->members()->with('user')->get();
            $playerDecks = [];
            foreach ($members as $m) {
                $deck = $m->resolvedDeck();
                $playerDecks[$m->user_id] = $deck;
            }

            $playerIds = $members->pluck('user_id')->toArray();
            $stateOptions = ['chooser_user_id' => $user->id];
            if (array_key_exists('prefer_first', $validated)) {
                $stateOptions['prefer_first'] = (bool) $validated['prefer_first'];
            }
            $stateSnapshot = GwentEngine::initGame($playerIds, $playerDecks, $stateOptions);
            $firstPlayerId = GwentEngine::startingPlayerForCurrentRound($stateSnapshot, $playerIds);

            $match = GameMatch::create([
                'lobby_room_id'     => $room->id,
                'mode'              => GameMatch::MODE_PVP,
                'status'            => GameMatch::STATUS_IN_PROGRESS,
                'current_round'     => 1,
                'current_player_id' => $firstPlayerId,
                'state_snapshot'    => $stateSnapshot,
                'started_at'        => now(),
                'turn_started_at'   => now(),
            ]);

            foreach ($members as $m) {
                $deck = $m->resolvedDeck();
                MatchPlayer::create([
                    'match_id'       => $match->id,
                    'user_id'        => $m->user_id,
                    'deck_faction'   => $deck['deck_faction'],
                    'deck_leader_id' => $deck['deck_leader_id'],
                    'deck_cards'     => $deck['deck_cards'],
                    'health'         => 2,
                    'passed'         => false,
                    'round_score'    => 0,
                ]);
            }

            $room->update(['status' => LobbyRoom::STATUS_STARTED]);

            return $match->fresh(['players.user.profile']);
        });

        broadcast(new MatchStarted($match))->toOthers();
        broadcast(new LobbyStart($room, $match))->toOthers();

        return response()->json(['match' => $this->formatMatch($match, $user->id)]);
    }

    public function playCard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'card_index'   => 'required|integer|min:0',
            'row'          => 'required|string|in:close,ranged,siege',
            'target_index' => 'nullable|integer|min:0',
        ]);

        $user = $request->user();

        $player = MatchPlayer::where('user_id', $user->id)
            ->whereHas('match', fn($q) => $q->where('status', GameMatch::STATUS_IN_PROGRESS))
            ->first();

        if (!$player) {
            return response()->json(['message' => 'Вы не участвуете в активном матче.'], 400);
        }

        $match = $this->matchFlow->ensureTurnFresh($player->match);

        if ($match->current_player_id !== $user->id) {
            return response()->json(['message' => 'Сейчас не ваш ход.'], 400);
        }

        if ($this->hasPendingFirstChoice($match)) {
            return response()->json(['message' => 'Ожидается выбор первого хода Scoia\'tael.'], 400);
        }

        if ($match->state_snapshot['pending_medic'] ?? null) {
            return response()->json(['message' => 'Ожидается выбор карты для медика.'], 400);
        }

        $opponent = $match->players()->where('user_id', '!=', $user->id)->first();

        try {
            $newState = GwentEngine::playCard(
                $match->state_snapshot,
                $user->id,
                (int) $validated['card_index'],
                $validated['row'],
                $opponent->user_id,
                isset($validated['target_index']) ? (int) $validated['target_index'] : null
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }

        $scores = GwentEngine::calculateScores($newState);

        DB::transaction(function () use ($match, $newState, $scores, $user, $opponent, $player) {
            $match->update(['state_snapshot' => $newState]);

            $player->update(['round_score' => $scores[$user->id] ?? 0]);
            $opponent->update(['round_score' => $scores[$opponent->user_id] ?? 0]);

            if (!isset($newState['pending_medic']) || $newState['pending_medic'] === null) {
                if (!$opponent->passed) {
                    $match->update(['current_player_id' => $opponent->user_id]);
                }
                // Таймер обновляется и когда ход остаётся у игрока (соперник спасовал)
                $this->matchFlow->resetTurnTimer($match->fresh());
            }
        });

        $match = $match->fresh(['players.user.profile']);

        broadcast(new MatchCardPlayed($match, $user, $validated))->toOthers();

        if ($newState['pending_medic'] ?? null) {
            $graveCards = GwentEngine::getValidGraveMedic($newState, $user->id);
            $match = $this->finalizeMatch($match, $user->id);

            return response()->json([
                'message'       => 'Карта разыграна. Выберите карту для медика.',
                'pending_medic' => true,
                'grave_choices' => $graveCards,
                'match'         => $this->formatMatch($match, $user->id),
            ]);
        }

        $match = $this->finalizeMatch($match, $user->id);

        return response()->json([
            'message' => 'Карта разыграна.',
            'match'   => $this->formatMatch($match, $user->id),
        ]);
    }

    public function medicResolve(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'grave_pos' => 'required|integer|min:0',
        ]);

        $user = $request->user();

        $player = MatchPlayer::where('user_id', $user->id)
            ->whereHas('match', fn($q) => $q->where('status', GameMatch::STATUS_IN_PROGRESS))
            ->first();

        if (!$player) {
            return response()->json(['message' => 'Нет активного матча.'], 400);
        }

        $match = $this->matchFlow->ensureTurnFresh($player->match);
        $state = $match->state_snapshot;

        if (($state['pending_medic']['user_id'] ?? null) !== $user->id) {
            return response()->json(['message' => 'Не ваша очередь выбирать медика.'], 400);
        }

        $result = $this->matchFlow->applyMedicResolve(
            $match,
            $user->id,
            (int) $validated['grave_pos']
        );

        if ($result['game_ended'] ?? false) {
            return response()->json([
                'message'    => 'Медик сыгран.',
                'game_ended' => true,
                'winner_id'  => $result['winner_id'],
                'is_draw'    => $result['is_draw'],
                'match'      => $this->formatMatch($result['match'], $user->id),
            ]);
        }

        if ($result['round_ended'] ?? false) {
            return response()->json([
                'message'          => 'Медик сыгран.',
                'round_ended'      => true,
                'round_winner_id'  => $result['round_winner_id'],
                'match'            => $this->formatMatch($result['match'], $user->id),
            ]);
        }

        return response()->json([
            'message' => 'Медик сыгран.',
            'match'   => $this->formatMatch($result['match'], $user->id),
        ]);
    }

    public function useLeader(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'choices' => 'nullable|array',
        ]);

        $user = $request->user();

        $player = MatchPlayer::where('user_id', $user->id)
            ->whereHas('match', fn($q) => $q->where('status', GameMatch::STATUS_IN_PROGRESS))
            ->first();

        if (!$player) {
            return response()->json(['message' => 'Вы не участвуете в активном матче.'], 400);
        }

        $match = $this->matchFlow->ensureTurnFresh($player->match);

        if ($match->current_player_id !== $user->id) {
            return response()->json(['message' => 'Сейчас не ваш ход.'], 400);
        }

        if ($this->hasPendingFirstChoice($match)) {
            return response()->json(['message' => 'Ожидается выбор первого хода Scoia\'tael.'], 400);
        }

        if ($match->state_snapshot['pending_medic'] ?? null) {
            return response()->json(['message' => 'Ожидается выбор карты для медика.'], 400);
        }

        $opponent = $match->players()->where('user_id', '!=', $user->id)->first();

        try {
            $newState = GwentEngine::activateLeader(
                $match->state_snapshot,
                $user->id,
                $opponent->user_id,
                $validated['choices'] ?? []
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }

        $scores = GwentEngine::calculateScores($newState);

        DB::transaction(function () use ($match, $newState, $scores, $user, $opponent, $player) {
            $match->update(['state_snapshot' => $newState]);

            $player->update(['round_score' => $scores[$user->id] ?? 0]);
            $opponent->update(['round_score' => $scores[$opponent->user_id] ?? 0]);

            if (!$opponent->passed) {
                $match->update(['current_player_id' => $opponent->user_id]);
                $this->matchFlow->resetTurnTimer($match->fresh());
            }
        });

        $match = $match->fresh(['players.user.profile']);

        broadcast(new MatchLeaderUsed($match, $user, $newState['leader_result'] ?? null))->toOthers();

        $match = $this->finalizeMatch($match, $user->id);

        return response()->json([
            'message'       => 'Способность лидера использована.',
            'leader_result' => $newState['leader_result'] ?? null,
            'match'         => $this->formatMatch($match, $user->id),
        ]);
    }

    public function chooseFirst(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prefer_first' => 'required|boolean',
        ]);

        $user = $request->user();

        $player = MatchPlayer::where('user_id', $user->id)
            ->whereHas('match', fn($q) => $q->where('status', GameMatch::STATUS_IN_PROGRESS))
            ->first();

        if (!$player) {
            return response()->json(['message' => 'Вы не участвуете в активном матче.'], 400);
        }

        $match = $this->matchFlow->ensureTurnFresh($player->match);
        $playerIds = $match->players()->pluck('user_id')->toArray();

        try {
            $newState = GwentEngine::chooseFirstPlayer(
                $match->state_snapshot,
                $user->id,
                (bool) $validated['prefer_first'],
                $playerIds
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }

        $match->update([
            'state_snapshot' => $newState,
            'current_player_id' => GwentEngine::startingPlayerForCurrentRound($newState, $playerIds),
        ]);
        $this->matchFlow->resetTurnTimer($match->fresh());

        return response()->json([
            'message' => 'Первый ход выбран.',
            'match'   => $this->formatMatch($match->fresh(['players.user.profile']), $user->id),
        ]);
    }

    public function pass(Request $request): JsonResponse
    {
        $user = $request->user();

        $player = MatchPlayer::where('user_id', $user->id)
            ->whereHas('match', fn($q) => $q->where('status', GameMatch::STATUS_IN_PROGRESS))
            ->first();

        if (!$player) {
            return response()->json(['message' => 'Вы не участвуете в активном матче.'], 400);
        }

        $match = $this->matchFlow->ensureTurnFresh($player->match);

        if ($match->current_player_id !== $user->id) {
            return response()->json(['message' => 'Сейчас не ваш ход.'], 400);
        }

        if ($this->hasPendingFirstChoice($match)) {
            return response()->json(['message' => 'Ожидается выбор первого хода Scoia\'tael.'], 400);
        }

        $result = $this->matchFlow->applyPass($match, $user->id);

        $match = $this->finalizeMatch($result['match'], $user->id);

        if ($result['game_ended'] ?? false) {
            return response()->json([
                'message'    => 'Вы спасовали.',
                'game_ended' => true,
                'winner_id'  => $result['winner_id'],
                'is_draw'    => $result['is_draw'],
                'match'      => $this->formatMatch($match, $user->id),
            ]);
        }

        if ($result['round_ended'] ?? false) {
            return response()->json([
                'message'         => 'Вы спасовали.',
                'round_ended'     => true,
                'round_winner_id' => $result['round_winner_id'],
                'match'           => $this->formatMatch($match, $user->id),
            ]);
        }

        return response()->json([
            'message' => 'Вы спасовали.',
            'match'   => $this->formatMatch($match, $user->id),
        ]);
    }

    public function syncTurn(Request $request): JsonResponse
    {
        $user = $request->user();

        $player = MatchPlayer::where('user_id', $user->id)
            ->whereHas('match', fn($q) => $q->where('status', GameMatch::STATUS_IN_PROGRESS))
            ->with(['match.players.user.profile'])
            ->first();

        if (!$player) {
            return $this->finishedMatchResponse($request, $user->id);
        }

        $match = $this->matchFlow->ensureTurnFresh($player->match);

        if ($match->status === GameMatch::STATUS_FINISHED) {
            $result = $match->result;

            return response()->json([
                'match'       => null,
                'game_ended'  => true,
                'winner_id'   => $result?->winner_user_id,
                'is_draw'     => $result?->is_draw ?? false,
            ]);
        }

        $match = $this->sandboxBotRunner->advanceIfNeeded($match);

        return response()->json([
            'match' => $this->formatMatch($match, $user->id),
        ]);
    }

    public function presentMatch(GameMatch $match, int $viewerUserId): array
    {
        $match = $this->sandboxBotRunner->advanceIfNeeded($match);

        return $this->formatMatch($match, $viewerUserId);
    }

    private function finalizeMatch(GameMatch $match, int $viewerUserId): GameMatch
    {
        return $this->sandboxBotRunner->advanceIfNeeded($match);
    }

    public function redraw(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hand_pos' => 'required|integer|min:0',
        ]);

        $user = $request->user();

        $player = MatchPlayer::where('user_id', $user->id)
            ->whereHas('match', fn($q) => $q->where('status', GameMatch::STATUS_IN_PROGRESS))
            ->with(['match.players.user.profile'])
            ->first();

        if (!$player) {
            return response()->json(['message' => 'Активный матч не найден.'], 404);
        }

        $match = $player->match;
        $state = $match->state_snapshot;

        $playerState = $state['players'][$user->id] ?? null;
        if (!$playerState || ($playerState['redraw_remaining'] ?? 0) <= 0) {
            return response()->json(['message' => 'Нет доступных замен карт.'], 422);
        }

        $newState = GwentEngine::reDrawCard($state, $user->id, (int) $validated['hand_pos']);
        $match->state_snapshot = $newState;
        $match->save();

        return response()->json(['match' => $this->formatMatch($match, $user->id)]);
    }

    public function redrawSkip(Request $request): JsonResponse
    {
        $user = $request->user();

        $player = MatchPlayer::where('user_id', $user->id)
            ->whereHas('match', fn($q) => $q->where('status', GameMatch::STATUS_IN_PROGRESS))
            ->with(['match.players.user.profile'])
            ->first();

        if (!$player) {
            return response()->json(['message' => 'Активный матч не найден.'], 404);
        }

        $match = $player->match;
        $newState = GwentEngine::skipRedraw($match->state_snapshot, $user->id);
        $match->state_snapshot = $newState;
        $match->save();

        return response()->json(['match' => $this->formatMatch($match, $user->id)]);
    }

    public function state(Request $request): JsonResponse
    {
        $user = $request->user();

        $player = MatchPlayer::where('user_id', $user->id)
            ->whereHas('match', fn($q) => $q->where('status', GameMatch::STATUS_IN_PROGRESS))
            ->with(['match.players.user.profile'])
            ->first();

        if (!$player) {
            return $this->finishedMatchResponse($request, $user->id);
        }

        $match = $this->matchFlow->ensureTurnFresh($player->match);

        if ($match->status === GameMatch::STATUS_FINISHED) {
            $result = $match->result;

            return response()->json([
                'match'      => null,
                'game_ended' => true,
                'winner_id'  => $result?->winner_user_id,
                'is_draw'    => $result?->is_draw ?? false,
            ]);
        }

        $match = $this->sandboxBotRunner->advanceIfNeeded($match);

        $match = $this->sandboxBotRunner->advanceIfNeeded($match);

        return response()->json(['match' => $this->formatMatch($match, $user->id)]);
    }

    public function end(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'match_id'         => 'required|integer',
            'winner_user_id'   => 'nullable|integer',
            'is_draw'          => 'required|boolean',
            'winner_rounds'    => 'required|integer',
            'loser_rounds'     => 'required|integer',
            'duration_seconds' => 'required|integer',
        ]);

        $match = GameMatch::find($validated['match_id']);

        if (!$match || $match->status !== GameMatch::STATUS_IN_PROGRESS) {
            return response()->json(['message' => 'Матч не найден или уже завершен.'], 400);
        }

        DB::transaction(function () use ($match, $validated) {
            $winnerId = $validated['winner_user_id'];
            $loserId = $winnerId
                ? $match->players()->where('user_id', '!=', $winnerId)->first()?->user_id
                : null;

            MatchResult::create([
                'match_id'         => $match->id,
                'winner_user_id'   => $winnerId,
                'loser_user_id'    => $loserId,
                'is_draw'          => $validated['is_draw'],
                'winner_rounds'    => $validated['winner_rounds'],
                'loser_rounds'     => $validated['loser_rounds'],
                'total_rounds'     => $validated['winner_rounds'] + $validated['loser_rounds'],
                'duration_seconds' => $validated['duration_seconds'],
            ]);

            $match->update(['status' => GameMatch::STATUS_FINISHED, 'ended_at' => now()]);

            foreach ($match->players as $p) {
                if (!$p->user_id) {
                    continue;
                }
                $profile = $p->user->profile;
                if ($validated['is_draw']) {
                    $profile->increment('draws');
                } elseif ($p->user_id === $winnerId) {
                    $profile->increment('wins');
                } else {
                    $profile->increment('losses');
                }
            }
        });

        return response()->json(['message' => 'Матч завершен.']);
    }

    public function reconnect(Request $request): JsonResponse
    {
        $user = $request->user();

        $lobbyMember = LobbyMember::where('user_id', $user->id)
            ->whereHas('room', fn($q) => $q->whereIn('status', [LobbyRoom::STATUS_WAITING, LobbyRoom::STATUS_READY]))
            ->with(['room.members.user.profile', 'room.invite'])
            ->first();

        $matchPlayer = MatchPlayer::where('user_id', $user->id)
            ->whereHas('match', fn($q) => $q->where('status', GameMatch::STATUS_IN_PROGRESS))
            ->with(['match.players.user.profile'])
            ->first();

        $match = null;
        if ($matchPlayer) {
            $fresh = $this->matchFlow->ensureTurnFresh($matchPlayer->match);
            if ($fresh->status === GameMatch::STATUS_IN_PROGRESS) {
                $match = $this->formatMatch($fresh, $user->id);
            }
        }

        return response()->json([
            'lobby' => $lobbyMember ? [
                'room' => [
                    'id'      => $lobbyMember->room->id,
                    'status'  => $lobbyMember->room->status,
                    'members' => $lobbyMember->room->members->map(fn($m) => [
                        'user_id'  => $m->user_id,
                        'nickname' => $m->user->profile->nickname ?? 'Unknown',
                        'ready'    => $m->ready,
                    ]),
                ],
                'room_code' => $lobbyMember->room->invite?->room_code,
            ] : null,
            'match' => $match,
        ]);
    }

    public function botSave(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'is_draw'          => 'required|boolean',
            'won_by_player'    => 'required|boolean',
            'duration_seconds' => 'required|integer|min:0',
        ]);

        $user = $request->user();

        DB::transaction(function () use ($user, $validated) {
            $match = GameMatch::create([
                'mode'              => GameMatch::MODE_BOT,
                'status'            => GameMatch::STATUS_FINISHED,
                'current_round'     => 1,
                'current_player_id' => null,
                'state_snapshot'    => [],
                'started_at'        => now()->subSeconds($validated['duration_seconds']),
                'ended_at'          => now(),
            ]);

            $winnerId = $validated['is_draw'] ? null : ($validated['won_by_player'] ? $user->id : null);
            $loserId = (!$validated['is_draw'] && !$validated['won_by_player']) ? $user->id : null;

            MatchResult::create([
                'match_id'         => $match->id,
                'winner_user_id'   => $winnerId,
                'loser_user_id'    => $loserId,
                'is_draw'          => $validated['is_draw'],
                'winner_rounds'    => 2,
                'loser_rounds'     => 0,
                'total_rounds'     => 2,
                'duration_seconds' => $validated['duration_seconds'],
            ]);

            $profile = $user->profile;
            if ($validated['is_draw']) {
                $profile->increment('draws');
            } elseif ($validated['won_by_player']) {
                $profile->increment('wins');
            } else {
                $profile->increment('losses');
            }
        });

        return response()->json(['message' => 'Результат сохранен.']);
    }

    private function formatMatch(GameMatch $match, int $viewerUserId): array
    {
        $state = $match->state_snapshot ?? [];
        $pendingMedic = ($state['pending_medic']['user_id'] ?? null) === $viewerUserId;
        $revealBotHand = $match->isSandbox()
            && config('gwent.sandbox_reveal_bot_hand')
            && config('gwent.developer_mode_enabled');
        $botUserId = $this->sandboxBotUsers->botUserId();

        $players = $match->players->map(function ($player) use ($state, $viewerUserId, $revealBotHand, $botUserId) {
            $uid = $player->user_id;
            $ps = $state['players'][$uid] ?? [];
            $rowScores = $this->formatRowScores($state, $uid);

            $showHand = $uid === $viewerUserId || ($revealBotHand && $uid === $botUserId);
            $hand = $showHand
                ? ($ps['hand'] ?? [])
                : array_fill(0, count($ps['hand'] ?? []), null);

            return [
                'user_id'      => $uid,
                'nickname'     => $player->user?->profile->nickname ?? 'Бот',
                'deck_faction' => $player->deck_faction,
                'leader_index' => $ps['leader_index'] ?? $player->deck_leader_id,
                'leader_used'  => $ps['leader_used'] ?? false,
                'leader_disabled' => $ps['leader_disabled'] ?? false,
                'leader_activatable' => GwentEngine::isLeaderActivatableIndex($ps['leader_index'] ?? $player->deck_leader_id),
                'health'       => $ps['health'] ?? $player->health,
                'passed'       => $ps['passed'] ?? $player->passed,
                'round_score'  => array_sum($rowScores),
                'row_scores'   => $rowScores,
                'hand'         => $hand,
                'hand_count'   => count($ps['hand'] ?? []),
                'board'        => $ps['board'] ?? ['close' => [], 'ranged' => [], 'siege' => []],
                'board_display'=> $this->formatBoardDisplay($state, $uid),
                // Кладбище - открытая информация (канон: обе стопки видны и просматриваются)
                'grave'             => $ps['grave'] ?? [],
                'deck_count'        => count($ps['deck'] ?? []),
                'redraw_remaining'  => ($uid === $viewerUserId) ? ($ps['redraw_remaining'] ?? 0) : 0,
            ];
        });

        $turnRemaining = null;
        if ($match->turn_started_at && $match->current_player_id) {
            $elapsed = $match->turn_started_at->diffInSeconds(now());
            $turnRemaining = max(0, $this->matchFlow->turnTimeoutSeconds() - $elapsed);
        }

        // Финальный таймер раунда (оба спасовали)
        $roundEndingSeconds = null;
        if (($state['round_ending_at'] ?? null) !== null) {
            $roundEndingSeconds = max(0, (int) ceil(now()->diffInSeconds(\Illuminate\Support\Carbon::parse($state['round_ending_at']), false)));
        }

        return [
            'id'                  => $match->id,
            'mode'                => $match->mode,
            'status'              => $match->status,
            'current_round'       => $match->current_round,
            'current_player_id'   => $match->current_player_id,
            'players'             => $players,
            'weather'             => $state['weather'] ?? ['close' => false, 'ranged' => false, 'siege' => false],
            'weather_cards'       => $state['weather_cards'] ?? [],
            'round_ending_seconds' => $roundEndingSeconds,
            'horns'               => $state['horns'] ?? [],
            'leader_horns'        => $state['leader_horns'] ?? [],
            'mardroeme_rows'      => $state['mardroeme_rows'] ?? [],
            'round_history'       => $state['round_history'] ?? [],
            'leader_result'       => $state['leader_result'] ?? null,
            'scoiatael_first_choice_user_id' => $state['scoiatael_first_choice_user_id'] ?? null,
            'pending_medic'       => $pendingMedic,
            'grave_choices'       => $pendingMedic ? GwentEngine::getValidGraveMedic($state, $viewerUserId) : [],
            'pending_decoy'       => false,
            'faction_passives_pending' => [
                'scoiatael_first' => ($state['scoiatael_first_choice_user_id'] ?? null) !== null,
                'emhyr_reveal' => ($state['leader_result']['type'] ?? null) === 'reveal_hand',
            ],
            'faction_events'      => $state['faction_events'] ?? [],
            'started_at'          => $match->started_at,
            'turn_started_at'     => $match->turn_started_at,
            'turn_timeout_seconds'=> $this->matchFlow->turnTimeoutSeconds(),
            'turn_seconds_remaining' => $turnRemaining,
            'sandbox' => $match->isSandbox() ? [
                'reveal_opponent_hand' => $revealBotHand,
                'bot_user_id' => $botUserId,
            ] : null,
        ];
    }

    private function formatRowScores(array $state, int $userId): array
    {
        $scores = [];
        foreach (self::BOARD_ROWS as $row) {
            $scores[$row] = GwentEngine::calculateRowScore($state, $userId, $row);
        }
        return $scores;
    }

    private function formatBoardDisplay(array $state, int $userId): array
    {
        $board = $state['players'][$userId]['board'] ?? [];
        $display = [];

        foreach (self::BOARD_ROWS as $row) {
            $display[$row] = array_map(
                fn($cardIndex) => [
                    'index' => $cardIndex,
                    'power' => GwentEngine::calculateCardPower($state, $userId, $row, $cardIndex),
                ],
                $board[$row] ?? []
            );
        }

        return $display;
    }

    private function hasPendingFirstChoice(GameMatch $match): bool
    {
        return ($match->state_snapshot['scoiatael_first_choice_user_id'] ?? null) !== null;
    }

    /**
     * Матч клиента завершился, а Echo-событие могло потеряться: если клиент
     * передал match_id известного ему матча, возвращаем итог вместо {match: null},
     * чтобы он не застрял на игровом столе.
     */
    private function finishedMatchResponse(Request $request, int $userId): JsonResponse
    {
        $knownId = (int) $request->input('match_id', 0);
        if ($knownId <= 0) {
            return response()->json(['match' => null]);
        }

        $known = GameMatch::with('result')
            ->where('id', $knownId)
            ->whereHas('players', fn($q) => $q->where('user_id', $userId))
            ->first();

        if (!$known) {
            return response()->json(['match' => null]);
        }

        if ($known->status === GameMatch::STATUS_FINISHED) {
            return response()->json([
                'match'      => null,
                'game_ended' => true,
                'winner_id'  => $known->result?->winner_user_id,
                'is_draw'    => $known->result?->is_draw ?? false,
            ]);
        }

        if ($known->status === GameMatch::STATUS_CANCELLED) {
            return response()->json([
                'match'     => null,
                'cancelled' => true,
            ]);
        }

        return response()->json(['match' => null]);
    }
}
