<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CardsController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\LobbyController;
use App\Http\Controllers\Api\DeveloperSandboxController;
use App\Http\Controllers\Api\MatchController;
use Illuminate\Support\Facades\Route;

Route::get('/cards', [CardsController::class, 'index']);

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::get('/profile/matches', [ProfileController::class, 'matches']);
    Route::get('/profile/stats', [ProfileController::class, 'stats']);
    
    Route::prefix('lobby')->group(function () {
        Route::post('/join', [LobbyController::class, 'join']);
        Route::post('/join-by-code', [LobbyController::class, 'joinByCode']);
        Route::post('/create', [LobbyController::class, 'create']);
        Route::post('/leave', [LobbyController::class, 'leave']);
        Route::post('/ready', [LobbyController::class, 'ready']);
        Route::post('/set-deck', [LobbyController::class, 'setDeck']);
        Route::get('/current', [LobbyController::class, 'current']);
    });
    
    Route::prefix('match')->group(function () {
        Route::post('/start', [MatchController::class, 'start']);
        Route::post('/end', [MatchController::class, 'end']);
        Route::post('/bot-save', [MatchController::class, 'botSave']);
        Route::post('/play-card', [MatchController::class, 'playCard']);
        Route::post('/medic-resolve', [MatchController::class, 'medicResolve']);
        Route::post('/use-leader', [MatchController::class, 'useLeader']);
        Route::post('/choose-first', [MatchController::class, 'chooseFirst']);
        Route::post('/pass', [MatchController::class, 'pass']);
        Route::post('/redraw', [MatchController::class, 'redraw']);
        Route::post('/redraw-skip', [MatchController::class, 'redrawSkip']);
        Route::post('/sync-turn', [MatchController::class, 'syncTurn']);
        Route::get('/state', [MatchController::class, 'state']);
    });
    
    Route::get('/reconnect', [MatchController::class, 'reconnect']);

    Route::middleware('dev.mode')->prefix('sandbox')->group(function () {
        Route::get('/status', [DeveloperSandboxController::class, 'status']);
        Route::post('/start', [DeveloperSandboxController::class, 'start']);
        Route::post('/leave', [DeveloperSandboxController::class, 'leave']);
    });
});
