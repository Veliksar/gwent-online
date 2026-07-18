<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class LobbyRoom extends Model
{
    use HasFactory;

    const STATUS_WAITING = 'waiting';
    const STATUS_READY = 'ready';
    const STATUS_STARTED = 'started';
    const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'status',
        'max_players',
        'is_private',
        'host_user_id',
    ];

    protected $casts = [
        'max_players' => 'integer',
        'is_private' => 'boolean',
        'host_user_id' => 'integer',
    ];

    public function members(): HasMany
    {
        return $this->hasMany(LobbyMember::class, 'room_id')->orderBy('created_at');
    }

    public function isHost(int $userId): bool
    {
        if ($this->host_user_id !== null) {
            return $this->host_user_id === $userId;
        }

        $firstMember = $this->members()->orderBy('created_at')->first();

        return $firstMember !== null && $firstMember->user_id === $userId;
    }

    public function invite(): HasOne
    {
        return $this->hasOne(LobbyInvite::class, 'room_id');
    }

    public function match(): HasOne
    {
        return $this->hasOne(GameMatch::class, 'lobby_room_id');
    }

    public function isFull(): bool
    {
        return $this->members()->count() >= $this->max_players;
    }

    public function allReady(): bool
    {
        return $this->members()->where('ready', false)->count() === 0
            && $this->members()->count() === $this->max_players;
    }
}
