<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GwentAbilityData;
use App\Services\GwentCardData;
use Illuminate\Http\JsonResponse;

class CardsController extends Controller
{
    public function index(): JsonResponse
    {
        $abilities = GwentAbilityData::all();
        $cards = [];
        foreach (GwentCardData::all() as $index => $card) {
            $cards[] = array_merge(['index' => $index], $card, [
                'ability_descriptions' => array_intersect_key(
                    $abilities,
                    array_flip($card['abilities'] ?? [])
                ),
            ]);
        }

        return response()->json([
            'count' => count($cards),
            'cards' => $cards,
            'abilities' => $abilities,
        ]);
    }
}
