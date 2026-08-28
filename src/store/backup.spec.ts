import { describe, expect, it } from 'vitest'

import { parseBackup, serializeBackup, validateBackupData, type BackupData } from './backup'
import { CURRENT_SCHEMA_VERSION, SUPPORTED_SCHEMA_VERSIONS } from './migrations'

const validBackup: BackupData = {
  schemaVersion: 1,
  exportedAt: '2026-08-17T00:00:00.000Z',
  appVersion: '0.1.0',
  data: {
    settings: [],
    studyPlans: [],
    clauseStates: [],
    cards: [
      {
        id: 'card:SHL.SB.TYS.001',
        clauseId: 'SHL.SB.TYS.001',
        due: new Date('2026-08-18T00:00:00.000Z'),
        state: 'Review',
        interval: 21,
        stability: 5,
        difficulty: 4,
        reps: 2,
        lapses: 0,
      },
    ],
    reviewLogs: [],
    dailyLogs: [],
    quizLogs: [],
    favorites: [],
    notes: [],
    wrongQuestions: [],
  },
}

describe('store/backup', () => {
  it('当前 schema 版本为 2（notes 表引入），且 v1 仍在可导入列表', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2)
    expect(SUPPORTED_SCHEMA_VERSIONS).toContain(1)
  })

  it('序列化与解析保留日期字段', () => {
    const json = serializeBackup(validBackup)
    const parsed = parseBackup(json)
    expect(parsed.data.cards[0].due).toBeInstanceOf(Date)
    expect(parsed.data.cards[0].due.toISOString()).toBe('2026-08-18T00:00:00.000Z')
  })

  it('合法备份通过校验', () => {
    expect(validateBackupData(validBackup)).toEqual([])
  })

  it('非法 schemaVersion 被拒绝', () => {
    const invalid = { ...validBackup, schemaVersion: 99 }
    expect(validateBackupData(invalid).length).toBeGreaterThan(0)
  })

  it('缺少表数组被拒绝', () => {
    const invalid = {
      ...validBackup,
      data: { ...validBackup.data, cards: undefined },
    }
    expect(validateBackupData(invalid).length).toBeGreaterThan(0)
  })

  it('v1 旧备份缺 notes 表仍通过校验（向后兼容，导入按空表处理）', () => {
    const legacy = {
      ...validBackup,
      data: { ...validBackup.data, notes: undefined },
    }
    expect(validateBackupData(legacy)).toEqual([])
  })
})
