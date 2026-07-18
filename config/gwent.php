<?php

return [
    'turn_timeout_seconds' => (int) env('GWENT_TURN_TIMEOUT_SECONDS', 180),
    'lobby_waiting_ttl_hours' => (int) env('GWENT_LOBBY_WAITING_TTL_HOURS', 2),

    'developer_mode_enabled' => (bool) env('GWENT_DEVELOPER_MODE', env('APP_ENV') === 'local'),
    'sandbox_bot_email' => env('GWENT_SANDBOX_BOT_EMAIL', 'sandbox-bot@gwent.local'),
    'sandbox_bot_nickname' => env('GWENT_SANDBOX_BOT_NICKNAME', 'Dev Bot'),
    'sandbox_reveal_bot_hand' => (bool) env('GWENT_SANDBOX_REVEAL_BOT_HAND', true),
    'legacy_ai_node_path' => env('GWENT_LEGACY_AI_NODE', 'node'),
    'legacy_ai_script' => base_path('scripts/legacy-ai/decide.mjs'),
    'legacy_ai_timeout_seconds' => (int) env('GWENT_LEGACY_AI_TIMEOUT', 5),
];
