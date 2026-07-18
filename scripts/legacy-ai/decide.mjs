import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../../public')

function loadCardDict() {
  const cardsPath = path.join(publicDir, 'cards.js')
  const source = fs.readFileSync(cardsPath, 'utf8')
  const context = { card_dict: undefined }
  vm.createContext(context)
  vm.runInContext(source, context)
  const dict = {}
  context.card_dict.forEach((card, index) => {
    dict[index] = {
      ...card,
      strength: Number(card.strength || 0),
      abilities: (card.ability || '').split(/\s+/).filter(Boolean),
    }
  })
  return dict
}

function loadAbilityDict() {
  const abilitiesPath = path.join(publicDir, 'abilities.js')
  const source = fs.readFileSync(abilitiesPath, 'utf8')
  const match = source.match(/var ability_dict\s*=\s*(\{[\s\S]*?\n\});/)
  if (!match) {
    return {}
  }
  return eval(`(${match[1]})`)
}

function randomInt(max) {
  return Math.floor(Math.random() * max)
}

function rowKeyToIndex(row, isBot) {
  const base = isBot ? 0 : 3
  if (row === 'close') return base
  if (row === 'ranged') return base + 1
  return base + 2
}

function calcCardPower(card, rowWeather, horn, leaderHorn, mardroeme) {
  if (!card || card.row === 'weather' || card.row === 'leader') return 0
  let power = card.strength ?? 0
  if (card.abilities?.includes('hero')) return power
  if (rowWeather && !card.abilities?.includes('hero')) power = 1
  if (card.abilities?.includes('bond')) power *= 2
  if (card.abilities?.includes('morale')) power *= 2
  if (horn) power *= 2
  if (leaderHorn) power *= 2
  if (mardroeme && card.abilities?.includes('berserker')) {
    power = card.row === 'close' ? 14 : 8
  }
  return power
}

function buildContext(state, botUserId, humanUserId, cardDict) {
  const bot = state.players[botUserId]
  const human = state.players[humanUserId]
  const scores = {}
  for (const uid of [botUserId, humanUserId]) {
    scores[uid] = ['close', 'ranged', 'siege'].reduce((sum, row) => {
      const weather = state.weather?.[row]
      const horn = state.horns?.[`${uid}_${row}`]
      const leaderHorn = state.leader_horns?.[`${uid}_${row}`]
      const mardroeme = state.mardroeme_rows?.[`${uid}_${row}`]
      return sum + (state.players[uid].board[row] ?? []).reduce((rowSum, cardIndex) => {
        const card = cardDict[cardIndex]
        return rowSum + calcCardPower(card, weather, horn, leaderHorn, mardroeme)
      }, 0)
    }, 0)
  }

  const countGraveMeta = (grave) => {
    const data = { spy: [], medic: [], scorch: [], bond: {} }
    for (const cardIndex of grave ?? []) {
      const card = cardDict[cardIndex]
      if (!card || card.row === 'weather' || card.row === 'leader') continue
      for (const ability of card.abilities ?? []) {
        if (ability === 'spy' || ability === 'medic') data[ability].push(card)
        if (ability.startsWith('scorch_')) data.scorch.push(card)
        if (ability === 'bond') data.bond[card.name] = (data.bond[card.name] ?? 0) + 1
      }
    }
    return data
  }

  return {
    bot,
    human,
    botScore: scores[botUserId] ?? 0,
    humanScore: scores[humanUserId] ?? 0,
    botPassed: bot.passed ?? false,
    humanPassed: human.passed ?? false,
    botHealth: bot.health ?? 2,
    graveBot: countGraveMeta(bot.grave),
    graveHuman: countGraveMeta(human.grave),
    cardDict,
    state,
  }
}

function weightPass(ctx) {
  if (ctx.botHealth === 1) return 0
  const dif = ctx.humanScore - ctx.botScore
  if (dif > 30) return 100
  if (dif < -30 && (ctx.human.hand?.length ?? 0) - (ctx.bot.hand?.length ?? 0) > 2) return 100
  return Math.floor(Math.abs(dif))
}

function weightCard(ctx, cardIndex) {
  const card = ctx.cardDict[cardIndex]
  if (!card) return 0

  const name = card.name
  const abilities = card.abilities ?? []

  if (name === 'Decoy') {
    return ctx.graveBot.spy.length ? 50 : ctx.graveBot.medic.length ? 15 : ctx.graveBot.scorch.length ? 10 : 1
  }

  if (name === "Commander's Horn") {
    return 20
  }

  if (abilities.includes('scorch')) {
    return 15
  }

  if (card.row === 'weather') {
    return 10
  }

  if (abilities.includes('spy')) {
    return 15 + (card.strength ?? 0)
  }

  if (abilities.includes('medic')) {
    const units = (ctx.bot.grave ?? []).filter((ci) => {
      const c = ctx.cardDict[ci]
      return c && c.row !== 'weather' && c.row !== 'leader'
    })
    return units.length ? 20 : 1
  }

  if (abilities.includes('muster')) {
    return (card.strength ?? 0) * 3
  }

  return Math.max(1, card.strength ?? 1)
}

function pickRowForCard(ctx, cardIndex) {
  const card = ctx.cardDict[cardIndex]
  if (!card) return 'close'
  if (card.row === 'agile') return 'close'
  if (['close', 'ranged', 'siege'].includes(card.row)) return card.row
  if (card.abilities?.includes('spy')) {
    return 'close'
  }
  return 'close'
}

function decide(ctx, abilityDict) {
  if (ctx.botPassed) {
    return { action: 'pass' }
  }

  if (ctx.humanPassed && (ctx.botScore > ctx.humanScore || (ctx.bot.faction === 'nilfgaard' && ctx.botScore === ctx.humanScore))) {
    return { action: 'pass' }
  }

  if ((ctx.bot.redraw_remaining ?? 0) > 0 && (ctx.state.turn_number ?? 0) === 0) {
    return { action: 'redraw_skip' }
  }

  const weights = (ctx.bot.hand ?? []).map((cardIndex) => ({
    weight: weightCard(ctx, cardIndex),
    cardIndex,
  }))

  if (!ctx.bot.leader_used && !ctx.bot.leader_disabled) {
    weights.push({ weight: 12 + ((ctx.state.round ?? 1) - 1) * 15, cardIndex: null, leader: true })
  }

  weights.push({ weight: weightPass(ctx), pass: true })

  const total = weights.reduce((sum, item) => sum + Math.max(0, item.weight), 0)
  if (total <= 0) {
    return { action: 'pass' }
  }

  let rand = randomInt(total)
  let chosen = weights[weights.length - 1]
  for (const item of weights) {
    rand -= Math.max(0, item.weight)
    if (rand < 0) {
      chosen = item
      break
    }
  }

  if (chosen.pass) {
    return { action: 'pass' }
  }

  if (chosen.leader) {
    return { action: 'use_leader', choices: {} }
  }

  const row = pickRowForCard(ctx, chosen.cardIndex)
  return {
    action: 'play_card',
    card_index: chosen.cardIndex,
    row,
    target_index: null,
  }
}

async function main() {
  const input = fs.readFileSync(0, 'utf8')
  const payload = JSON.parse(input)
  const cardDict = loadCardDict()
  loadAbilityDict()
  const ctx = buildContext(payload.state, payload.bot_user_id, payload.human_user_id, cardDict)
  const decision = decide(ctx, loadAbilityDict())
  process.stdout.write(JSON.stringify(decision))
}

main().catch((error) => {
  process.stderr.write(String(error?.stack || error))
  process.stdout.write(JSON.stringify({ action: 'pass' }))
  process.exit(1)
})
