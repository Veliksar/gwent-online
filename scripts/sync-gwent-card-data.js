"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const cardsJs = fs.readFileSync(path.join(root, "public/cards.js"), "utf8");
const cardDict = Function(cardsJs + "; return card_dict;")();

function phpString(value) {
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function parseAbilities(ability) {
  if (!ability || ability.trim() === "") {
    return [];
  }
  return ability.trim().split(/\s+/);
}

function parseStrength(strength, deck, row) {
  if (strength === "" || strength === null || strength === undefined) {
    return 0;
  }
  const parsed = Number(strength);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return 0;
}

const lines = [];
lines.push("<?php");
lines.push("");
lines.push("namespace App\\Services;");
lines.push("");
lines.push("class GwentCardData");
lines.push("{");
lines.push("    private static array $cards = [];");
lines.push("");
lines.push("    public static function all(): array");
lines.push("    {");
lines.push("        if (empty(self::$cards)) {");
lines.push("            self::$cards = self::build();");
lines.push("        }");
lines.push("        return self::$cards;");
lines.push("    }");
lines.push("");
lines.push("    public static function get(int $index): ?array");
lines.push("    {");
lines.push("        $all = self::all();");
lines.push("        return $all[$index] ?? null;");
lines.push("    }");
lines.push("");
lines.push("    public static function getByName(string $name): array");
lines.push("    {");
lines.push("        return array_values(array_filter(self::all(), fn($c) => $c['name'] === $name));");
lines.push("    }");
lines.push("");
lines.push("    public static function getIndicesForFaction(string $faction): array");
lines.push("    {");
lines.push("        $all = self::all();");
lines.push("        $result = [];");
lines.push("        foreach ($all as $i => $card) {");
lines.push("            if ($card['deck'] === $faction || $card['deck'] === 'neutral') {");
lines.push("                $result[] = $i;");
lines.push("            }");
lines.push("        }");
lines.push("        return $result;");
lines.push("    }");
lines.push("");
lines.push("    public static function getLeadersForFaction(string $faction): array");
lines.push("    {");
lines.push("        $all = self::all();");
lines.push("        $result = [];");
lines.push("        foreach ($all as $i => $card) {");
lines.push("            if ($card['deck'] === $faction && $card['row'] === 'leader') {");
lines.push("                $result[] = array_merge(['index' => $i], $card);");
lines.push("            }");
lines.push("        }");
lines.push("        return $result;");
lines.push("    }");
lines.push("");
lines.push("    public static function getDefaultDeck(string $faction): array");
lines.push("    {");
lines.push("        $defaults = self::defaultDecks();");
lines.push("        return $defaults[$faction] ?? $defaults['realms'];");
lines.push("    }");
lines.push("");
lines.push("    private static function defaultDecks(): array");
lines.push("    {");
lines.push("        return [");
lines.push("            'realms' => [");
lines.push("                'faction' => 'realms',");
lines.push("                'leader_index' => 24,");
lines.push("                'cards' => [");
lines.push("                    [24, 1], [5, 1], [1, 3], [2, 1], [3, 1], [8, 1],");
lines.push("                    [33, 1], [34, 1], [39, 1], [51, 1], [29, 2], [12, 1],");
lines.push("                    [14, 1], [15, 1], [27, 1], [17, 1], [45, 1], [54, 1],");
lines.push("                    [55, 1], [30, 3], [32, 1], [41, 1], [28, 3], [19, 3],");
lines.push("                    [47, 1], [6, 1], [18, 1], [49, 1], [0, 1],");
lines.push("                ],");
lines.push("            ],");
lines.push("            'nilfgaard' => [");
lines.push("                'faction' => 'nilfgaard',");
lines.push("                'leader_index' => 59,");
lines.push("                'cards' => [");
lines.push("                    [59, 1], [5, 1], [1, 3], [10, 1], [2, 1], [4, 1],");
lines.push("                    [9, 1], [11, 1], [3, 1], [8, 1], [63, 1], [64, 1],");
lines.push("                    [70, 1], [73, 1], [75, 1], [84, 1], [81, 1], [14, 1],");
lines.push("                    [15, 1], [17, 1], [90, 1], [91, 1], [19, 3], [88, 1],");
lines.push("                    [71, 4], [6, 1], [18, 1], [67, 1], [68, 1], [0, 1], [83, 1],");
lines.push("                ],");
lines.push("            ],");
lines.push("            'monsters' => [");
lines.push("                'faction' => 'monsters',");
lines.push("                'leader_index' => 93,");
lines.push("                'cards' => [");
lines.push("                    [93, 1], [5, 1], [1, 3], [10, 1], [4, 1], [9, 1],");
lines.push("                    [11, 1], [3, 1], [8, 1], [124, 1], [125, 1], [138, 1],");
lines.push("                    [14, 1], [15, 1], [101, 1], [105, 1], [106, 1], [107, 1],");
lines.push("                    [17, 1], [135, 1], [98, 1], [99, 1], [100, 1], [102, 1],");
lines.push("                    [19, 3], [131, 1], [132, 1], [133, 1], [134, 1], [6, 1],");
lines.push("                    [18, 1], [127, 1], [128, 1], [129, 1], [0, 1],");
lines.push("                ],");
lines.push("            ],");
lines.push("            'scoiatael' => [");
lines.push("                'faction' => 'scoiatael',");
lines.push("                'leader_index' => 141,");
lines.push("                'cards' => [");
lines.push("                    [141, 1], [5, 1], [1, 3], [10, 1], [2, 1], [4, 1],");
lines.push("                    [9, 1], [11, 1], [3, 1], [8, 1], [167, 1], [173, 1],");
lines.push("                    [213, 1], [14, 1], [15, 1], [148, 1], [17, 1], [162, 1],");
lines.push("                    [163, 1], [164, 1], [19, 3], [144, 1], [151, 1], [152, 1],");
lines.push("                    [153, 1], [6, 1], [18, 1], [159, 1], [160, 1], [0, 1],");
lines.push("                ],");
lines.push("            ],");
lines.push("            'skellige' => [");
lines.push("                'faction' => 'skellige',");
lines.push("                'leader_index' => 211,");
lines.push("                'cards' => [");
lines.push("                    [211, 1], [5, 1], [202, 1], [10, 1], [2, 1], [204, 1],");
lines.push("                    [11, 1], [3, 1], [8, 1], [203, 1], [184, 1], [195, 1],");
lines.push("                    [14, 1], [15, 1], [192, 3], [186, 1], [17, 1], [187, 1],");
lines.push("                    [188, 1], [189, 1], [200, 3], [182, 1], [6, 1], [210, 3],");
lines.push("                    [199, 1], [0, 1],");
lines.push("                ],");
lines.push("            ],");
lines.push("        ];");
lines.push("    }");
lines.push("");
lines.push("    private static function build(): array");
lines.push("    {");
lines.push("        return [");

for (let i = 0; i < cardDict.length; i++) {
  const card = cardDict[i];
  const abilities = parseAbilities(card.ability);
  const strength = parseStrength(card.strength, card.deck, card.row);
  const abilityList = abilities.length
    ? `[${abilities.map((a) => phpString(a)).join(", ")}]`
    : "[]";

  lines.push(
    `            ${i}  => ['name' => ${phpString(card.name)}, 'id' => ${phpString(card.id ?? "")}, 'deck' => ${phpString(card.deck)}, 'row' => ${phpString(card.row ?? "")}, 'strength' => ${strength}, 'abilities' => ${abilityList}, 'filename' => ${phpString(card.filename)}, 'count' => ${Number(card.count) || 0}],`
  );
}

lines.push("        ];");
lines.push("    }");
lines.push("}");

const outPath = path.join(root, "app/Services/GwentCardData.php");
fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
console.log(`Wrote ${cardDict.length} cards to ${outPath}`);
