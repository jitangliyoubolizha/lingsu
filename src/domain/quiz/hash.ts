/**
 * 确定性哈希：FNV-1a 32 位。
 * 用于自动生成题的稳定 ID 与选项顺序。
 */

/**
 * 计算字符串的 FNV-1a 32 位哈希（无符号整数）。
 * @param input 输入字符串
 * @returns 无符号 32 位整数
 */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * 生成自动题稳定 ID。
 * @param book 书代码
 * @param edition 版本代码
 * @param sourceId 来源条文/方剂 ID
 * @param type 题型
 * @param params 参与哈希的参数
 * @returns 形如 `AUTO.<hash>` 的 ID
 */
export function createAutoQuestionId(
  book: string,
  edition: string,
  sourceId: string,
  type: string,
  params = ''
): string {
  const hash = fnv1a(`${book}.${edition}.${sourceId}.${type}.${params}`)
  return `AUTO.${hash.toString(36).toUpperCase()}`
}
