/**
 * 记忆调度模块类型定义。
 * 与 `docs/学习计划与统计口径.md`、`docs/核心模块设计.md` 对应。
 */
import type { Clause } from '../../data/types'

export type SelfRating = 1 | 2 | 3

export type CardState = 'New' | 'Learning' | 'Review' | 'Relearning'

export interface MemoryCard {
  id: string
  clauseId: string
  due: Date
  state: CardState
  /** 当前复习间隔（天） */
  interval: number
  stability: number
  difficulty: number
  reps: number
  lapses: number
  lastReview?: Date
}

export interface ReviewLog {
  cardId: string
  clauseId: string
  rating: SelfRating
  reviewedAt: Date
  state: CardState
  due: Date
}

export interface StudyPlanScope {
  book: string
  edition: string
  chapters: string[]
}

export interface StudyPlan {
  id: string
  name: string
  scope: StudyPlanScope
  dailyNew: 3 | 5 | 10
  startDate: string
  status: 'active' | 'paused' | 'completed'
}

export interface ClauseStudyState {
  clauseId: string
  firstLearnedAt?: string
}

export interface DailyQueue {
  dueCards: MemoryCard[]
  newClauses: Clause[]
}
