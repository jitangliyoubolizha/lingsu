import { describe, expect, it } from 'vitest'

import { isNoticeVisible, NOTICE_TTL_DAYS } from './useNoticeBar'

const DAY = 24 * 60 * 60 * 1000

describe('isNoticeVisible 收纳策略', () => {
  it('从未收起 → 显示', () => {
    expect(isNoticeVisible(null, 1_000_000)).toBe(true)
    expect(isNoticeVisible(undefined, 1_000_000)).toBe(true)
    expect(isNoticeVisible(0, 1_000_000)).toBe(true)
  })

  it('刚收起 → 静默期内不显示', () => {
    const now = Date.now()
    expect(isNoticeVisible(now - 1000, now)).toBe(false)
    expect(isNoticeVisible(now - (NOTICE_TTL_DAYS - 1) * DAY, now)).toBe(false)
  })

  it('超过静默期 → 恢复显示', () => {
    const now = Date.now()
    expect(isNoticeVisible(now - NOTICE_TTL_DAYS * DAY, now)).toBe(true)
    expect(isNoticeVisible(now - (NOTICE_TTL_DAYS + 3) * DAY, now)).toBe(true)
  })

  it('静默期恰好为 7 天', () => {
    expect(NOTICE_TTL_DAYS).toBe(7)
  })
})
