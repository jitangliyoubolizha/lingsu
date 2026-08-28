// @vitest-environment jsdom
import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { db } from './db'
import { exportData, importData, serializeBackup } from './backup'
import { deleteNote, getNote, saveNote } from './notes'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('notes 条文笔记存储', () => {
  it('saveNote 写入后 getNote 可读回，含更新时间', async () => {
    await saveNote('SHL.SB.TYS.012', '桂枝汤主证：汗出、脉缓。')

    const note = await getNote('SHL.SB.TYS.012')
    expect(note?.content).toBe('桂枝汤主证：汗出、脉缓。')
    expect(note?.clauseId).toBe('SHL.SB.TYS.012')
    expect(note?.updatedAt).toBeInstanceOf(Date)
  })

  it('重复保存同一条文为覆盖更新（一条条文一篇笔记）', async () => {
    await saveNote('C1', '第一版')
    await saveNote('C1', '第二版')

    expect((await getNote('C1'))?.content).toBe('第二版')
    expect(await db.notes.count()).toBe(1)
  })

  it('保存空内容等价于删除笔记', async () => {
    await saveNote('C1', '有内容')
    await saveNote('C1', '   ')

    expect(await getNote('C1')).toBeNull()
    expect(await db.notes.count()).toBe(0)
  })

  it('deleteNote 删除后读回为 null；无记录时删除不抛错', async () => {
    await saveNote('C1', '内容')
    await deleteNote('C1')
    expect(await getNote('C1')).toBeNull()

    await expect(deleteNote('NOT.EXIST')).resolves.toBeUndefined()
  })
})

describe('notes 随备份导出 / 导入', () => {
  it('导出包含 notes 表；清库导入后笔记恢复', async () => {
    await saveNote('SHL.SB.TYS.012', '笔记甲')
    await saveNote('SHL.SB.TYS.013', '笔记乙')

    const backup = await exportData()
    expect(backup.data.notes.map((n) => n.clauseId).sort()).toEqual([
      'SHL.SB.TYS.012',
      'SHL.SB.TYS.013',
    ])

    await Promise.all(db.tables.map((table) => table.clear()))
    await importData(serializeBackup(backup))

    expect((await getNote('SHL.SB.TYS.012'))?.content).toBe('笔记甲')
    expect((await getNote('SHL.SB.TYS.013'))?.content).toBe('笔记乙')
  })
})
