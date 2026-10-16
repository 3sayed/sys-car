<?php

return [
    'ai_key' => env('OPENAI_API_KEY'),
    'ai_model' => env('OPENAI_MODEL', 'gpt-4.1-mini'),
    'simulation_url' => env('SIMULATION_ENGINE_URL', 'http://127.0.0.1:8090'),
    'simulation_token' => env('SIMULATION_ENGINE_TOKEN'),
    'asset_disk' => env('ASSET_DISK', 'public'),
    'simulation_disk' => env('SIMULATION_DISK', 'local'),
];
