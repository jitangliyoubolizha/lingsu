import { describe, expect, it } from 'vitest'

import type { ContentData, Question } from '../src/data/types'
import { buildQuizDeck, createAutoQuestionId } from '../src/domain/quiz'

const CLAUSE_ID = 'SHL.SB.TYS.001'

function makeContent(questions: Question[]): ContentData {
  return {
    book: { code: 'SHL', name: '伤寒论', editions: [{ code: 'SB', name: '宋本' }] },
    edition: { code: 'SB', book: 'SHL', name: '宋本', source: 't', chapters: [] },
    chapters: [],
    clauses: [
      {
        id: CLAUSE_ID,
        no: 1,
        text: '太阳之为病，脉浮，头项强痛而恶寒。',
        translation: 't',
        annotations: [{ source: 's', author: 'a', text: 'a' }],
        formulas: [],
        symptomTags: ['SHL.SB.SYM.001', 'SHL.SB.SYM.002', 'SHL.SB.SYM.003'],
        studyTags: [],
      },
    ],
    formulas: [],
    herbs: [],
    symptomTerms: [
      { id: 'SHL.SB.SYM.001', name: '恶寒', category: '症状', aliases: [] },
      { id: 'SHL.SB.SYM.002', name: '发热', category: '症状', aliases: [] },
      { id: 'SHL.SB.SYM.003', name: '汗出', category: '症状', aliases: [] },
      { id: 'SHL.SB.SYM.004', name: '脉浮', category: '脉象', aliases: [] },
    ],
    questions,
  }
}

describe('buildQuizDeck 人工复核题优先', () => {
  it('与自动题同 ID 时用人工复核题并去重', () => {
    const collidingId = createAutoQuestionId('SHL', 'SB', CLAUSE_ID, 'fill_blank', '恶寒')
    const reviewed: Question = {
      id: collidingId,
      type: 'fill_blank',
      clause: CLAUSE_ID,
      prompt: '人工复核题题干',
      options: ['恶寒', '发热', '汗出', '脉浮'],
      answerIndex: 0,
      rationale: 'r',
      status: 'reviewed',
    }

    const deck = buildQuizDeck(makeContent([reviewed]))

    expect(deck.filter((q) => q.id === collidingId)).toHaveLength(1)
    expect(deck.find((q) => q.id === collidingId)?.prompt).toBe('人工复核题题干')
    expect(deck.find((q) => q.id === collidingId)?.status).toBe('reviewed')
  })

  it('人工复核题排在任何自动题之前', () => {
    const reviewed: Question = {
      id: 'SHL.SB.Q.9001',
      type: 'fill_blank',
      clause: CLAUSE_ID,
      prompt: '人工复核题题干',
      options: ['恶寒', '发热', '汗出', '脉浮'],
      answerIndex: 0,
      rationale: 'r',
      status: 'reviewed',
    }

    const deck = buildQuizDeck(makeContent([reviewed]))

    const reviewedIndex = deck.findIndex((q) => q.status === 'reviewed')
    const autoIndex = deck.findIndex((q) => q.status === 'auto')
    expect(reviewedIndex).toBeGreaterThanOrEqual(0)
    expect(autoIndex).toBeGreaterThan(reviewedIndex)
    // 无冲突的自动题仍保留
    expect(deck.some((q) => q.type === 'fill_blank' && q.status === 'auto')).toBe(true)
    // 全部 ID 唯一
    expect(new Set(deck.map((q) => q.id)).size).toBe(deck.length)
  })
})
