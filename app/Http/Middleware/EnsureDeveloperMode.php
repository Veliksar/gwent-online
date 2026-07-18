<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDeveloperMode
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!config('gwent.developer_mode_enabled', false)) {
            return response()->json(['message' => 'Режим разработчика недоступен.'], 404);
        }

        return $next($request);
    }
}
