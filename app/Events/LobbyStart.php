<?php

namespace App\Events;

use App\Models\GameMatch;
use App\Models\LobbyRoom;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LobbyStart implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public LobbyRoom $room,
        public GameMatch $match
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('lobby.' . $this->room->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'lobby.start';
    }

    public function broadcastWith(): array
    {
        return [
            'match_id' => $this->match->id,
        ];
    }
}
