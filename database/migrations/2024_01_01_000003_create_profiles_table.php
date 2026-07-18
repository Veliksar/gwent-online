<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('nickname', 50)->unique();
            $table->string('avatar_url')->nullable();
            $table->string('favorite_faction', 20)->nullable();
            $table->unsignedInteger('wins')->default(0);
            $table->unsignedInteger('losses')->default(0);
            $table->unsignedInteger('draws')->default(0);
            $table->timestamps();

            $table->index(['wins', 'losses']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
