import 'fake-indexeddb/auto'

import Dexie, { type Table } from 'dexie'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  exportData,
  getLastPreImportBackup,
  importData,
  serializeBackup,
  type BackupData,
} from './backup'
import { db } from './db'
import {
  addWrongQuestion,
  getDueWrongQuestions,
  getWrongQuestions,
  markWrongCorrect,
  resolveWrongQuestion,
} from './logs'
import { CURRENT_SCHEMA_VERSION } from './migrations'

function baseData(): BackupData['data'] {
  return {
    settings: [],
    studyPlans: [],
    clauseStates: [],
    cards: [],
    reviewLogs: [],
    dailyLogs: [],
    quizLogs: [],
    favorites: [],
    wrongQuestions: [],
    notes: [],
  }
}

function makeBackup(overrides: Partial<BackupData> = {}): BackupData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: '2026-08-17T00:00:00.000Z',
    appVersion: '0.1.0',
    data: baseData(),
    ...overrides,
  }
}

describe('store/db 真库', () => {
  beforeEach(async () => {
    await db.delete().catch(() => undefined)
    await db.open()
  })

  afterEach(async () => {
    await db.delete().catch(() => undefined)
  })

  it('Dexie 各表可读写', async () => {
    await db.settings.put({ key: 'theme', value: 'paper' })
    const stored = await db.settings.get('theme')
    expect(stored?.value).toBe('paper')
  })

  it('版本升级迁移不丢数据', async () => {
    const name = `lingsu-migrate-${Date.now()}`
    class V1Db extends Dexie {
      kv!: Table<{ key: string; value: number }, string>
      constructor() {
        super(name)
        this.version(1).stores({ kv: 'key' })
      }
    }
    const v1 = new V1Db()
    await v1.kv.put({ key: 'a', value: 1 })
    v1.close()

    class V2Db extends Dexie {
      kv!: Table<{ key: string; value: number }, string>
      second!: Table<{ id?: number; name: string }, number>
      constructor() {
        super(name)
        this.version(2).stores({ kv: 'key', second: '++id' })
      }
    }
    const v2 = new V2Db()
    expect((await v2.kv.get('a'))?.value).toBe(1)
    await v2.second.add({ name: 'x' })
    const rows = await v2.second.toArray()
    expect(rows).toHaveLength(1)
    v2.delete()
  })

  it('错题表 v1→v2 升级补齐 dueAt 与 correctStreak', async () => {
    db.close()
    await db.delete()

    const legacy = new Dexie('lingsu')
    legacy.version(1).stores({ wrongQuestions: 'questionId, lastWrongAt, wrongCount' })
    await legacy.open()
    const wrongDate = new Date('2026-08-17T08:00:00+08:00')
    await legacy.table('wrongQuestions').put({
      questionId: 'Q.LEGACY',
      lastWrongAt: wrongDate,
      wrongCount: 2,
      resolved: false,
    })
    legacy.close()

    await db.open()
    const record = await db.wrongQuestions.get('Q.LEGACY')
    expect(record?.dueAt).toEqual(wrongDate)
    expect(record?.correctStreak).toBe(0)
  })

  it('导出可序列化并再次导入恢复数据', async () => {
    await db.settings.put({ key: 'name', value: '灵素' })
    const backup = await exportData()
    const json = serializeBackup(backup)

    await db.settings.clear()
    expect(await db.settings.get('name')).toBeUndefined()

    await importData(json)
    expect((await db.settings.get('name'))?.value).toBe('灵素')
  })

  it('非法备份导入被拒绝且不破坏现有数据', async () => {
    await db.settings.put({ key: 'keep', value: 1 })
    const invalid = makeBackup({ schemaVersion: 99 })
    await expect(importData(serializeBackup(invalid))).rejects.toThrow()
    expect((await db.settings.get('keep'))?.value).toBe(1)
  })

  it('导入前自动备份当前数据', async () => {
    await db.settings.put({ key: 'old', value: 'before' })
    const incoming = makeBackup()
    incoming.data.settings = [{ key: 'old', value: 'after' }]

    await importData(serializeBackup(incoming))
    const preBackup = getLastPreImportBackup()
    expect(preBackup).not.toBeNull()
    expect(preBackup).toContain('"old"')
    expect(preBackup).toContain('"before"')
  })

  it('导入写入失败回滚，原数据不被破坏', async () => {
    await db.settings.put({ key: 'keep', value: 'origin' })
    const incoming = makeBackup()
    // 重复主键导致 bulkAdd 失败，事务应回滚
    incoming.data.settings = [
      { key: 'dup', value: 1 },
      { key: 'dup', value: 2 },
    ]
    await expect(importData(serializeBackup(incoming))).rejects.toThrow()
    const rows = await db.settings.toArray()
    expect(rows).toEqual([{ key: 'keep', value: 'origin' }])
  })
})

describe('store/logs 错题本', () => {
  beforeEach(async () => {
    await db.delete().catch(() => undefined)
    await db.open()
  })

  afterEach(async () => {
    await db.delete().catch(() => undefined)
  })

  it('首次答错创建错题记录，重复答错累计次数并重置 resolved', async () => {
    const first = new Date('2026-08-17T00:00:00Z')
    const second = new Date('2026-08-18T00:00:00Z')

    await addWrongQuestion('Q.1', first)
    await addWrongQuestion('Q.1', second)

    const records = await getWrongQuestions()
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ questionId: 'Q.1', wrongCount: 2, resolved: false })
    expect(records[0].lastWrongAt).toEqual(second)
    expect(records[0].correctStreak).toBe(0)
    expect(records[0].dueAt).toEqual(new Date('2026-08-19T00:00:00Z'))
  })

  it('答对一次进入 3 天后复测，连续答对两次标记已掌握', async () => {
    const firstCorrect = new Date('2026-08-18T00:00:00Z')
    const secondCorrect = new Date('2026-08-21T00:00:00Z')
    await addWrongQuestion('Q.1', new Date('2026-08-17T00:00:00Z'))

    await markWrongCorrect('Q.1', firstCorrect)
    let records = await getWrongQuestions()
    expect(records[0]).toMatchObject({ correctStreak: 1, resolved: false })
    expect(records[0].dueAt).toEqual(new Date('2026-08-21T00:00:00Z'))

    await markWrongCorrect('Q.1', secondCorrect)
    records = await getWrongQuestions()
    expect(records[0]).toMatchObject({ correctStreak: 2, resolved: true })
  })

  it('到期队列只返回未解决且到期的错题，最多 10 条', async () => {
    const now = new Date('2026-08-18T12:00:00+08:00')
    for (let index = 0; index < 12; index += 1) {
      await addWrongQuestion(
        `Q.${index}`,
        new Date(now.getTime() - 24 * 60 * 60 * 1000 - (index + 1) * 60_000)
      )
    }
    const due = await getDueWrongQuestions(now)
    expect(due).toHaveLength(10)
  })

  it('手动移出仍可一次标记已掌握', async () => {
    await addWrongQuestion('Q.1', new Date('2026-08-17T08:00:00+08:00'))
    await resolveWrongQuestion('Q.1')

    const records = await getWrongQuestions()
    expect(records).toHaveLength(1)
    expect(records[0].resolved).toBe(true)
    expect(records[0].wrongCount).toBe(1)
  })

  it('对不存在的错题 resolve 是幂等无副作用操作', async () => {
    await expect(resolveWrongQuestion('Q.NONE')).resolves.toBeUndefined()
    expect(await getWrongQuestions()).toEqual([])
  })
})
