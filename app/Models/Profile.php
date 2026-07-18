<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'nickname',
        'avatar_url',
        'favorite_faction',
        'wins',
        'losses',
        'draws',
    ];

    protected $casts = [
        'wins' => 'integer',
        'losses' => 'integer',
        'draws' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function totalGames(): int
    {
        return $this->wins + $this->losses + $this->draws;
    }

    public function winRate(): float
    {
        $total = $this->totalGames();
        return $total > 0 ? round(($this->wins / $total) * 100, 2) : 0;
    }
}
