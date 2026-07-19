<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDeck extends Model
{
    protected $fillable = [
        'user_id',
        'faction',
        'leader_id',
        'cards',
        'is_active',
    ];

    protected $casts = [
        'cards' => 'array',
        'is_active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
