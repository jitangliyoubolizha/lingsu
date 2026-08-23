/**
 * 生成《方剂目录.md》
 *
 * 用途：从 content/shanghanlun/sb/formulas.yaml 与 herbs.yaml 提取全部方剂，
 * 生成 docs/方剂目录.md，便于人工查看、校对和后续修改。
 *
 * 运行：npm run build:formulas-doc
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(root, 'content', 'shanghanlun', 'sb')
const outFile = path.join(root, 'docs', '方剂目录.md')

const formulas = YAML.parse(readFileSync(path.join(dataDir, 'formulas.yaml'), 'utf8')).formulas
const herbs = YAML.parse(readFileSync(path.join(dataDir, 'herbs.yaml'), 'utf8')).herbs
const herbMap = new Map(herbs.map((h) => [h.id, h]))

const chapterNames = {
  TYS: '太阳病上',
  TYZ: '太阳病中',
  TYX: '太阳病下',
  YM: '阳明病',
  SY: '少阳病',
  TAI: '太阴病',
  SI: '少阴病',
  JUE: '厥阴病',
  HUO: '霍乱病',
  YI: '阴阳易差后劳复',
}

function formatClauseId(id) {
  const parts = id.split('.')
  const code = parts[2]
  const no = parts[3]
  const name = chapterNames[code] || code
  return `${name}·${no}`
}

function formatComposition(formula) {
  return formula.composition
    .map((item) => {
      const herbName = herbMap.get(item.herb)?.name || item.herb
      const dose = item.dose ? ` ${item.dose}` : ''
      const note = item.note ? `（${item.note}）` : ''
      return `${herbName}${note}${dose}`
    })
    .join('，')
}

function formatRelatedFormulas(formula) {
  if (!formula.related_formulas || formula.related_formulas.length === 0) return '—'
  return formula.related_formulas
    .map((rel) => {
      const target = formulas.find((f) => f.id === rel.target)
      const targetName = target ? target.name : rel.target
      return `${rel.relation}→${targetName}${rel.note ? `（${rel.note}）` : ''}`
    })
    .join('；')
}

function formatRelatedClauses(formula) {
  if (!formula.related_clauses || formula.related_clauses.length === 0) return '—'
  return formula.related_clauses.map(formatClauseId).join('、')
}

const categories = new Map()
for (const f of formulas) {
  if (!categories.has(f.category)) categories.set(f.category, [])
  categories.get(f.category).push(f)
}

const lines = []
lines.push('# 方剂目录（《伤寒论》宋本）')
lines.push('')
lines.push('> 用途：集中查看全部方剂、组成、煎服法、相关条文与类方关系，便于校对和后续修改。')
lines.push('> 数据源：`content/shanghanlun/sb/formulas.yaml`（方剂）与 `content/shanghanlun/sb/herbs.yaml`（药物名称）。')
lines.push('> 生成命令：`npm run build:formulas-doc`。修改方剂数据后请重新生成本文件并同步 `content/shanghanlun/校对记录.md`。')
lines.push('> 校验：`npm run validate:content`。')
lines.push('')
lines.push('## 统计')
lines.push('')
lines.push(`- 方剂总数：**${formulas.length}** 首`)
lines.push(`- 类别数量：**${categories.size}** 类`)
lines.push(`- 药物总数：**${herbs.length}** 味`)
lines.push('- 状态说明：所有方剂目前均为 `draft`（AI 初稿，待人工/用户反馈校对）')
lines.push('')
lines.push('## 类别总览')
lines.push('')
lines.push('| 类别 | 数量 | 方剂 |')
lines.push('|---|---|---|')
for (const [category, list] of categories) {
  lines.push(`| ${category} | ${list.length} | ${list.map((f) => f.name).join('、')} |`)
}
lines.push('')
lines.push('## 方剂明细')
lines.push('')

let categoryIndex = 0
for (const [category, list] of categories) {
  categoryIndex += 1
  lines.push(`### ${categoryIndex}. ${category}`)
  lines.push('')
  lines.push('| ID | 方名 | 组成 | 原文剂量 | 煎服法 | 相关条文 | 类方/加减关系 |')
  lines.push('|---|---|---|---|---|---|---|')
  for (const f of list) {
    const id = f.id.replace('SHL.SB.', '')
    const name = f.name
    const comp = formatComposition(f)
    const dose = f.original_dose_text || '—'
    const decoction = f.decoction || '—'
    const clauses = formatRelatedClauses(f)
    const rel = formatRelatedFormulas(f)
    lines.push(`| ${id} | ${name} | ${comp} | ${dose} | ${decoction} | ${clauses} | ${rel} |`)
  }
  lines.push('')
}

lines.push('---')
lines.push('')
lines.push('## 修改说明')
lines.push('')
lines.push('1. 修改方剂数据：编辑 `content/shanghanlun/sb/formulas.yaml`。')
lines.push('2. 新增/修改药物名称：编辑 `content/shanghanlun/sb/herbs.yaml`。')
lines.push('3. 字段规则与 ID 规则见 `docs/数据规范.md` §4.4、§3。')
lines.push('4. 修改后运行：`npm run validate:content`。')
lines.push('5. 再运行：`npm run build:formulas-doc`，重新生成本目录。')
lines.push('6. 如涉及内容修订，在 `content/shanghanlun/校对记录.md` 登记。')
lines.push('')

writeFileSync(outFile, lines.join('\n'), 'utf8')
console.log(`已生成：${outFile}（${formulas.length} 首方剂）`)
