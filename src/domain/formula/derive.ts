/**
 * 方药关系：方证对比字段自动推导、药物反查。
 */
import type { ContentData, Formula, SymptomTerm } from '../../data/types'

export interface DerivedFormulaFields {
  mainSymptoms: string[]
  pulse: string[]
  pathomechanism: string
}

type TermCategory = SymptomTerm['category']

function countByCategory(
  termIds: string[],
  terms: SymptomTerm[],
  category: TermCategory
): string[] {
  const frequency = new Map<string, number>()
  for (const id of termIds) {
    const term = terms.find((item) => item.id === id)
    if (term?.category === category) {
      frequency.set(id, (frequency.get(id) ?? 0) + 1)
    }
  }
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
}

/**
 * 推导方剂的主症、脉象、病机。
 * 手工填写值优先；缺省时从相关条文症状标签自动推导。
 * @param formula 方剂
 * @param content 内容数据
 * @returns 推导结果
 */
export function deriveFormulaFields(formula: Formula, content: ContentData): DerivedFormulaFields {
  if (formula.mainSymptoms.length > 0 || formula.pulse.length > 0 || formula.pathomechanism) {
    return {
      mainSymptoms: formula.mainSymptoms,
      pulse: formula.pulse,
      pathomechanism: formula.pathomechanism,
    }
  }

  const relatedClauses = content.clauses.filter((clause) =>
    formula.relatedClauses.includes(clause.id)
  )
  const symptomTagIds = relatedClauses.flatMap((clause) => clause.symptomTags)

  const mainSymptoms = countByCategory(symptomTagIds, content.symptomTerms, '症状')
  const pulse = countByCategory(symptomTagIds, content.symptomTerms, '脉象')

  const pathomechanismTerms = content.symptomTerms.filter(
    (term) => term.category === '病机' && symptomTagIds.includes(term.id)
  )
  const pathomechanism = pathomechanismTerms[0]?.name ?? ''

  return { mainSymptoms, pulse, pathomechanism }
}

/**
 * 建立“药物 → 方剂”反查索引。
 * @param content 内容数据
 * @returns herbId -> formulaId[]
 */
export function buildHerbFormulaIndex(content: ContentData): Map<string, string[]> {
  const index = new Map<string, string[]>()
  for (const formula of content.formulas) {
    const herbIds = Array.from(new Set(formula.composition.map((item) => item.herb)))
    for (const herbId of herbIds) {
      const list = index.get(herbId) ?? []
      list.push(formula.id)
      index.set(herbId, list)
    }
  }
  return index
}

/**
 * 获取某药物所在的方剂 ID 列表。
 * @param herbId 药物 ID
 * @param content 内容数据
 * @returns 方剂 ID 列表
 */
export function getHerbFormulaIds(herbId: string, content: ContentData): string[] {
  return buildHerbFormulaIndex(content).get(herbId) ?? []
}

/**
 * 获取某药物所在的方剂名称列表。
 * @param herbId 药物 ID
 * @param content 内容数据
 * @returns 方剂名称列表
 */
export function getHerbFormulaNames(herbId: string, content: ContentData): string[] {
  const ids = getHerbFormulaIds(herbId, content)
  return ids
    .map((id) => content.formulas.find((formula) => formula.id === id)?.name)
    .filter((name): name is string => Boolean(name))
}
