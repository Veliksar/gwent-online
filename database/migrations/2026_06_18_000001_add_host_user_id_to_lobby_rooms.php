<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lobby_rooms', function (Blueprint $table) {
            $table->foreignId('host_user_id')->nullable()->after('is_private')->constrained('users')->nullOnDelete();
        });

        $rooms = DB::table('lobby_rooms')->whereNull('host_user_id')->pluck('id');

        foreach ($rooms as $roomId) {
            $hostUserId = DB::table('lobby_members')
                ->where('room_id', $roomId)
                ->orderBy('created_at')
                ->value('user_id');

            if ($hostUserId) {
                DB::table('lobby_rooms')
                    ->where('id', $roomId)
                    ->update(['host_user_id' => $hostUserId]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('lobby_rooms', function (Blueprint $table) {
            $table->dropConstrainedForeignId('host_user_id');
        });
    }
};
