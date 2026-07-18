<?php

namespace App\Events;

use App\Models\GameMatch;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchGameEnd implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public GameMatch $match
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('match.' . $this->match->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'match.game_end';
    }

    public function broadcastWith(): array
    {
        $result = $this->match->result;
        
        return [
            'winner_id' => $result?->winner_user_id,
            'is_draw' => $result?->is_draw ?? false,
            'winner_rounds' => $result?->winner_rounds ?? 0,
            'loser_rounds' => $result?->loser_rounds ?? 0,
            'cancelled' => $this->match->status === GameMatch::STATUS_CANCELLED,
        ];
    }
}
