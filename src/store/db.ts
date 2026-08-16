/**
 * Dexie 数据库定义与表结构。
 * 表结构对应 `docs/核心模块设计.md` §2。
 */
import Dexie, { type Table } from 'dexie'

import type { MemoryCard, ReviewLog, StudyPlan } from '../domain/memory/types'

export interface SettingsRecord {
  key: string
  value: unknown
}

export interface ClauseStateRecord {
  clauseId: string
  firstLearnedAt?: string
}

export interface DailyLogRecord {
  date: string
  requiredCount: number
  completedCount: number
}

export interface QuizLogRecord {
  id?: number
  questionId: string
  type: string
  correct: boolean
  answeredAt: Date
}

export interface FavoriteRecord {
  id: string
  type: 'clause' | 'formula' | 'herb'
  targetId: string
  createdAt: Date
}

export interface WrongQuestionRecord {
  questionId: string
  lastWrongAt: Date
  wrongCount: number
  resolved: boolean
}

export class LingsuDatabase extends Dexie {
  settings!: Table<SettingsRecord, string>
  studyPlans!: Table<StudyPlan, string>
  clauseStates!: Table<ClauseStateRecord, string>
  cards!: Table<MemoryCard, string>
  reviewLogs!: Table<ReviewLog, number>
  dailyLogs!: Table<DailyLogRecord, string>
  quizLogs!: Table<QuizLogRecord, number>
  favorites!: Table<FavoriteRecord, string>
  wrongQuestions!: Table<WrongQuestionRecord, string>

  constructor() {
    super('lingsu')
    this.version(1).stores({
      settings: 'key',
      studyPlans: 'id, status',
      clauseStates: 'clauseId, firstLearnedAt',
      cards: 'id, clauseId, due, state',
      reviewLogs: '++id, cardId, reviewedAt',
      dailyLogs: 'date, requiredCount, completedCount',
      quizLogs: '++id, questionId, type, answeredAt',
      favorites: 'id, type, targetId',
      wrongQuestions: 'questionId, lastWrongAt, wrongCount',
    })
  }
}

export const db = new LingsuDatabase()
