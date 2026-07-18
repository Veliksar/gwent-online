"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const canon = Function(
  fs.readFileSync(path.join(root, "public/cards.js"), "utf8") + "; return card_dict;"
)();

const phpLines = fs.readFileSync(path.join(root, "app/Services/GwentCardData.php"), "utf8").split(/\r?\n/);
const phpCards = {};
let currentIdx = null;
let buffer = "";

for (const line of phpLines) {
  const start = line.match(/^\s*(\d+)\s*=>\s*\[/);
  if (start) {
    if (currentIdx !== null && buffer) {
      phpCards[currentIdx] = buffer;
    }
    currentIdx = parseInt(start[1], 10);
    buffer = line;
    continue;
  }
  if (currentIdx !== null) {
    buffer += "\n" + line;
    if (line.trim() === "]," || line.trim().endsWith("],")) {
      phpCards[currentIdx] = buffer;
      currentIdx = null;
      buffer = "";
    }
  }
}

if (currentIdx !== null && buffer) {
  phpCards[currentIdx] = buffer;
}

function parsePhpBlock(block) {
  const filename = block.match(/'filename'\s*=>\s*'([^']+)'/)?.[1] ?? "";
  const nameMatch = block.match(/'name'\s*=>\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)")/);
  const name = (nameMatch?.[1] ?? nameMatch?.[2] ?? "").replace(/\\'/g, "'");
  const deck = block.match(/'deck'\s*=>\s*'([^']+)'/)?.[1] ?? "";
  const row = block.match(/'row'\s*=>\s*'([^']*)'/)?.[1] ?? "";
  const strength = Number(block.match(/'strength'\s*=>\s*(\d+)/)?.[1] ?? 0);
  const count = Number(block.match(/'count'\s*=>\s*(\d+)/)?.[1] ?? 0);
  const id = block.match(/'id'\s*=>\s*'([^']*)'/)?.[1] ?? "";
  const ab = [...(block.match(/'abilities'\s*=>\s*\[([^\]]*)\]/)?.[1] ?? "").matchAll(/'([^']+)'/g)].map((x) => x[1]);
  return { name, id, deck, row, strength, filename, count, abilities: ab };
}

function parseAbilities(ability) {
  const trimmed = (ability || "").trim();
  return trimmed ? trimmed.split(/\s+/) : [];
}

function parseStrength(strength) {
  return strength === "" ? 0 : Number(strength);
}

const mismatches = [];
for (let i = 0; i < canon.length; i++) {
  const c = canon[i];
  const p = parsePhpBlock(phpCards[i] ?? "");
  const expected = {
    name: c.name,
    id: c.id ?? "",
    deck: c.deck,
    row: c.row || "",
    strength: parseStrength(c.strength),
    filename: c.filename,
    count: Number(c.count),
    abilities: parseAbilities(c.ability),
  };

  if (!phpCards[i] || JSON.stringify(p) !== JSON.stringify(expected)) {
    mismatches.push({ index: i, expected, actual: p });
  }
}

console.log(
  JSON.stringify(
    {
      canonCount: canon.length,
      phpCount: Object.keys(phpCards).length,
      mismatchCount: mismatches.length,
      sampleMismatch: mismatches[0] ?? null,
    },
    null,
    2
  )
);

process.exit(mismatches.length === 0 ? 0 : 1);
