<?php

namespace App\Events;

use App\Models\LobbyRoom;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LobbyJoined implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public LobbyRoom $room,
        public User $user
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('lobby.' . $this->room->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'lobby.joined';
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->user->id,
            'nickname' => $this->user->profile->nickname ?? 'Unknown',
            'avatar_url' => $this->user->profile->avatar_url ?? null,
        ];
    }
}
