/**
 * 错题复习排期（轻 Leitner）。
 * 答错次日到期；答对 3 天后复测；连续答对 2 次标记已掌握。
 */
export const WRONG_REVIEW_LIMIT = 10
export const WRONG_CORRECT_INTERVAL_DAYS = 3
export const WRONG_WRONG_INTERVAL_DAYS = 1
export const CORRECT_STREAK_TO_RESOLVE = 2

export interface WrongReviewRecord {
  questionId: string
  lastWrongAt: Date
  wrongCount: number
  resolved: boolean
  dueAt: Date
  correctStreak: number
}

function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function applyWrongAnswer(
  record: WrongReviewRecord,
  now: Date = new Date()
): WrongReviewRecord {
  return {
    ...record,
    lastWrongAt: now,
    wrongCount: record.wrongCount + 1,
    resolved: false,
    correctStreak: 0,
    dueAt: addCalendarDays(now, WRONG_WRONG_INTERVAL_DAYS),
  }
}

export function applyCorrectAnswer(
  record: WrongReviewRecord,
  now: Date = new Date()
): WrongReviewRecord {
  const correctStreak = record.correctStreak + 1
  const resolved = correctStreak >= CORRECT_STREAK_TO_RESOLVE
  return {
    ...record,
    correctStreak,
    resolved,
    dueAt: resolved ? record.dueAt : addCalendarDays(now, WRONG_CORRECT_INTERVAL_DAYS),
  }
}

/**
 * 取出今日到期、未解决的错题，按到期时间升序，最多 limit 条。
 */
export function getDueWrongQuestions(
  records: WrongReviewRecord[],
  now: Date = new Date(),
  limit: number = WRONG_REVIEW_LIMIT
): WrongReviewRecord[] {
  return records
    .filter((record) => !record.resolved && record.dueAt.getTime() <= now.getTime())
    .sort(
      (a, b) =>
        a.dueAt.getTime() - b.dueAt.getTime() || a.questionId.localeCompare(b.questionId)
    )
    .slice(0, limit)
}
