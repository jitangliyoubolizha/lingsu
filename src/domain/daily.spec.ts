import { describe, expect, it } from 'vitest'

import { pickDailyItems } from './daily'

describe('pickDailyItems 每日确定性抽样', () => {
  const pool = Array.from({ length: 15 }, (_, i) => i)

  it('同一日期键多次调用结果一致（同批同序）', () => {
    const first = pickDailyItems(pool, 5, '2026-08-29')
    const second = pickDailyItems(pool, 5, '2026-08-29')
    expect(second).toEqual(first)
  })

  it('不同日期键产生不同组合（连续 30 天至少 5 种）', () => {
    const combos = new Set<string>()
    for (let day = 1; day <= 30; day++) {
      const key = `2026-09-${String(day).padStart(2, '0')}`
      combos.add(pickDailyItems(pool, 5, key).join(','))
    }
    expect(combos.size).toBeGreaterThanOrEqual(5)
  })

  it('抽取数量正确且元素全部来自候选池', () => {
    const picked = pickDailyItems(pool, 5, '2026-08-29')
    expect(picked).toHaveLength(5)
    for (const item of picked) {
      expect(pool).toContain(item)
    }
  })

  it('count 不小于池长时返回全池，count 为 0 返回空数组', () => {
    expect(pickDailyItems(pool, 15, '2026-08-29')).toEqual(pool)
    expect(pickDailyItems(pool, 20, '2026-08-29')).toEqual(pool)
    expect(pickDailyItems(pool, 0, '2026-08-29')).toEqual([])
  })

  it('纯函数：不修改入参顺序', () => {
    const source = [3, 1, 2]
    pickDailyItems(source, 2, '2026-08-29')
    expect(source).toEqual([3, 1, 2])
  })
})
