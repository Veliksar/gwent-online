<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class LegacyAiBridge
{
    public function decide(array $stateSnapshot, int $botUserId, int $humanUserId): ?array
    {
        $script = (string) config('gwent.legacy_ai_script');
        if (!is_file($script)) {
            Log::warning('Legacy AI script not found', ['path' => $script]);
            return null;
        }

        $payload = json_encode([
            'state' => $stateSnapshot,
            'bot_user_id' => $botUserId,
            'human_user_id' => $humanUserId,
        ], JSON_THROW_ON_ERROR);

        $node = (string) config('gwent.legacy_ai_node_path', 'node');
        $timeout = (int) config('gwent.legacy_ai_timeout_seconds', 5);

        try {
            $result = Process::timeout($timeout)
                ->input($payload)
                ->run([$node, $script]);

            if (!$result->successful()) {
                Log::warning('Legacy AI process failed', [
                    'stderr' => $result->errorOutput(),
                    'stdout' => $result->output(),
                ]);
                return null;
            }

            $decoded = json_decode(trim($result->output()), true);
            if (!is_array($decoded) || !isset($decoded['action'])) {
                Log::warning('Legacy AI returned invalid payload', ['output' => $result->output()]);
                return null;
            }

            return $decoded;
        } catch (\Throwable $e) {
            Log::warning('Legacy AI bridge error', ['message' => $e->getMessage()]);
            return null;
        }
    }
}
