<?php

namespace App\Events;

use App\Models\GameMatch;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchState implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public GameMatch $match,
        public array $state
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('match.' . $this->match->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'match.state';
    }

    public function broadcastWith(): array
    {
        return [
            'match_id' => $this->match->id,
            'state' => $this->state,
        ];
    }
}
