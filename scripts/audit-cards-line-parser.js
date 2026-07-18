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

function parsePhpBlock(block) {
  const filename = block.match(/'filename'\s*=>\s*'([^']+)'/)?.[1] ?? "";
  const nameMatch = block.match(/'name'\s*=>\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)")/);
  const name = (nameMatch?.[1] ?? nameMatch?.[2] ?? "").replace(/\\'/g, "'");
  const deck = block.match(/'deck'\s*=>\s*'([^']+)'/)?.[1] ?? "";
  const ab = [...(block.match(/'abilities'\s*=>\s*\[([^\]]*)\]/)?.[1] ?? "").matchAll(/'([^']+)'/g)].map((x) => x[1]);
  return { name, deck, filename, abilities: ab };
}

const parsed = {};
for (const [idx, block] of Object.entries(phpCards)) {
  parsed[idx] = parsePhpBlock(block);
}

const mismatches = [];
const matches = [];
for (let i = 0; i < canon.length; i++) {
  const c = canon[i];
  const p = parsed[i];
  if (!p) {
    mismatches.push({ idx: i, reason: "missing in php", canon: c.filename });
    continue;
  }
  if (c.filename !== p.filename) {
    mismatches.push({
      idx: i,
      canon: { name: c.name, filename: c.filename, ability: c.ability },
      php: p,
    });
  } else {
    matches.push(i);
  }
}

console.log(
  JSON.stringify(
    {
      phpCount: Object.keys(parsed).length,
      matchCount: matches.length,
      mismatchCount: mismatches.length,
      firstMismatchIdx: mismatches[0]?.idx ?? null,
      lastMatchIdx: matches[matches.length - 1] ?? null,
      mismatches,
      missingCanon144to213: canon.slice(144).length === 0 ? [] : canon.slice(144).map((c, off) => ({
        idx: off + 144,
        name: c.name,
        deck: c.deck,
        filename: c.filename,
        ability: c.ability || "",
      })),
    },
    null,
    2
  )
);
