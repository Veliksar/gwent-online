<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'nickname' => fake()->unique()->userName(),
            'avatar_url' => null,
            'favorite_faction' => fake()->randomElement(['realms', 'nilfgaard', 'monsters', 'scoiatael', 'skellige']),
            'wins' => fake()->numberBetween(0, 100),
            'losses' => fake()->numberBetween(0, 100),
            'draws' => fake()->numberBetween(0, 20),
        ];
    }
}
