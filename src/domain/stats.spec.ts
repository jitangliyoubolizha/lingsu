import { describe, expect, it } from 'vitest'

import { computeChapterProgress, computeLearningStats, computeStreakDays } from './stats'
import type { MemoryCard } from './memory/types'

describe('domain/stats', () => {
  it('计算连续打卡：今天完成从今天起算', () => {
    const today = new Date('2026-08-17T10:00:00+08:00')
    const logs = [
      { date: '2026-08-17', requiredCount: 2, completedCount: 2 },
      { date: '2026-08-16', requiredCount: 2, completedCount: 2 },
      { date: '2026-08-15', requiredCount: 2, completedCount: 1 },
    ]
    expect(computeStreakDays(logs, today)).toBe(2)
  })

  it('今天未完成时从昨天起算', () => {
    const today = new Date('2026-08-17T10:00:00+08:00')
    const logs = [
      { date: '2026-08-16', requiredCount: 2, completedCount: 2 },
      { date: '2026-08-15', requiredCount: 2, completedCount: 2 },
    ]
    expect(computeStreakDays(logs, today)).toBe(2)
  })

  it('无任何打卡记录时连续天数为 0', () => {
    expect(computeStreakDays([], new Date('2026-08-17T10:00:00+08:00'))).toBe(0)
  })

  it('断签只中断连续天数，不影响后续已有记录', () => {
    const today = new Date('2026-08-17T10:00:00+08:00')
    const logs = [
      { date: '2026-08-17', requiredCount: 2, completedCount: 2 },
      { date: '2026-08-16', requiredCount: 2, completedCount: 2 },
      { date: '2026-08-14', requiredCount: 2, completedCount: 2 },
      { date: '2026-08-13', requiredCount: 2, completedCount: 2 },
    ]
    expect(computeStreakDays(logs, today)).toBe(2)
  })

  it('未完成每日任务的记录不计入连续天数', () => {
    const today = new Date('2026-08-17T10:00:00+08:00')
    const logs = [
      { date: '2026-08-17', requiredCount: 2, completedCount: 1 },
      { date: '2026-08-16', requiredCount: 2, completedCount: 2 },
    ]
    expect(computeStreakDays(logs, today)).toBe(1)
  })

  it('记录乱序仍按日期计算', () => {
    const today = new Date('2026-08-17T10:00:00+08:00')
    const logs = [
      { date: '2026-08-15', requiredCount: 1, completedCount: 1 },
      { date: '2026-08-17', requiredCount: 1, completedCount: 1 },
      { date: '2026-08-16', requiredCount: 1, completedCount: 1 },
    ]
    expect(computeStreakDays(logs, today)).toBe(3)
  })

  it('未来日期的打卡不拉长连续天数', () => {
    const today = new Date('2026-08-17T10:00:00+08:00')
    const logs = [
      { date: '2026-08-17', requiredCount: 1, completedCount: 1 },
      { date: '2026-08-18', requiredCount: 1, completedCount: 1 },
    ]
    expect(computeStreakDays(logs, today)).toBe(1)
  })

  it('跨月连续打卡正确计数', () => {
    const today = new Date('2026-08-01T10:00:00+08:00')
    const logs = [
      { date: '2026-08-01', requiredCount: 1, completedCount: 1 },
      { date: '2026-07-31', requiredCount: 1, completedCount: 1 },
      { date: '2026-07-30', requiredCount: 1, completedCount: 1 },
    ]
    expect(computeStreakDays(logs, today)).toBe(3)
  })

  it('篇章进度按已学条文统计', () => {
    const content = {
      chapters: [
        {
          code: 'TYS',
          name: '太阳病上篇',
          order: 1,
          clauses: [{ id: 'SHL.SB.TYS.001' }, { id: 'SHL.SB.TYS.002' }],
        },
      ],
    } as never
    const learned = new Set(['SHL.SB.TYS.001'])
    const progress = computeChapterProgress(content, learned)
    expect(progress[0]).toMatchObject({ done: 1, total: 2 })
  })

  it('学习状态统计区分已掌握/学习中/待复习', () => {
    const now = new Date('2026-08-17T10:00:00+08:00')
    const cards: MemoryCard[] = [
      {
        id: 'c1',
        clauseId: 'SHL.SB.TYS.001',
        due: new Date(now.getTime() - 1000),
        state: 'Review',
        interval: 30,
        stability: 5,
        difficulty: 4,
        reps: 3,
        lapses: 0,
      },
      {
        id: 'c2',
        clauseId: 'SHL.SB.TYS.002',
        due: new Date(now.getTime() + 1000),
        state: 'Learning',
        interval: 1,
        stability: 2,
        difficulty: 4,
        reps: 1,
        lapses: 0,
      },
      {
        id: 'c3',
        clauseId: 'SHL.SB.TYS.003',
        due: new Date(now.getTime() - 1000),
        state: 'Review',
        interval: 10,
        stability: 4,
        difficulty: 4,
        reps: 2,
        lapses: 0,
      },
    ]
    const stats = computeLearningStats(cards, now)
    expect(stats.mastered).toBe(1)
    expect(stats.learning).toBe(2)
    expect(stats.dueReviews).toBe(2)
  })
})
