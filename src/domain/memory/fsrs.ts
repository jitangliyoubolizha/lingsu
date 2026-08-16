/**
 * FSRS 记忆调度：卡片创建、复习自评、到期查询。
 * 使用 `ts-fsrs` 计算调度，保持纯函数、不直接操作存储。
 */
import { createEmptyCard, fsrs, State, type CardInput, type Grade } from 'ts-fsrs'

import type { CardState, MemoryCard, ReviewLog, SelfRating } from './types'

const CARD_ID_PREFIX = 'card:'

/**
 * 创建一张新卡片。
 * @param clauseId 条文 ID
 * @param now 当前时间，默认现在
 * @returns 新卡片
 */
export function createCard(clauseId: string, now: Date = new Date()): MemoryCard {
  const empty = createEmptyCard(now)
  return {
    id: `${CARD_ID_PREFIX}${clauseId}`,
    clauseId,
    due: empty.due,
    state: 'New',
    interval: 0,
    stability: empty.stability,
    difficulty: empty.difficulty,
    reps: empty.reps,
    lapses: empty.lapses,
  }
}

/**
 * 复习一张卡片并返回新卡片与复习日志。
 * @param card 当前卡片
 * @param rating 自评：1=忘了，2=模糊，3=记得
 * @param now 复习时间，默认现在
 * @returns 更新后的卡片与日志
 */
export function reviewCard(
  card: MemoryCard,
  rating: SelfRating,
  now: Date = new Date()
): { card: MemoryCard; log: ReviewLog } {
  const scheduler = fsrs()
  const result = scheduler.next(toFsrsCard(card), now, rating as Grade)
  const updated = fromFsrsCard(result.card, card.id, card.clauseId)
  const log: ReviewLog = {
    cardId: card.id,
    clauseId: card.clauseId,
    rating,
    reviewedAt: now,
    state: updated.state,
    due: updated.due,
  }
  return { card: updated, log }
}

/**
 * 获取到期复习卡片（已学过且 due <= now）。
 * @param cards 全部卡片
 * @param now 当前时间
 * @returns 到期卡片
 */
export function getDueCards(cards: MemoryCard[], now: Date = new Date()): MemoryCard[] {
  return cards
    .filter((card) => card.state !== 'New' && card.due.getTime() <= now.getTime())
    .sort((a, b) => a.due.getTime() - b.due.getTime())
}

/**
 * 根据卡片判定条文学习状态。
 * @param card 卡片，可能为空
 * @returns 未学 / 学习中 / 已掌握
 */
export function getClauseStudyStatus(
  card: MemoryCard | undefined
): 'unlearned' | 'learning' | 'mastered' {
  if (!card || card.state === 'New') {
    return 'unlearned'
  }
  if (card.state === 'Learning' || card.state === 'Relearning' || card.interval < 21) {
    return 'learning'
  }
  return 'mastered'
}

function toFsrsCard(card: MemoryCard): CardInput {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: 0,
    scheduled_days: card.interval,
    learning_steps: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.lastReview ?? null,
  }
}

function fromFsrsCard(card: import('ts-fsrs').Card, id: string, clauseId: string): MemoryCard {
  return {
    id,
    clauseId,
    due: card.due,
    state: stateFromTs(card.state),
    interval: card.scheduled_days,
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.last_review,
  }
}

function stateFromTs(state: State): CardState {
  switch (state) {
    case State.Learning:
      return 'Learning'
    case State.Review:
      return 'Review'
    case State.Relearning:
      return 'Relearning'
    default:
      return 'New'
  }
}
