/**
 * 全文检索：MiniSearch 索引、查询、分组。
 */
import MiniSearch from 'minisearch'

import type { ContentData } from '../../data/types'
import { processTerm, tokenize } from './tokenizer'

export interface SearchDocument {
  id: string
  group: 'clause' | 'formula' | 'herb'
  title: string
  text: string
}

export interface SearchResultItem {
  id: string
  group: 'clause' | 'formula' | 'herb'
  title: string
  text: string
  score: number
}

export type SearchIndex = MiniSearch<SearchDocument>

/**
 * 构建全文索引。
 * @param content 内容数据
 * @returns MiniSearch 索引
 */
export function buildSearchIndex(content: ContentData): SearchIndex {
  const documents: SearchDocument[] = [
    ...content.clauses.map((clause) => ({
      id: clause.id,
      group: 'clause' as const,
      title: `第 ${clause.no} 条`,
      text: [
        clause.text,
        clause.translation,
        ...clause.annotations.map((item) => item.text),
        ...clause.studyTags,
      ].join(' '),
    })),
    ...content.formulas.map((formula) => ({
      id: formula.id,
      group: 'formula' as const,
      title: formula.name,
      text: [
        formula.category,
        ...formula.composition.map((item) => item.herb),
        ...formula.relatedClauses,
      ].join(' '),
    })),
    ...content.herbs.map((herb) => ({
      id: herb.id,
      group: 'herb' as const,
      title: herb.name,
      text: [herb.name, ...herb.aliases, herb.category ?? ''].join(' '),
    })),
  ]

  const index = new MiniSearch<SearchDocument>({
    fields: ['title', 'text'],
    storeFields: ['id', 'group', 'title', 'text'],
    tokenize,
    processTerm,
    searchOptions: {
      combineWith: 'AND',
      prefix: true,
      fuzzy: 0.2,
    },
  })

  index.addAll(documents)
  return index
}

/**
 * 搜索并返回分组结果。
 * @param index 搜索索引
 * @param query 查询词
 * @returns 搜索结果列表
 */
export function searchContent(index: SearchIndex, query: string): SearchResultItem[] {
  const results = index.search(query)
  return results.map((result) => {
    const stored = result as unknown as SearchDocument
    return {
      id: String(result.id),
      group: stored.group ?? 'clause',
      title: stored.title ?? '',
      text: stored.text ?? '',
      score: result.score,
    }
  })
}

/**
 * 按分组归类搜索结果。
 * @param results 搜索结果列表
 * @returns 按条文/方剂/药物分组的结果
 */
export function groupSearchResults(results: SearchResultItem[]): {
  clauses: SearchResultItem[]
  formulas: SearchResultItem[]
  herbs: SearchResultItem[]
} {
  return {
    clauses: results.filter((item) => item.group === 'clause'),
    formulas: results.filter((item) => item.group === 'formula'),
    herbs: results.filter((item) => item.group === 'herb'),
  }
}

export { getHighlightRanges, processTerm, tokenize } from './tokenizer'
