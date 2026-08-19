import { describe, expect, it } from 'vitest'

import {
  applyCorrectAnswer,
  applyWrongAnswer,
  getDueWrongQuestions,
  WRONG_REVIEW_LIMIT,
  type WrongReviewRecord,
} from './wrongReview'

function makeRecord(overrides: Partial<WrongReviewRecord> = {}): WrongReviewRecord {
  return {
    questionId: 'Q.1',
    lastWrongAt: new Date(2026, 7, 17, 8, 0, 0),
    wrongCount: 1,
    resolved: false,
    dueAt: new Date(2026, 7, 18, 8, 0, 0),
    correctStreak: 0,
    ...overrides,
  }
}

describe('domain/wrongReview 错题排期', () => {
  it('答错后次日到期，连续答对清零', () => {
    const now = new Date(2026, 7, 18, 23, 59, 0)
    const next = applyWrongAnswer(makeRecord({ correctStreak: 1 }), now)

    expect(next.dueAt).toEqual(new Date(2026, 7, 19, 23, 59, 0))
    expect(next.correctStreak).toBe(0)
    expect(next.wrongCount).toBe(2)
    expect(next.resolved).toBe(false)
  })

  it('答对一次未掌握，3 天后复测', () => {
    const now = new Date(2026, 7, 18, 8, 0, 0)
    const next = applyCorrectAnswer(makeRecord(), now)

    expect(next.correctStreak).toBe(1)
    expect(next.resolved).toBe(false)
    expect(next.dueAt).toEqual(new Date(2026, 7, 21, 8, 0, 0))
  })

  it('连续答对两次后标记已掌握', () => {
    const now = new Date(2026, 7, 21, 8, 0, 0)
    const next = applyCorrectAnswer(makeRecord({ correctStreak: 1 }), now)

    expect(next.correctStreak).toBe(2)
    expect(next.resolved).toBe(true)
  })

  it('到期队列只取未解决且到期的错题，按到期时间排序并限制数量', () => {
    const now = new Date(2026, 7, 18, 12, 0, 0)
    const records = Array.from({ length: 12 }, (_, index) =>
      makeRecord({
        questionId: `Q.${index}`,
        dueAt: new Date(2026, 7, 18, 0, 0, index),
      })
    )
    records.push(
      makeRecord({ questionId: 'FUTURE', dueAt: new Date(2026, 7, 19, 0, 0, 0) }),
      makeRecord({ questionId: 'RESOLVED', resolved: true, dueAt: new Date(2026, 7, 1, 0, 0, 0) })
    )

    const due = getDueWrongQuestions(records, now)

    expect(due).toHaveLength(WRONG_REVIEW_LIMIT)
    expect(due.map((record) => record.questionId)).toEqual(
      Array.from({ length: 10 }, (_, index) => `Q.${index}`)
    )
    expect(due.some((record) => record.questionId === 'FUTURE')).toBe(false)
    expect(due.some((record) => record.questionId === 'RESOLVED')).toBe(false)
  })
})
