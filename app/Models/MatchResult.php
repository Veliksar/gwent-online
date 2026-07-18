<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchResult extends Model
{
    use HasFactory;

    protected $fillable = [
        'match_id',
        'winner_user_id',
        'loser_user_id',
        'is_draw',
        'winner_rounds',
        'loser_rounds',
        'total_rounds',
        'duration_seconds',
    ];

    protected $casts = [
        'is_draw' => 'boolean',
        'winner_rounds' => 'integer',
        'loser_rounds' => 'integer',
        'total_rounds' => 'integer',
        'duration_seconds' => 'integer',
    ];

    public function match(): BelongsTo
    {
        return $this->belongsTo(GameMatch::class, 'match_id');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'winner_user_id');
    }

    public function loser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'loser_user_id');
    }
}
