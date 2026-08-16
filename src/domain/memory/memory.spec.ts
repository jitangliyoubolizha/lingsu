import { describe, expect, it } from 'vitest'

import { createCard, getDueCards, getNewClauses, getTodayQueue, reviewCard } from './index'
import type { StudyPlan } from './types'

const now = new Date('2026-08-17T08:00:00+08:00')

const clauses = [
  {
    id: 'SHL.SB.TYS.001',
    no: 1,
    text: 'a',
    translation: 't',
    annotations: [],
    formulas: [],
    symptomTags: [],
    studyTags: [],
  },
  {
    id: 'SHL.SB.TYS.002',
    no: 2,
    text: 'b',
    translation: 't',
    annotations: [],
    formulas: [],
    symptomTags: [],
    studyTags: [],
  },
  {
    id: 'SHL.SB.TYS.012',
    no: 12,
    text: 'c',
    translation: 't',
    annotations: [],
    formulas: [],
    symptomTags: [],
    studyTags: [],
  },
]

const plan: StudyPlan = {
  id: 'plan-1',
  name: '太阳病上篇',
  scope: { book: 'SHL', edition: 'SB', chapters: ['TYS'] },
  dailyNew: 3,
  startDate: '2026-08-17',
  status: 'active',
}

describe('memory/fsrs', () => {
  it('创建新卡状态为 New', () => {
    const card = createCard('SHL.SB.TYS.001', now)
    expect(card.clauseId).toBe('SHL.SB.TYS.001')
    expect(card.state).toBe('New')
    expect(card.due.getTime()).toBe(now.getTime())
  })

  it('复习后返回新卡片与日志', () => {
    const card = createCard('SHL.SB.TYS.001', now)
    const result = reviewCard(card, 3, now)
    expect(result.card.id).toBe(card.id)
    expect(result.card.state).not.toBe('New')
    expect(result.log.rating).toBe(3)
    expect(result.log.reviewedAt.getTime()).toBe(now.getTime())
  })

  it('到期查询只返回已学且到期卡片', () => {
    const newCard = createCard('SHL.SB.TYS.001', now)
    const learned = reviewCard(createCard('SHL.SB.TYS.002', now), 3, now).card
    const overdue = { ...learned, due: new Date(now.getTime() - 1000) }
    const due = getDueCards([newCard, learned, overdue], now)
    expect(due.map((card) => card.clauseId)).toEqual(['SHL.SB.TYS.002'])
  })
})

describe('memory/queue', () => {
  it('按计划取未学新条文并按条文号排序', () => {
    const learned = new Set(['SHL.SB.TYS.001'])
    const fresh = getNewClauses(plan, 2, learned, clauses)
    expect(fresh.map((clause) => clause.id)).toEqual(['SHL.SB.TYS.002', 'SHL.SB.TYS.012'])
  })

  it('今日队列优先复习，新学不超过上限', () => {
    const dueCards = [
      {
        ...createCard('SHL.SB.TYS.001', now),
        state: 'Review',
        due: new Date(now.getTime() - 1000),
      } as ReturnType<typeof createCard>,
    ]
    const queue = getTodayQueue(dueCards, [plan], clauses, new Set(), 2, now)
    expect(queue.dueCards).toHaveLength(1)
    expect(queue.newClauses).toHaveLength(1)
  })

  it('到期复习超过上限时新学顺延为 0', () => {
    const dueCards = Array.from({ length: 3 }, (_, index) => ({
      ...createCard(`SHL.SB.TYS.00${index + 1}`, now),
      state: 'Review' as const,
      due: new Date(now.getTime() - 1000),
    }))
    const queue = getTodayQueue(dueCards, [plan], clauses, new Set(), 2, now)
    expect(queue.dueCards).toHaveLength(3)
    expect(queue.newClauses).toHaveLength(0)
  })
})
