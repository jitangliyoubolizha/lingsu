/**
 * 统计口径纯函数。
 * 对应 `docs/学习计划与统计口径.md` §4。
 */
import type { ContentData } from '../data/types'
import { getClauseStudyStatus, getDueCards } from './memory'
import type { MemoryCard } from './memory/types'

export interface DailyLogLike {
  date: string
  requiredCount: number
  completedCount: number
}

export interface ChapterProgress {
  code: string
  name: string
  done: number
  total: number
}

function isCompleted(log: DailyLogLike): boolean {
  return log.completedCount >= log.requiredCount
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 计算连续打卡天数。
 * 今天已完成从今天起算；今天未完成从昨天起算。
 * @param logs 每日完成记录
 * @param today 当前日期
 */
export function computeStreakDays(logs: DailyLogLike[], today: Date = new Date()): number {
  const completedDates = new Set(logs.filter(isCompleted).map((log) => log.date))
  const cursor = new Date(today)
  if (!completedDates.has(toLocalDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (completedDates.has(toLocalDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/**
 * 计算篇章进度。
 * @param content 内容数据
 * @param learnedClauseIds 已学条文 ID 集合
 */
export function computeChapterProgress(
  content: ContentData,
  learnedClauseIds: Set<string>
): ChapterProgress[] {
  return content.chapters.map((chapter) => ({
    code: chapter.code,
    name: chapter.name,
    done: chapter.clauses.filter((clause) => learnedClauseIds.has(clause.id)).length,
    total: chapter.clauses.length,
  }))
}

/**
 * 计算学习状态统计。
 * @param cards 全部卡片
 * @param now 当前时间
 */
export function computeLearningStats(
  cards: MemoryCard[],
  now: Date = new Date()
): {
  mastered: number
  learning: number
  dueReviews: number
} {
  let mastered = 0
  let learning = 0
  for (const card of cards) {
    const status = getClauseStudyStatus(card)
    if (status === 'mastered') {
      mastered += 1
    } else if (status === 'learning') {
      learning += 1
    }
  }
  return {
    mastered,
    learning,
    dueReviews: getDueCards(cards, now).length,
  }
}
