<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LobbyMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_id',
        'user_id',
        'ready',
        'deck_faction',
        'deck_leader_id',
        'deck_cards',
    ];

    protected $casts = [
        'ready' => 'boolean',
        'deck_cards' => 'array',
    ];

    public function resolvedDeck(): array
    {
        return [
            'deck_faction' => $this->deck_faction ?? 'realms',
            'deck_leader_id' => $this->deck_leader_id ?? 24,
            'deck_cards' => $this->deck_cards ?? [
                [5, 1], [1, 3], [2, 1], [3, 1], [8, 1], [33, 1], [34, 1], [39, 1], [51, 1], [29, 2],
                [12, 1], [14, 1], [15, 1], [27, 1], [17, 1], [45, 1], [54, 1], [55, 1], [30, 3], [32, 1],
                [41, 1], [28, 3], [19, 3], [47, 1], [6, 1], [18, 1], [49, 1], [0, 1],
            ],
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(LobbyRoom::class, 'room_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
