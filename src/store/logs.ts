/**
 * 每日任务、刷题、错题本持久化。
 * 错题采用轻 Leitner 排期：答错次日到期，答对 3 天后复测，连续答对 2 次已掌握。
 */
import {
  applyCorrectAnswer,
  applyWrongAnswer,
  getDueWrongQuestions as filterDueWrongQuestions,
  WRONG_REVIEW_LIMIT,
  type WrongReviewRecord,
} from '../domain/wrongReview'
import type { QuizLogRecord, WrongQuestionRecord } from './db'
import { db } from './db'

/**
 * 写入每日完成记录。
 */
export async function saveDailyLog(
  date: string,
  requiredCount: number,
  completedCount: number
): Promise<void> {
  await db.dailyLogs.put({ date, requiredCount, completedCount })
}

/**
 * 获取指定日期每日记录。
 */
export async function getDailyLog(
  date: string
): Promise<{ date: string; requiredCount: number; completedCount: number } | undefined> {
  return db.dailyLogs.get(date)
}

/**
 * 获取全部每日记录。
 */
export async function getAllDailyLogs(): Promise<
  Array<{ date: string; requiredCount: number; completedCount: number }>
> {
  return db.dailyLogs.toArray()
}

/**
 * 写入刷题记录。
 */
export async function addQuizLog(log: Omit<QuizLogRecord, 'id'>): Promise<number> {
  return db.quizLogs.add(log)
}

/**
 * 获取全部刷题记录。
 */
export async function getQuizLogs(): Promise<QuizLogRecord[]> {
  return db.quizLogs.toArray()
}

function normalizeWrongQuestion(record: WrongQuestionRecord): WrongQuestionRecord {
  return {
    ...record,
    dueAt:
      record.dueAt instanceof Date
        ? record.dueAt
        : new Date(record.lastWrongAt instanceof Date ? record.lastWrongAt : 0),
    correctStreak: typeof record.correctStreak === 'number' ? record.correctStreak : 0,
  }
}

/**
 * 记录错题（答错时 upsert）：进入轻 Leitner 排期。
 */
export async function addWrongQuestion(
  questionId: string,
  answeredAt: Date = new Date()
): Promise<void> {
  const existing = await db.wrongQuestions.get(questionId)
  const current = normalizeWrongQuestion(
    existing ?? {
      questionId,
      lastWrongAt: answeredAt,
      wrongCount: 0,
      resolved: false,
      dueAt: answeredAt,
      correctStreak: 0,
    }
  )
  await db.wrongQuestions.put(applyWrongAnswer(current, answeredAt))
}

/**
 * 答对错题：累计连续答对；连续 2 次标记已掌握，否则 3 天后复测。
 */
export async function markWrongCorrect(
  questionId: string,
  answeredAt: Date = new Date()
): Promise<void> {
  const existing = await db.wrongQuestions.get(questionId)
  if (!existing || existing.resolved) return
  await db.wrongQuestions.put(applyCorrectAnswer(normalizeWrongQuestion(existing), answeredAt))
}

/**
 * 手动标记错题已解决（错题本里的“已掌握”）。
 */
export async function resolveWrongQuestion(questionId: string): Promise<void> {
  const existing = await db.wrongQuestions.get(questionId)
  if (existing) {
    await db.wrongQuestions.put({ ...normalizeWrongQuestion(existing), resolved: true })
  }
}

/**
 * 获取全部错题（含已掌握），并补齐旧数据的排期字段。
 */
export async function getWrongQuestions(): Promise<WrongQuestionRecord[]> {
  return (await db.wrongQuestions.toArray()).map(normalizeWrongQuestion)
}

/**
 * 获取今日到期、未解决的错题，按到期时间升序，最多 limit 条。
 */
export async function getDueWrongQuestions(
  now: Date = new Date(),
  limit: number = WRONG_REVIEW_LIMIT
): Promise<WrongQuestionRecord[]> {
  const records = await getWrongQuestions()
  return filterDueWrongQuestions(
    records as WrongReviewRecord[],
    now,
    limit
  ) as WrongQuestionRecord[]
}
