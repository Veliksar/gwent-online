<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class GameMatch extends Model
{
    use HasFactory;

    protected $table = 'matches';

    const STATUS_LOBBY = 'lobby';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_FINISHED = 'finished';
    const STATUS_CANCELLED = 'cancelled';

    const MODE_BOT = 'bot';
    const MODE_PVP = 'pvp';
    const MODE_SANDBOX = 'sandbox';

    public function isSandbox(): bool
    {
        return $this->mode === self::MODE_SANDBOX;
    }

    protected $fillable = [
        'lobby_room_id',
        'mode',
        'status',
        'current_round',
        'current_player_id',
        'state_snapshot',
        'turn_started_at',
    ];

    protected $casts = [
        'current_round' => 'integer',
        'state_snapshot' => 'array',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'turn_started_at' => 'datetime',
    ];

    public function lobbyRoom(): BelongsTo
    {
        return $this->belongsTo(LobbyRoom::class);
    }

    public function players(): HasMany
    {
        return $this->hasMany(MatchPlayer::class, 'match_id');
    }

    public function currentPlayer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'current_player_id');
    }

    public function result(): HasOne
    {
        return $this->hasOne(MatchResult::class, 'match_id');
    }

    public function isInProgress(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    public function isFinished(): bool
    {
        return $this->status === self::STATUS_FINISHED;
    }
}
