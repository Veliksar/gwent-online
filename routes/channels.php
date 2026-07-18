<?php

use App\Models\LobbyMember;
use App\Models\MatchPlayer;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('lobby.{roomId}', function ($user, $roomId) {
    return LobbyMember::where('room_id', $roomId)
        ->where('user_id', $user->id)
        ->exists();
});

Broadcast::channel('match.{matchId}', function ($user, $matchId) {
    return MatchPlayer::where('match_id', $matchId)
        ->where('user_id', $user->id)
        ->exists();
});

Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});
