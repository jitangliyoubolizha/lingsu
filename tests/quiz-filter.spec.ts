import { describe, expect, it } from 'vitest'

import type { Chapter, Clause, ContentData, Question } from '../src/data/types'
import { filterQuizDeck, shuffleDeck } from '../src/domain/quiz'

function clause(id: string, no: number): Clause {
  return {
    id,
    no,
    text: `原文 ${id}`,
    translation: 't',
    annotations: [{ source: 's', author: 'a', text: 'a' }],
    formulas: [],
    symptomTags: [],
    studyTags: [],
  }
}

function chapter(code: string, name: string, order: number, clauseIds: string[]): Chapter {
  return {
    code,
    name,
    order,
    clauses: clauseIds.map((id, index) => clause(id, index + 1)),
  }
}

function question(id: string, type: Question['type'], clauseRef: string): Question {
  return {
    id,
    type,
    clause: clauseRef,
    prompt: `题干 ${id}`,
    options: ['甲', '乙', '丙', '丁'],
    answerIndex: 0,
    rationale: 'r',
    status: 'reviewed',
  }
}

const deck: Question[] = [
  question('Q.1', 'fill_blank', 'SHL.SB.TYS.001'),
  question('Q.2', 'clause_chain', 'SHL.SB.TYS.002'),
  question('Q.3', 'fill_blank', 'SHL.SB.TYZ.001'),
  question('Q.4', 'formula_composition', 'SHL.SB.TYX.001'),
  question('Q.5', 'formula_syndrome_match', ''),
]

function makeContent(): ContentData {
  return {
    book: { code: 'SHL', name: '伤寒论', editions: [{ code: 'SB', name: '宋本' }] },
    edition: { code: 'SB', book: 'SHL', name: '宋本', source: 't', chapters: [] },
    chapters: [
      chapter('TYS', '太阳病上篇', 1, ['SHL.SB.TYS.001', 'SHL.SB.TYS.002']),
      chapter('TYZ', '太阳病中篇', 2, ['SHL.SB.TYZ.001']),
      chapter('TYX', '太阳病下篇', 3, ['SHL.SB.TYX.001']),
    ],
    clauses: [],
    formulas: [],
    herbs: [],
    symptomTerms: [],
    questions: [],
  }
}

describe('filterQuizDeck 刷题筛选', () => {
  it('无筛选条件时返回全部题目', () => {
    const filtered = filterQuizDeck(deck, makeContent(), {})
    expect(filtered.map((q) => q.id)).toEqual(deck.map((q) => q.id))
  })

  it('按篇筛选只保留该篇章条文下的题目', () => {
    const filtered = filterQuizDeck(deck, makeContent(), { chapter: 'TYS' })
    expect(filtered.map((q) => q.id)).toEqual(['Q.1', 'Q.2'])
  })

  it('按篇筛选排除无条文归属的题目', () => {
    const filtered = filterQuizDeck(deck, makeContent(), { chapter: 'TYZ' })
    expect(filtered.map((q) => q.id)).toEqual(['Q.3'])
  })

  it('按题型筛选只保留该题型', () => {
    const filtered = filterQuizDeck(deck, makeContent(), { type: 'fill_blank' })
    expect(filtered.map((q) => q.id)).toEqual(['Q.1', 'Q.3'])
  })

  it('篇章与题型同时生效为交集', () => {
    const filtered = filterQuizDeck(deck, makeContent(), { chapter: 'TYS', type: 'clause_chain' })
    expect(filtered.map((q) => q.id)).toEqual(['Q.2'])
  })

  it('不存在的篇章代码返回空数组', () => {
    const filtered = filterQuizDeck(deck, makeContent(), { chapter: 'NOPE' })
    expect(filtered).toEqual([])
  })

  it('同代码多篇拆分文件（part）时合并筛选', () => {
    const content = makeContent()
    content.chapters = [
      ...content.chapters,
      chapter('TYS', '太阳病上篇（续）', 1, ['SHL.SB.TYS.003']),
    ]
    const extended = [...deck, question('Q.6', 'fill_blank', 'SHL.SB.TYS.003')]
    const filtered = filterQuizDeck(extended, content, { chapter: 'TYS' })
    expect(filtered.map((q) => q.id)).toEqual(['Q.1', 'Q.2', 'Q.6'])
  })
})

describe('shuffleDeck 随机综合', () => {
  it('洗牌后元素集合不变', () => {
    const shuffled = shuffleDeck(deck)
    expect(shuffled).toHaveLength(deck.length)
    expect(new Set(shuffled.map((q) => q.id))).toEqual(new Set(deck.map((q) => q.id)))
  })

  it('不修改原数组', () => {
    const before = deck.map((q) => q.id)
    shuffleDeck(deck)
    expect(deck.map((q) => q.id)).toEqual(before)
  })

  it('注入随机源可复现（确定性洗牌）', () => {
    let seed = 42
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    const first = shuffleDeck(deck, random)
    seed = 42
    const second = shuffleDeck(deck, random)
    expect(first.map((q) => q.id)).toEqual(second.map((q) => q.id))
  })

  it('空数组与单元素数组安全', () => {
    expect(shuffleDeck([])).toEqual([])
    expect(shuffleDeck([deck[0]])).toHaveLength(1)
  })
})
