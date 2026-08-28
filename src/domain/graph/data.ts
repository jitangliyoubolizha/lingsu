/**
 * 知识图谱数据构建（纯函数）。
 *
 * 由内容数据派生四类节点（方剂 / 中药 / 条文 / 症状）与六类边：
 * - compose：方剂 → 组成中药（composition.herb 为中药 ID，未收录药材忽略）
 * - text：方剂 → 出处条文（relatedClauses）
 * - pair：药对 —— 同书 ≥2 个方剂组成中共现的两味药
 * - present：条文 → 症状（clause.symptomTags，随条文节点开关）
 * - targets：方剂 → 主症（formula.mainSymptoms 显式录入）
 * - suggests：方剂 → 提示症 —— 相关条文中 ≥2 次出现的症状（推导，同药对思路）
 *
 * 设计说明见 docs/核心模块设计.md §8.2。
 */
import type { Clause, Formula, Herb, SymptomTerm } from '../../data/types'

export type GraphNodeType = 'formula' | 'herb' | 'text' | 'symptom'
export type GraphLinkKind = 'compose' | 'text' | 'pair' | 'present' | 'suggests' | 'targets'

export interface GraphNodeData {
  id: string
  label: string
  type: GraphNodeType
  /** 对应内容实体 id，用于详情页跳转与深链。 */
  refId: string
  /** 可检索名称（主名 + 别名），供图谱内搜索定位。 */
  matchNames: string[]
}

export interface GraphLinkData {
  source: string
  target: string
  kind: GraphLinkKind
}

export interface GraphDataset {
  nodes: GraphNodeData[]
  links: GraphLinkData[]
}

export interface BuildGraphDatasetInput {
  formulas: Formula[]
  herbs: Herb[]
  /** 条文数据源；与 includeTextNodes 共同决定条文节点与 text/present 边。 */
  clauses?: Clause[]
  /** 症状术语注册表；与 includeSymptomNodes 共同决定症状层。 */
  symptomTerms?: SymptomTerm[]
  /** 条文节点开关；省略时跟随 clauses 的有无（向后兼容）。 */
  includeTextNodes?: boolean
  /** 症状节点开关；默认关闭。 */
  includeSymptomNodes?: boolean
}

/** 中药节点只收录实际参与至少一个方剂组成的药材，避免孤点干扰布局。 */
function collectUsedHerbIds(formulas: Formula[]): Set<string> {
  const used = new Set<string>()
  for (const formula of formulas) {
    for (const item of formula.composition) used.add(item.herb)
  }
  return used
}

