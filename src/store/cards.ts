/**
 * 卡片与条文学习状态持久化。
 */
import type { MemoryCard, ReviewLog } from '../domain/memory/types'
import { db } from './db'

/**
 * 保存卡片。
 */
export async function saveCard(card: MemoryCard): Promise<void> {
  await db.cards.put(card)
}

/**
 * 按条文 ID 查询卡片。
 */
export async function getCardByClause(clauseId: string): Promise<MemoryCard | undefined> {
  return db.cards.where('clauseId').equals(clauseId).first()
}

/**
 * 获取全部卡片。
 */
export async function getAllCards(): Promise<MemoryCard[]> {
  return db.cards.toArray()
}

/**
 * 标记条文已学。
 * @param clauseId 条文 ID
 * @param firstLearnedAt 首次学习日期，默认今天
 */
export async function markClauseLearned(
  clauseId: string,
  firstLearnedAt = new Date().toISOString().slice(0, 10)
): Promise<void> {
  await db.clauseStates.put({ clauseId, firstLearnedAt })
}

/**
 * 获取全部条文学习状态。
 */
export async function getClauseStates(): Promise<
  Array<{ clauseId: string; firstLearnedAt?: string }>
> {
  return db.clauseStates.toArray()
}

/**
 * 保存复习日志。
 */
export async function saveReviewLog(log: ReviewLog): Promise<void> {
  await db.reviewLogs.add(log)
}

/**
 * 获取全部复习日志。
 */
export async function getReviewLogs(): Promise<ReviewLog[]> {
  return db.reviewLogs.toArray()
}
