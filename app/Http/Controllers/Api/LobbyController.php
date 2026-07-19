<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LobbyInvite;
use App\Models\LobbyMember;
use App\Models\LobbyRoom;
use App\Models\GameMatch;
use App\Models\MatchPlayer;
use App\Models\UserDeck;
use App\Services\DeckValidator;
use App\Services\MatchFlowService;
use App\Models\User;
use App\Events\LobbyJoined;
use App\Events\LobbyLeft;
use App\Events\LobbyReady;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LobbyController extends Controller
{
    public function __construct(
        private MatchFlowService $matchFlow
    ) {}

    /**
     * Активная сохранённая колода игрока подставляется в лобби автоматически,
     * чтобы игрок с настроенной колодой мог сразу нажать «Готов».
     */
    private function memberDeckAttributes(User $user): array
    {
        $deck = UserDeck::where('user_id', $user->id)
            ->orderByDesc('is_active')
            ->orderByDesc('updated_at')
            ->first();

        if (!$deck) {
            return [];
        }

        return [
            'deck_faction' => $deck->faction,
            'deck_leader_id' => $deck->leader_id,
            'deck_cards' => $deck->cards,
        ];
    }
    public function join(Request $request): JsonResponse
    {
        $user = $request->user();

        $this->cleanupStaleMemberships($user->id);

        $existingMember = LobbyMember::where('user_id', $user->id)
            ->whereHas('room', function ($q) {
                $q->whereIn('status', [LobbyRoom::STATUS_WAITING, LobbyRoom::STATUS_READY]);
            })
            ->first();

        if ($existingMember) {
            return response()->json([
                'room' => $this->formatRoom($existingMember->room),
            ]);
        }

        $room = DB::transaction(function () use ($user) {
            $room = LobbyRoom::where('status', LobbyRoom::STATUS_WAITING)
                ->where('is_private', false)
                ->lockForUpdate()
                ->first();

            if (!$room) {
                $room = LobbyRoom::create([
                    'status' => LobbyRoom::STATUS_WAITING,
                    'max_players' => 2,
                    'is_private' => false,
                    'host_user_id' => $user->id,
                ]);
            }

            LobbyMember::create(array_merge([
                'room_id' => $room->id,
                'user_id' => $user->id,
                'ready' => false,
            ], $this->memberDeckAttributes($user)));

            if ($room->host_user_id === null) {
                $room->update(['host_user_id' => $user->id]);
            }

            return $room->fresh(['members.user.profile']);
        });

        broadcast(new LobbyJoined($room, $user))->toOthers();

        return response()->json([
            'room' => $this->formatRoom($room),
        ]);
    }

    public function joinByCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_code' => 'required|string|size:6',
        ]);

        $user = $request->user();

        $this->cleanupStaleMemberships($user->id);

        $invite = LobbyInvite::where('room_code', strtoupper($validated['room_code']))
            ->first();

        if (!$invite || $invite->isExpired()) {
            return response()->json([
                'message' => 'Код комнаты недействителен или истек.',
            ], 404);
        }

        $room = $invite->room;

        if ($room->status !== LobbyRoom::STATUS_WAITING) {
            return response()->json([
                'message' => 'Комната недоступна.',
            ], 400);
        }

        if ($room->isFull()) {
            return response()->json([
                'message' => 'Комната заполнена.',
            ], 400);
        }

        $existingMember = LobbyMember::where('room_id', $room->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$existingMember) {
            LobbyMember::create(array_merge([
                'room_id' => $room->id,
                'user_id' => $user->id,
                'ready' => false,
            ], $this->memberDeckAttributes($user)));
        }

        $room = $room->fresh(['members.user.profile']);

        broadcast(new LobbyJoined($room, $user))->toOthers();

        return response()->json([
            'room' => $this->formatRoom($room),
        ]);
    }

    public function create(Request $request): JsonResponse
    {
        $user = $request->user();

        $this->cleanupStaleMemberships($user->id);

        $room = DB::transaction(function () use ($user) {
            $room = LobbyRoom::create([
                'status' => LobbyRoom::STATUS_WAITING,
                'max_players' => 2,
                'is_private' => true,
                'host_user_id' => $user->id,
            ]);

            LobbyMember::create(array_merge([
                'room_id' => $room->id,
                'user_id' => $user->id,
                'ready' => false,
            ], $this->memberDeckAttributes($user)));

            LobbyInvite::create([
                'room_id' => $room->id,
                'room_code' => LobbyInvite::generateCode(),
                'expires_at' => now()->addHours(1),
            ]);

            return $room->fresh(['members.user.profile', 'invite']);
        });

        return response()->json([
            'room' => $this->formatRoom($room),
            'room_code' => $room->invite->room_code,
        ]);
    }

    public function leave(Request $request): JsonResponse
    {
        $user = $request->user();

        $member = LobbyMember::where('user_id', $user->id)
            ->whereHas('room', function ($q) {
                $q->whereIn('status', [
                    LobbyRoom::STATUS_WAITING,
                    LobbyRoom::STATUS_READY,
                    LobbyRoom::STATUS_STARTED,
                ]);
            })
            ->first();

        if (!$member) {
            $this->abandonOrphanMatch($user->id);

            return response()->json([
                'message' => 'Вы не находитесь в лобби.',
            ], 400);
        }

        $room = $member->room;

        if ($room->status === LobbyRoom::STATUS_STARTED) {
            $this->abandonRoom($room, $user);

            return response()->json([
                'message' => 'Вы покинули матч.',
            ]);
        }

        $wasHost = $room->host_user_id === $user->id;
        $member->delete();

        if ($room->members()->count() === 0) {
            $room->update(['status' => LobbyRoom::STATUS_CANCELLED]);
        } else {
            $updates = ['status' => LobbyRoom::STATUS_WAITING];

            if ($wasHost) {
                $newHost = $room->members()->orderBy('created_at')->first();
                if ($newHost) {
                    $updates['host_user_id'] = $newHost->user_id;
                }
            }

            $room->update($updates);
        }

        broadcast(new LobbyLeft($room, $user))->toOthers();

        return response()->json([
            'message' => 'Вы покинули лобби.',
        ]);
    }

    public function ready(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ready' => 'required|boolean',
        ]);

        $user = $request->user();

        $member = LobbyMember::where('user_id', $user->id)
            ->whereHas('room', function ($q) {
                $q->whereIn('status', [LobbyRoom::STATUS_WAITING, LobbyRoom::STATUS_READY]);
            })
            ->first();

        if (!$member) {
            return response()->json([
                'message' => 'Вы не находитесь в лобби.',
            ], 400);
        }

        $member->update(['ready' => $validated['ready']]);

        $room = $member->room->fresh(['members.user.profile']);

        if ($room->allReady()) {
            $room->update(['status' => LobbyRoom::STATUS_READY]);
        } else {
            $room->update(['status' => LobbyRoom::STATUS_WAITING]);
        }

        broadcast(new LobbyReady($room, $user, $validated['ready']))->toOthers();

        return response()->json([
            'room' => $this->formatRoom($room->fresh(['members.user.profile'])),
        ]);
    }

    public function setDeck(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'faction' => 'required|string|in:realms,nilfgaard,monsters,scoiatael,skellige',
            'leader_id' => 'required|integer',
            'cards' => 'required|array|min:1',
            'cards.*' => 'array|size:2',
        ]);

        // Честный PvP: правила колоды проверяются на сервере (канон DeckMaker)
        try {
            $normalized = DeckValidator::validate(
                $validated['faction'],
                (int) $validated['leader_id'],
                $validated['cards']
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $user = $request->user();

        $member = LobbyMember::where('user_id', $user->id)
            ->whereHas('room', function ($q) {
                $q->whereIn('status', [LobbyRoom::STATUS_WAITING, LobbyRoom::STATUS_READY]);
            })
            ->first();

        if (!$member) {
            return response()->json([
                'message' => 'Вы не находитесь в лобби.',
            ], 400);
        }

        $member->update([
            'deck_faction' => $normalized['faction'],
            'deck_leader_id' => $normalized['leader_id'],
            'deck_cards' => $normalized['cards'],
            'ready' => false,
        ]);

        $room = $member->room->fresh(['members.user.profile']);

        if ($room->status === LobbyRoom::STATUS_READY) {
            $room->update(['status' => LobbyRoom::STATUS_WAITING]);
            $room = $room->fresh(['members.user.profile']);
        }

        return response()->json([
            'message' => 'Колода сохранена.',
            'room' => $this->formatRoom($room),
        ]);
    }

    public function current(Request $request): JsonResponse
    {
        $user = $request->user();

        $member = LobbyMember::where('user_id', $user->id)
            ->whereHas('room', function ($q) {
                $q->whereIn('status', [
                    LobbyRoom::STATUS_WAITING,
                    LobbyRoom::STATUS_READY,
                    LobbyRoom::STATUS_STARTED,
                ]);
            })
            ->with(['room.members.user.profile', 'room.invite'])
            ->first();

        if (!$member) {
            return response()->json([
                'room' => null,
            ]);
        }

        return response()->json([
            'room' => $this->formatRoom($member->room),
            'room_code' => $member->room->invite?->room_code,
        ]);
    }

    private function formatRoom(LobbyRoom $room): array
    {
        return [
            'id' => $room->id,
            'status' => $room->status,
            'is_private' => $room->is_private,
            'host_user_id' => $room->host_user_id,
            'max_players' => $room->max_players,
            'members' => $room->members->map(function ($member) {
                return [
                    'user_id' => $member->user_id,
                    'nickname' => $member->user->profile->nickname ?? 'Unknown',
                    'avatar_url' => $member->user->profile->avatar_url ?? null,
                    'ready' => $member->ready,
                    'has_deck' => !empty($member->deck_cards),
                    'deck_faction' => $member->deck_faction,
                    'deck_leader_id' => $member->deck_leader_id,
                ];
            }),
            'created_at' => $room->created_at,
        ];
    }

    private function cleanupStaleMemberships(int $userId): void
    {
        $memberships = LobbyMember::where('user_id', $userId)
            ->whereHas('room', function ($q) {
                $q->whereIn('status', [
                    LobbyRoom::STATUS_STARTED,
                    LobbyRoom::STATUS_CANCELLED,
                ]);
            })
            ->with('room')
            ->get();

        foreach ($memberships as $membership) {
            if ($membership->room->status === LobbyRoom::STATUS_STARTED) {
                $this->forfeitStartedRoom($membership->room, $userId);
                continue;
            }

            $membership->delete();
        }
    }

    private function forfeitStartedRoom(LobbyRoom $room, int $loserUserId, ?User $initiator = null): void
    {
        $match = GameMatch::where('lobby_room_id', $room->id)
            ->where('status', GameMatch::STATUS_IN_PROGRESS)
            ->first();

        if ($match) {
            $this->matchFlow->forfeitMatch($match, $loserUserId);
        } else {
            LobbyMember::where('room_id', $room->id)->delete();
            $room->update(['status' => LobbyRoom::STATUS_CANCELLED]);
        }

        if ($initiator) {
            broadcast(new LobbyLeft($room->fresh(), $initiator))->toOthers();
        }
    }

    private function abandonRoom(LobbyRoom $room, ?User $initiator = null): void
    {
        if ($initiator) {
            $this->forfeitStartedRoom($room, $initiator->id, $initiator);
            return;
        }

        $match = GameMatch::where('lobby_room_id', $room->id)
            ->where('status', GameMatch::STATUS_IN_PROGRESS)
            ->first();

        if ($match) {
            $firstMember = $room->members()->orderBy('created_at')->first();
            $loserId = $firstMember?->user_id ?? $match->players()->first()?->user_id;
            if ($loserId) {
                $this->matchFlow->forfeitMatch($match, $loserId);
            }
        } else {
            LobbyMember::where('room_id', $room->id)->delete();
            $room->update(['status' => LobbyRoom::STATUS_CANCELLED]);
        }
    }

    private function abandonOrphanMatch(int $userId): void
    {
        $player = MatchPlayer::where('user_id', $userId)
            ->whereHas('match', fn($q) => $q->where('status', GameMatch::STATUS_IN_PROGRESS))
            ->with('match')
            ->first();

        if (!$player) {
            return;
        }

        $this->matchFlow->forfeitMatch($player->match, $userId);
    }
}
