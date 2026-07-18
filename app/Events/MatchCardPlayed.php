<?php

namespace App\Events;

use App\Models\GameMatch;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchCardPlayed implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public GameMatch $match,
        public User $user,
        public array $cardData
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('match.' . $this->match->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'match.play_card';
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->user->id,
            'card_id' => $this->cardData['card_index'] ?? $this->cardData['card_id'] ?? null,
            'row' => $this->cardData['row'],
            'target_card_id' => $this->cardData['target_index'] ?? $this->cardData['target_card_id'] ?? null,
        ];
    }
}