export function buildGraphDataset(input: BuildGraphDatasetInput): GraphDataset {
  const { formulas, herbs, clauses, symptomTerms } = input
  const textNodesOn = clauses !== undefined && input.includeTextNodes !== false
  const symptomNodesOn = input.includeSymptomNodes === true && symptomTerms !== undefined
  const nodes: GraphNodeData[] = []
  const links: GraphLinkData[] = []

  const usedHerbIds = collectUsedHerbIds(formulas)
  const herbById = new Map(herbs.map((herb) => [herb.id, herb]))
  const pairCounts = new Map<string, number>()

  // 方剂节点 + compose 边 + 药对共现计数
  for (const formula of formulas) {
    nodes.push({
      id: `f:${formula.id}`,
      label: formula.name,
      type: 'formula',
      refId: formula.id,
      matchNames: [formula.name],
    })

    // 同方内去重，防止重复药材产生重复边/虚增度数
    const composedHerbIds = new Set<string>()
    for (const item of formula.composition) {
      if (!herbById.has(item.herb)) continue
      composedHerbIds.add(item.herb)
    }

    const composedList = [...composedHerbIds]
    for (const herbId of composedList) {
      links.push({ source: `f:${formula.id}`, target: `h:${herbId}`, kind: 'compose' })
    }
    for (let i = 0; i < composedList.length; i++) {
      for (let j = i + 1; j < composedList.length; j++) {
        const a = composedList[i]!
        const b = composedList[j]!
        const key = a < b ? `${a}|${b}` : `${b}|${a}`
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
      }
    }
  }

  // 被引用的中药节点
  for (const herb of herbs) {
    if (!usedHerbIds.has(herb.id)) continue
    nodes.push({
      id: `h:${herb.id}`,
      label: herb.name,
      type: 'herb',
      refId: herb.id,
      matchNames: [herb.name, ...herb.aliases],
    })
  }

  // 条文节点 + text 边
  if (clauses && textNodesOn) {
    const clauseIds = new Set(clauses.map((clause) => clause.id))
    for (const clause of clauses) {
      nodes.push({
        id: `t:${clause.id}`,
        label: `第${clause.no}条`,
        type: 'text',
        refId: clause.id,
        matchNames: [`第${clause.no}条`],
      })
    }
    for (const formula of formulas) {
      for (const clauseId of formula.relatedClauses) {
        if (!clauseIds.has(clauseId)) continue
        links.push({
          source: `f:${formula.id}`,
          target: `t:${clauseId}`,
          kind: 'text',
        })
      }
    }
  }

  // 药对边：≥2 个方剂中共现才生成
  for (const [key, count] of pairCounts) {
    if (count < 2) continue
    const [a, b] = key.split('|')
    links.push({ source: `h:${a}`, target: `h:${b}`, kind: 'pair' })
  }

  // 症状层：节点只收录被条文/方剂引用过的术语
  if (symptomNodesOn && symptomTerms) {
    const termById = new Map(symptomTerms.map((term) => [term.id, term]))
    const usedSymptomIds = new Set<string>()
    if (clauses) {
      for (const clause of clauses) {
        for (const tag of clause.symptomTags) usedSymptomIds.add(tag)
      }
    }
    for (const formula of formulas) {
      for (const tag of formula.mainSymptoms) usedSymptomIds.add(tag)
    }

    const symptomOn = (tagId: string): boolean =>
      termById.has(tagId) && usedSymptomIds.has(tagId)

    for (const term of symptomTerms) {
      if (!usedSymptomIds.has(term.id)) continue
      nodes.push({
        id: `s:${term.id}`,
        label: term.name,
        type: 'symptom',
        refId: term.id,
        matchNames: [term.name, ...term.aliases],
      })
    }

    // present：条文 → 症状（条文节点开启时才有条文端点）
    if (clauses && textNodesOn) {
      for (const clause of clauses) {
        for (const tag of new Set(clause.symptomTags)) {
          if (!symptomOn(tag)) continue
          links.push({ source: `t:${clause.id}`, target: `s:${tag}`, kind: 'present' })
        }
      }
    }

    // targets：方剂主症（显式录入）
    for (const formula of formulas) {
      for (const tag of new Set(formula.mainSymptoms)) {
        if (!symptomOn(tag)) continue
        links.push({ source: `f:${formula.id}`, target: `s:${tag}`, kind: 'targets' })
      }
    }

    // suggests：相关条文中 ≥2 次出现的症状（推导）
    if (clauses) {
      const clauseById = new Map(clauses.map((clause) => [clause.id, clause]))
      for (const formula of formulas) {
        const support = new Map<string, number>()
        for (const clauseId of formula.relatedClauses) {
          const clause = clauseById.get(clauseId)
          if (!clause) continue
          for (const tag of new Set(clause.symptomTags)) {
            if (!symptomOn(tag)) continue
            support.set(tag, (support.get(tag) ?? 0) + 1)
          }
        }
        for (const [tag, count] of support) {
          if (count < 2) continue
          links.push({ source: `f:${formula.id}`, target: `s:${tag}`, kind: 'suggests' })
        }
      }
    }
  }

  return { nodes, links }
}

/**
 * 抽取某节点的直接邻居子图：
 * 保留所有与选中节点相连的边，以及邻居彼此之间的边（如药对）；无关边丢弃。
 * 节点不存在时返回空数据集。
 */
export function neighborSubgraph(dataset: GraphDataset, nodeId: string): GraphDataset {
  const keepLinks = dataset.links.filter(
    (link) => link.source === nodeId || link.target === nodeId
  )
  const endpointIds = new Set<string>()
  for (const link of dataset.links) {
    if (link.source === nodeId) endpointIds.add(link.target)
    if (link.target === nodeId) endpointIds.add(link.source)
  }
  // 邻居彼此之间的边（两端都是邻居，如药对）也保留
  for (const link of dataset.links) {
    if (link.source === nodeId || link.target === nodeId) continue
    if (endpointIds.has(link.source) && endpointIds.has(link.target)) {
      keepLinks.push(link)
    }
  }

  return {
    nodes: dataset.nodes.filter(
      (node) => node.id === nodeId || endpointIds.has(node.id)
    ),
    links: keepLinks,
  }
}

/**
 * 图谱内搜索定位：返回目标节点 id 或 null。
 * - 纯数字：按条文号定位（条文节点缺失时返回 null，由视图决定是否开启条文后重查）；
 * - 文本：方剂/中药/症状名精确（含别名）→ 名称包含匹配。
 */
export function locateGraphNode(dataset: GraphDataset, query: string): string | null {
  const q = query.trim()
  if (!q) return null

  if (/^\d+$/.test(q)) {
    const hit = dataset.nodes.find(
      (node) => node.type === 'text' && node.label === `第${parseInt(q, 10)}条`
    )
    return hit?.id ?? null
  }

  const searchable = (type: GraphNodeType): boolean =>
    type === 'formula' || type === 'herb' || type === 'symptom'

  for (const node of dataset.nodes) {
    if (searchable(node.type) && node.matchNames.includes(q)) {
      return node.id
    }
  }
  for (const node of dataset.nodes) {
    if (searchable(node.type)) {
      if (node.matchNames.some((name) => name.includes(q))) return node.id
    }
  }
  return null
}
