/**
 * 统计口径纯函数。
 * 对应 `docs/学习计划与统计口径.md` §4。
 */
import type { ContentData } from '../data/types'
import { getClauseStudyStatus, getDueCards } from './memory'
import type { MemoryCard, ReviewLog } from './memory/types'

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

export interface RetentionDay {
  /** 当日记忆保持率（%）；当日无复习记录时为 null */
  value: number | null
  label: string
  /** 是否尚未到来（本周剩余天数） */
  isFuture: boolean
}

/**
 * 计算本周（自然周，周一起算）每日的记忆保持率。
 * rating ≥ 2（模糊/记得）记为「记得」；当日无复习记录时 value 为 null，
 * 与「复习了但全部遗忘」的 0% 区分；尚未到来的天 isFuture 为 true。
 */
export function computeRetentionTrend(
  reviewLogs: ReadonlyArray<Pick<ReviewLog, 'reviewedAt' | 'rating'>>,
  now: Date = new Date()
): RetentionDay[] {
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  // 周一起算：getDay() 周日=0，周日回退 6 天、其余回退 getDay()-1 天到本周一
  monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()))
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const days: RetentionDay[] = []
  for (let i = 0; i < labels.length; i += 1) {
    const dayStart = new Date(monday)
    dayStart.setDate(monday.getDate() + i)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayStart.getDate() + 1)
    const isFuture = dayStart.getTime() > todayStart.getTime()
    const inDay = isFuture
      ? []
      : reviewLogs.filter((log) => {
          const t = log.reviewedAt.getTime()
          return t >= dayStart.getTime() && t < dayEnd.getTime()
        })
    const remembered = inDay.filter((log) => log.rating >= 2).length
    days.push({
      value: inDay.length === 0 ? null : Math.round((remembered / inDay.length) * 100),
      label: labels[i],
      isFuture,
    })
  }
  return days
}
