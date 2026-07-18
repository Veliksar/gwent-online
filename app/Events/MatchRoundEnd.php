<?php

namespace App\Events;

use App\Models\GameMatch;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchRoundEnd implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public GameMatch $match,
        public ?int $winnerId
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('match.' . $this->match->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'match.round_end';
    }

    public function broadcastWith(): array
    {
        $this->match->refresh();
        
        return [
            'round_winner_id' => $this->winnerId,
            'current_round' => $this->match->current_round,
            'players' => $this->match->players->map(fn($p) => [
                'user_id' => $p->user_id,
                'health' => $p->health,
            ]),
        ];
    }
}
