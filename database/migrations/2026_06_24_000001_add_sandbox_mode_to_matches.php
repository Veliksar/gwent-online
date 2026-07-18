<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE matches MODIFY COLUMN mode ENUM('bot', 'pvp', 'sandbox') NOT NULL DEFAULT 'pvp'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE matches MODIFY COLUMN mode ENUM('bot', 'pvp') NOT NULL DEFAULT 'pvp'");
    }
};
