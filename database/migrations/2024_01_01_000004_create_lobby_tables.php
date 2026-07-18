<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lobby_rooms', function (Blueprint $table) {
            $table->id();
            $table->enum('status', ['waiting', 'ready', 'started', 'cancelled'])->default('waiting');
            $table->unsignedTinyInteger('max_players')->default(2);
            $table->boolean('is_private')->default(false);
            $table->timestamps();

            $table->index('status');
        });

        Schema::create('lobby_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('lobby_rooms')->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->boolean('ready')->default(false);
            $table->string('deck_faction', 20)->nullable();
            $table->unsignedInteger('deck_leader_id')->nullable();
            $table->json('deck_cards')->nullable();
            $table->timestamps();

            $table->unique(['room_id', 'user_id']);
            $table->index(['user_id', 'ready']);
        });

        Schema::create('lobby_invites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('lobby_rooms')->onDelete('cascade');
            $table->string('room_code', 10)->unique();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index('room_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lobby_invites');
        Schema::dropIfExists('lobby_members');
        Schema::dropIfExists('lobby_rooms');
    }
};
