<?php

namespace Database\Seeders;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        Profile::create([
            'user_id' => $user->id,
            'nickname' => 'TestPlayer',
            'wins' => 10,
            'losses' => 5,
            'draws' => 2,
        ]);
    }
}
