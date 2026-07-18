<?php

namespace App\Console\Commands;

use App\Models\LobbyMember;
use App\Models\LobbyRoom;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupStaleLobbies extends Command
{
    protected $signature = 'gwent:cleanup-lobbies';

    protected $description = 'Cancel waiting lobby rooms older than configured TTL';

    public function handle(): int
    {
        $hours = (int) config('gwent.lobby_waiting_ttl_hours', 2);
        $cutoff = now()->subHours($hours);

        $rooms = LobbyRoom::where('status', LobbyRoom::STATUS_WAITING)
            ->where('updated_at', '<', $cutoff)
            ->pluck('id');

        if ($rooms->isEmpty()) {
            $this->info('No stale waiting rooms found.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($rooms) {
            LobbyMember::whereIn('room_id', $rooms)->delete();
            LobbyRoom::whereIn('id', $rooms)->update(['status' => LobbyRoom::STATUS_CANCELLED]);
        });

        $this->info('Cancelled '.$rooms->count().' stale waiting room(s).');

        return self::SUCCESS;
    }
}
