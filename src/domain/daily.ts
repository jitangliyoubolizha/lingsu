/**
 * 「每日内容」确定性抽样纯函数。
 * 同一日期键恒返回同一批、同序的元素——当日全站一致，跨天自动轮换。
 */

/** FNV-1a 字符串散列，把日期键映射为 32 位随机种子 */
function hashDateKey(dateKey: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32：小而均匀、可复现的伪随机序列 */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 从候选池按日期键确定性抽取 count 个（洗牌后取前 count）。
 * count 不小于池长时返回全池副本；不修改入参。
 * @param items 候选池
 * @param count 抽取数量
 * @param dateKey 日期键（如 2026-08-29），完全决定抽样结果
 */
export function pickDailyItems<T>(items: readonly T[], count: number, dateKey: string): T[] {
  if (count <= 0) return []
  if (count >= items.length) return [...items]
  const random = mulberry32(hashDateKey(dateKey))
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const temp = pool[i]
    pool[i] = pool[j]
    pool[j] = temp
  }
  return pool.slice(0, count)
}
