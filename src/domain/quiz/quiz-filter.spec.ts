import { describe, expect, it } from 'vitest'

import type { ContentData } from '../../data/types'
import { filterQuizDeck } from './generator'

const deck = [
  { id: 'Q1', clause: 'C1', type: 'fill_blank' as const, formula: 'F1' },
  { id: 'Q2', clause: 'C1', type: 'formula_syndrome_match' as const, formula: 'F2' },
  { id: 'Q3', clause: 'C2', type: 'fill_blank' as const, formula: undefined },
]

const contentStub = { chapters: [] } as unknown as ContentData

describe('filterQuizDeck 按方剂/条文过滤（图谱学习闭环）', () => {
  it('filter.formula 只保留该方剂的题目', () => {
    const result = filterQuizDeck(deck, contentStub, { formula: 'F1' })
    expect(result.map((q) => q.id)).toEqual(['Q1'])
  })

  it('filter.clause 只保留该条文的题目', () => {
    const result = filterQuizDeck(deck, contentStub, { clause: 'C2' })
    expect(result.map((q) => q.id)).toEqual(['Q3'])
  })

  it('formula 与 type 可组合', () => {
    const result = filterQuizDeck(deck, contentStub, { formula: 'F2', type: 'formula_syndrome_match' })
    expect(result.map((q) => q.id)).toEqual(['Q2'])
  })

  it('不传 formula/clause 时行为不变（章节/题型过滤回归）', () => {
    expect(filterQuizDeck(deck, contentStub, {}).map((q) => q.id)).toEqual(['Q1', 'Q2', 'Q3'])
  })
})
