<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MatchResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = $user->profile;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'created_at' => $user->created_at,
            ],
            'profile' => [
                'nickname' => $profile->nickname,
                'avatar_url' => $profile->avatar_url,
                'favorite_faction' => $profile->favorite_faction,
                'wins' => $profile->wins,
                'losses' => $profile->losses,
                'draws' => $profile->draws,
                'total_games' => $profile->totalGames(),
                'win_rate' => $profile->winRate(),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nickname' => 'sometimes|string|min:3|max:50|unique:profiles,nickname,' . $request->user()->profile->id,
            'avatar_url' => 'sometimes|nullable|url|max:255',
            'favorite_faction' => 'sometimes|nullable|string|in:realms,nilfgaard,monsters,scoiatael,skellige',
        ]);

        $profile = $request->user()->profile;
        $profile->update($validated);

        return response()->json([
            'profile' => $profile->fresh(),
        ]);
    }

    public function matches(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $matches = MatchResult::with(['match', 'winner.profile', 'loser.profile'])
            ->where(function ($query) use ($user) {
                $query->where('winner_user_id', $user->id)
                    ->orWhere('loser_user_id', $user->id);
            })
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($result) use ($user) {
                $isWinner = $result->winner_user_id === $user->id;
                $opponent = $isWinner ? $result->loser : $result->winner;
                
                return [
                    'id' => $result->id,
                    'match_id' => $result->match_id,
                    'result' => $result->is_draw ? 'draw' : ($isWinner ? 'win' : 'loss'),
                    'rounds_won' => $isWinner ? $result->winner_rounds : $result->loser_rounds,
                    'rounds_lost' => $isWinner ? $result->loser_rounds : $result->winner_rounds,
                    'opponent' => $opponent ? [
                        'nickname' => $opponent->profile->nickname ?? 'Бот',
                        'avatar_url' => $opponent->profile->avatar_url ?? null,
                    ] : ['nickname' => 'Бот', 'avatar_url' => null],
                    'duration_seconds' => $result->duration_seconds,
                    'played_at' => $result->created_at,
                ];
            });

        return response()->json([
            'matches' => $matches,
        ]);
    }

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = $user->profile;

        $recentResults = MatchResult::where(function ($query) use ($user) {
            $query->where('winner_user_id', $user->id)
                ->orWhere('loser_user_id', $user->id);
        })
        ->orderBy('created_at', 'desc')
        ->limit(10)
        ->get();

        $streak = 0;
        $currentStreak = null;
        
        foreach ($recentResults as $result) {
            $isWin = $result->winner_user_id === $user->id && !$result->is_draw;
            
            if ($currentStreak === null) {
                $currentStreak = $isWin;
                $streak = 1;
            } elseif ($currentStreak === $isWin) {
                $streak++;
            } else {
                break;
            }
        }

        return response()->json([
            'total_games' => $profile->totalGames(),
            'wins' => $profile->wins,
            'losses' => $profile->losses,
            'draws' => $profile->draws,
            'win_rate' => $profile->winRate(),
            'current_streak' => [
                'type' => $currentStreak ? 'win' : 'loss',
                'count' => $streak,
            ],
            'favorite_faction' => $profile->favorite_faction,
        ]);
    }
}
