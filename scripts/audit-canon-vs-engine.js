"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const cardsJs = fs.readFileSync(path.join(root, "public/cards.js"), "utf8");
const canonCards = Function(`${cardsJs}; return card_dict;`)();

const php = fs.readFileSync(path.join(root, "app/Services/GwentCardData.php"), "utf8");
const abJs = fs.readFileSync(path.join(root, "public/abilities.js"), "utf8");
const engine = fs.readFileSync(path.join(root, "app/Services/GwentEngine.php"), "utf8");

const phpIndices = [...php.matchAll(/^\s*(\d+)\s*=>\s*\[/gm)]
  .map((m) => parseInt(m[1], 10))
  .sort((a, b) => a - b);

const canonCount = canonCards.length;
const missingInPhp = [];
const mismatchedCards = [];

function parseAbilityString(s) {
  if (!s) return [];
  return s.trim().split(/\s+/).filter(Boolean);
}

function getPhpCard(idx) {
  const re = new RegExp(`^\\s*${idx}\\s*=>\\s*\\[([\\s\\S]*?)\\n\\s*\\],`, "m");
  const m = php.match(re);
  if (!m) return null;
  const block = m[1];
  const get = (key) => {
    const km = block.match(new RegExp(`'${key}'\\s*=>\\s*(?:'((?:\\\\'|[^'])*)'|"((?:\\\\"|[^"])*)")`));
    if (!km) return null;
    return (km[1] ?? km[2] ?? "").replace(/\\'/g, "'");
  };
  const abMatch = block.match(/'abilities'\s*=>\s*\[([^\]]*)\]/);
  const abilities = abMatch
    ? [...abMatch[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
    : [];
  return {
    name: get("name"),
    deck: get("deck"),
    row: get("row"),
    strength: get("strength"),
    filename: get("filename"),
    abilities,
  };
}

for (let idx = 0; idx < canonCount; idx++) {
  if (!phpIndices.includes(idx)) {
    missingInPhp.push(idx);
    continue;
  }
  const canon = canonCards[idx];
  const phpCard = getPhpCard(idx);
  if (!phpCard) continue;

  const canonAb = parseAbilityString(canon.ability).sort();
  const phpAb = [...phpCard.abilities].sort();

  const normStrength = (v) => {
    const n = String(v ?? "").trim();
    return n === "" ? "0" : n;
  };

  const fields = [];
  if ((canon.name || "").trim() !== (phpCard.name || "").trim()) fields.push("name");
  if ((canon.deck || "") !== (phpCard.deck || "")) fields.push("deck");
  if ((canon.row || "") !== (phpCard.row || "")) fields.push("row");
  if (normStrength(canon.strength) !== normStrength(phpCard.strength)) fields.push("strength");
  if ((canon.filename || "") !== (phpCard.filename || "")) fields.push("filename");
  if (JSON.stringify(canonAb) !== JSON.stringify(phpAb)) fields.push("abilities");

  if (fields.length) {
    mismatchedCards.push({
      idx,
      fields,
      canon: {
        name: canon.name,
        deck: canon.deck,
        row: canon.row,
        strength: canon.strength,
        ability: canon.ability,
        filename: canon.filename,
      },
      php: phpCard,
    });
  }
}

const extraInPhp = phpIndices.filter((i) => i >= canonCount);

const abilityKeys = [...abJs.matchAll(/^[\t ]*([a-z_]+)\s*:\s*\{/gm)].map((m) => m[1]);

const skelligeRange = [];
for (let i = 0; i < canonCount; i++) {
  if (canonCards[i].deck === "skellige" || canonCards[i].ability?.includes("mardroeme") || canonCards[i].ability === "rain fog") {
    skelligeRange.push(i);
  }
}

const dlcNeutral = [];
for (let i = 0; i < canonCount; i++) {
  const c = canonCards[i];
  if (
    ["Emiel", "Olgierd", "Gaunter", "Cow", "Bovine", "Schirru"].some((s) => c.name.startsWith(s)) ||
    c.ability === "avenger" ||
    c.ability === "foltest_son" ||
    c.ability === "emhyr_invader" ||
    c.ability === "eredin_treacherous" ||
    c.ability === "francesca_hope"
  ) {
    dlcNeutral.push({ idx: i, name: c.name, deck: c.deck });
  }
}

function engineStatus(key) {
  const cardMechanics = [
    "clear", "frost", "fog", "rain", "storm", "decoy", "horn", "mardroeme", "berserker",
    "scorch", "scorch_c", "scorch_r", "scorch_s", "agile", "muster", "spy", "medic",
    "morale", "bond", "avenger", "avenger_kambi", "hero",
  ];
  const leaders = abilityKeys.filter((k) =>
    /^(foltest_|emhyr_|eredin_|francesca_|crach_|king_bran)/.test(k)
  );

  if (key === "hero") {
    return engine.includes("'hero'") ? "partial" : "missing";
  }
  if (leaders.includes(key)) {
    return engine.includes("activateLeader") ? "missing" : "missing";
  }
  if (key === "storm") return engine.includes("'storm'") ? "ok" : "missing";
  if (key === "avenger" || key === "avenger_kambi") return engine.includes("avenger") ? "partial" : "missing";
  if (key === "mardroeme" || key === "berserker") {
    return engine.includes(`'${key}'`) ? "partial" : "missing";
  }
  if (key === "king_bran") return engine.includes("halfWeather") ? "partial" : "missing";
  if (key === "emhyr_invader") return engine.includes("randomRespawn") || engine.includes("random_respawn") ? "partial" : "missing";
  if (key === "eredin_treacherous") return engine.includes("doubleSpyPower") || engine.includes("double_spy") ? "partial" : "missing";
  if (key === "emhyr_whiteflame") return "missing";
  if (key === "francesca_daisy") return "missing";
  if (key === "decoy") {
    if (!engine.includes("'decoy'")) return "missing";
    return "partial";
  }
  if (key === "scorch" || key.startsWith("scorch_")) return "partial";
  if (key === "horn") {
    if (!engine.includes("'horn'")) return "missing";
    return engine.includes("card.abilities.includes(\"horn\")") || engine.includes("'horn'") ? "partial" : "partial";
  }
  if (cardMechanics.includes(key)) {
    return engine.includes(`'${key}'`) ? "ok" : "missing";
  }
  return "missing";
}

const abilityTable = abilityKeys.map((key) => ({
  key,
  engine: engineStatus(key),
}));

console.log(
  JSON.stringify(
    {
      summary: {
        canonCardCount: canonCount,
        phpCardCount: phpIndices.length,
        missingInPhpCount: missingInPhp.length,
        mismatchedCount: mismatchedCards.length,
        alignedCount: phpIndices.filter((i) => i < canonCount && !missingInPhp.includes(i) && !mismatchedCards.find((m) => m.idx === i)).length,
        skelligeIndicesCount: skelligeRange.length,
        abilityDictCount: abilityKeys.length,
      },
      missingInPhp,
      mismatchedCards: mismatchedCards.slice(0, 30),
      mismatchedAllCount: mismatchedCards.length,
      firstAlignedBreak: mismatchedCards[0]?.idx ?? null,
      abilityTable,
    },
    null,
    2
  )
);
