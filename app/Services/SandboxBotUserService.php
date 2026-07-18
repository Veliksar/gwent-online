<?php

namespace App\Services;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SandboxBotUserService
{
    public function botUserId(): int
    {
        return $this->resolveBotUser()->id;
    }

    public function resolveBotUser(): User
    {
        $email = (string) config('gwent.sandbox_bot_email', 'sandbox-bot@gwent.local');

        $user = User::firstOrCreate(
            ['email' => $email],
            ['password' => Hash::make(Str::random(32))]
        );

        Profile::firstOrCreate(
            ['user_id' => $user->id],
            [
                'nickname' => (string) config('gwent.sandbox_bot_nickname', 'Dev Bot'),
                'favorite_faction' => 'realms',
            ]
        );

        return $user->fresh(['profile']);
    }
}
