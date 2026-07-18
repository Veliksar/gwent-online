<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lobby_room_id')->nullable()->constrained('lobby_rooms')->onDelete('set null');
            $table->enum('mode', ['bot', 'pvp'])->default('pvp');
            $table->enum('status', ['lobby', 'in_progress', 'finished', 'cancelled'])->default('lobby');
            $table->unsignedTinyInteger('current_round')->default(1);
            $table->foreignId('current_player_id')->nullable()->constrained('users')->onDelete('set null');
            $table->json('state_snapshot')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index(['status', 'mode']);
        });

        Schema::create('match_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('deck_faction', 20);
            $table->unsignedInteger('deck_leader_id');
            $table->json('deck_cards');
            $table->unsignedTinyInteger('health')->default(2);
            $table->boolean('passed')->default(false);
            $table->unsignedInteger('round_score')->default(0);
            $table->timestamps();

            $table->unique(['match_id', 'user_id']);
        });

        Schema::create('match_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->onDelete('cascade');
            $table->foreignId('winner_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('loser_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->boolean('is_draw')->default(false);
            $table->unsignedTinyInteger('winner_rounds')->default(0);
            $table->unsignedTinyInteger('loser_rounds')->default(0);
            $table->unsignedTinyInteger('total_rounds')->default(0);
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->timestamps();

            $table->index('winner_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_results');
        Schema::dropIfExists('match_players');
        Schema::dropIfExists('matches');
    }
};
