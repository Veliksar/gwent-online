<?php

namespace App\Services;

class GwentAbilityData
{
    private static array $abilities = [];

    public static function all(): array
    {
        if (empty(self::$abilities)) {
            self::$abilities = self::build();
        }
        return self::$abilities;
    }

    public static function get(string $key): ?array
    {
        return self::all()[$key] ?? null;
    }

    private static function build(): array
    {
        $path = base_path('public/abilities.js');
        $source = file_get_contents($path);
        if ($source === false) {
            return [];
        }

        $abilities = [];
        if (!preg_match_all(
            '/^\s*([a-z0-9_]+):\s*\{.*?description:\s*"((?:\\\\.|[^"\\\\])*)"/ms',
            $source,
            $matches,
            PREG_SET_ORDER
        )) {
            return [];
        }

        foreach ($matches as $match) {
            $key = $match[1];
            $description = stripcslashes($match[2]);
            $name = $key;

            if (preg_match(
                '/^\s*' . preg_quote($key, '/') . ':\s*\{\s*name:\s*"((?:\\\\.|[^"\\\\])*)"/m',
                $source,
                $nameMatch
            )) {
                $name = stripcslashes($nameMatch[1]);
            }

            $abilities[$key] = [
                'name' => $name,
                'description' => $description,
            ];
        }

        return $abilities;
    }
}
