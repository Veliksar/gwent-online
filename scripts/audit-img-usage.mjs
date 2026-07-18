import fs from 'fs'
import path from 'path'

const imgRoot = 'd:/OSPanel/home/gwent.com/public/img'
const all = []

function walk(dir, prefix = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) walk(path.join(dir, entry.name), rel)
    else all.push(rel.replace(/\\/g, '/'))
  }
}

walk(imgRoot)

const cardsJs = fs.readFileSync('d:/OSPanel/home/gwent.com/public/cards.js', 'utf8')
const start = cardsJs.indexOf("JSON.parse(") + 11
const end = cardsJs.lastIndexOf(');')
const raw = cardsJs.slice(start, end).trim()
const jsonStr = raw.startsWith("'") ? Function(`return ${raw}`)() : raw
const cards = JSON.parse(jsonStr)

const expected = new Set()
for (const card of cards) {
  expected.add(`sm/${card.deck}_${card.filename}.jpg`)
  expected.add(`lg/${card.deck}_${card.filename}.jpg`)
}

let blob = ''
const skipDirs = new Set(['node_modules', 'build', 'vendor'])

function readTree(root) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name)
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) readTree(full)
    } else if (/\.(tsx?|css|js|html|php)$/.test(entry.name)) {
      blob += fs.readFileSync(full, 'utf8')
    }
  }
}

readTree('d:/OSPanel/home/gwent.com/frontend')
readTree('d:/OSPanel/home/gwent.com/public')
readTree('d:/OSPanel/home/gwent.com/app')

const used = new Set([...expected])
for (const file of all) {
  if (expected.has(file)) continue
  if (blob.includes(file)) used.add(file)
  const base = path.basename(file, path.extname(file))
  if (blob.includes(base)) used.add(file)
}

const missing = [...expected].filter((file) => !all.includes(file))
const unused = all.filter((file) => !used.has(file))

console.log(JSON.stringify({
  total: all.length,
  cardsInDict: cards.length,
  expectedCardPaths: expected.size,
  missingOnDisk: missing.length,
  usedEstimate: used.size,
  unusedEstimate: unused.length,
  missing,
  unusedNonCard: unused.filter((file) => !file.startsWith('sm/') && !file.startsWith('lg/')),
  unusedCardSample: unused.filter((file) => file.startsWith('sm/') || file.startsWith('lg/')).slice(0, 10),
}, null, 2))
