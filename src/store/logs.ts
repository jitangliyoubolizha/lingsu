/**
 * 每日任务、刷题、错题本持久化。
 */
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

/**
 * 记录错题（答错时 upsert）。
 */
export async function addWrongQuestion(
  questionId: string,
  answeredAt: Date = new Date()
): Promise<void> {
  const existing = await db.wrongQuestions.get(questionId)
  if (existing) {
    await db.wrongQuestions.put({
      ...existing,
      lastWrongAt: answeredAt,
      wrongCount: existing.wrongCount + 1,
      resolved: false,
    })
  } else {
    await db.wrongQuestions.put({
      questionId,
      lastWrongAt: answeredAt,
      wrongCount: 1,
      resolved: false,
    })
  }
}

/**
 * 标记错题已解决。
 */
export async function resolveWrongQuestion(questionId: string): Promise<void> {
  const existing = await db.wrongQuestions.get(questionId)
  if (existing) {
    await db.wrongQuestions.put({ ...existing, resolved: true })
  }
}

/**
 * 获取全部错题。
 */
export async function getWrongQuestions(): Promise<WrongQuestionRecord[]> {
  return db.wrongQuestions.toArray()
}
