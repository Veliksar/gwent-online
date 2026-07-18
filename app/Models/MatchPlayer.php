<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchPlayer extends Model
{
    use HasFactory;

    protected $fillable = [
        'match_id',
        'user_id',
        'deck_faction',
        'deck_leader_id',
        'deck_cards',
        'health',
        'passed',
        'round_score',
    ];

    protected $casts = [
        'deck_cards' => 'array',
        'health' => 'integer',
        'passed' => 'boolean',
        'round_score' => 'integer',
    ];

    public function match(): BelongsTo
    {
        return $this->belongsTo(GameMatch::class, 'match_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
