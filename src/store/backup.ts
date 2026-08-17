/**
 * 数据备份导出 / 导入恢复。
 * 备份格式见 `docs/核心模块设计.md` §6。
 */
import type { MemoryCard, ReviewLog, StudyPlan } from '../domain/memory/types'
import {
  db,
  type ClauseStateRecord,
  type DailyLogRecord,
  type FavoriteRecord,
  type QuizLogRecord,
  type SettingsRecord,
  type WrongQuestionRecord,
} from './db'
import { CURRENT_SCHEMA_VERSION } from './migrations'

export interface BackupData {
  schemaVersion: number
  exportedAt: string
  appVersion: string
  data: {
    settings: SettingsRecord[]
    studyPlans: StudyPlan[]
    clauseStates: ClauseStateRecord[]
    cards: MemoryCard[]
    reviewLogs: ReviewLog[]
    dailyLogs: DailyLogRecord[]
    quizLogs: QuizLogRecord[]
    favorites: FavoriteRecord[]
    wrongQuestions: WrongQuestionRecord[]
  }
}

let lastPreImportBackup: string | null = null

/**
 * 获取最近一次导入前的自动备份（JSON 字符串），未导入过则为 null。
 * 内存级备份，用于“导入前自动备份当前数据”的保留；后续可改为持久化存储。
 */
export function getLastPreImportBackup(): string | null {
  return lastPreImportBackup
}

function reviveDates(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reviveDates)
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(record)) {
      // exportedAt 是备份时间字符串，保持字符串类型；其余符合 ISO 时间的字段还原为 Date
      if (
        key !== 'exportedAt' &&
        typeof item === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(item)
      ) {
        result[key] = new Date(item)
      } else {
        result[key] = reviveDates(item)
      }
    }
    return result
  }
  return value
}

/**
 * 校验备份数据结构。
 * @param data 任意输入
 * @returns 问题列表，为空表示通过
 */
export function validateBackupData(data: unknown): string[] {
  const issues: string[] = []
  if (!data || typeof data !== 'object') {
    return ['备份数据不是对象']
  }
  const backup = data as Partial<BackupData>
  if (backup.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    issues.push(`不支持的 schemaVersion：${String(backup.schemaVersion)}`)
  }
  if (typeof backup.exportedAt !== 'string') {
    issues.push('缺少 exportedAt')
  }
  if (typeof backup.appVersion !== 'string') {
    issues.push('缺少 appVersion')
  }
  const tables = backup.data
  if (!tables || typeof tables !== 'object') {
    issues.push('缺少 data 表集合')
    return issues
  }
  const tableNames = [
    'settings',
    'studyPlans',
    'clauseStates',
    'cards',
    'reviewLogs',
    'dailyLogs',
    'quizLogs',
    'favorites',
    'wrongQuestions',
  ] as const
  for (const name of tableNames) {
    if (!Array.isArray(tables[name])) {
      issues.push(`表 ${name} 不是数组`)
    }
  }
  return issues
}

/**
 * 导出全部数据为备份对象。
 */
export async function exportData(): Promise<BackupData> {
  const [
    settings,
    studyPlans,
    clauseStates,
    cards,
    reviewLogs,
    dailyLogs,
    quizLogs,
    favorites,
    wrongQuestions,
  ] = await Promise.all([
    db.settings.toArray(),
    db.studyPlans.toArray(),
    db.clauseStates.toArray(),
    db.cards.toArray(),
    db.reviewLogs.toArray(),
    db.dailyLogs.toArray(),
    db.quizLogs.toArray(),
    db.favorites.toArray(),
    db.wrongQuestions.toArray(),
  ])

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: '0.1.0',
    data: {
      settings,
      studyPlans,
      clauseStates,
      cards,
      reviewLogs,
      dailyLogs,
      quizLogs,
      favorites,
      wrongQuestions,
    },
  }
}

/**
 * 将备份对象序列化为 JSON 字符串（Date 自动转 ISO）。
 */
export function serializeBackup(data: BackupData): string {
  return JSON.stringify(data)
}

/**
 * 从 JSON 字符串解析备份对象，并恢复日期字段。
 */
export function parseBackup(json: string): BackupData {
  const parsed = JSON.parse(json) as unknown
  return reviveDates(parsed) as BackupData
}

/**
 * 导入备份：校验通过后清空现有数据并写入。
 * @param json 备份 JSON 字符串
 */
export async function importData(json: string): Promise<void> {
  const backup = parseBackup(json)
  const issues = validateBackupData(backup)
  if (issues.length > 0) {
    throw new Error(`备份数据无效：${issues.join('；')}`)
  }

  // 导入前自动备份当前数据，供误导入时恢复
  lastPreImportBackup = serializeBackup(await exportData())

  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    await db.settings.bulkAdd(backup.data.settings)
    await db.studyPlans.bulkAdd(backup.data.studyPlans)
    await db.clauseStates.bulkAdd(backup.data.clauseStates)
    await db.cards.bulkAdd(backup.data.cards)
    await db.reviewLogs.bulkAdd(backup.data.reviewLogs)
    await db.dailyLogs.bulkAdd(backup.data.dailyLogs)
    await db.quizLogs.bulkAdd(backup.data.quizLogs)
    await db.favorites.bulkAdd(backup.data.favorites)
    await db.wrongQuestions.bulkAdd(backup.data.wrongQuestions)
  })
}
