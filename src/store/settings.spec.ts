// @vitest-environment jsdom
import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from './db'
import { hasAgreed, markAgreed } from './settings'

const LS_KEY = 'lingsu.agreed'

describe('settings 协议同意状态持久化', () => {
  beforeEach(async () => {
    await db.settings.clear()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('正常路径：markAgreed 后 hasAgreed 为真，且同步写入 localStorage 镜像', async () => {
    await markAgreed()

    expect(await hasAgreed()).toBe(true)
    expect(localStorage.getItem(LS_KEY)).toBe('1')
    expect((await db.settings.get('agreed'))?.value).toBe(true)
  })

  it('IndexedDB 被清（如浏览器定期清理）但镜像仍在 → 仍视为已同意', async () => {
    await markAgreed()
    // 模拟 Safari 定期清理只影响部分存储、或清理工具删了 IDB 的场景
    await db.settings.delete('agreed')

    expect(await hasAgreed()).toBe(true)
  })

  it('IndexedDB 写入失败时不抛错、不阻断同意流程，镜像保底', async () => {
    vi.spyOn(db.settings, 'put').mockRejectedValueOnce(new Error('quota exceeded'))

    await expect(markAgreed()).resolves.toBeUndefined()
    expect(await hasAgreed()).toBe(true)
    expect(localStorage.getItem(LS_KEY)).toBe('1')
  })

  it('两处都无记录（全新用户）→ 未同意', async () => {
    expect(await hasAgreed()).toBe(false)
    expect(localStorage.getItem(LS_KEY)).toBeNull()
  })
})
