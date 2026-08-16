/**
 * 中文检索分词：中文按二字切词（bigram），英文/数字按单词切分。
 */

const CHINESE_RE = /[\u3400-\u9fff]/

/**
 * 将文本切成检索 token。
 * @param text 原始文本
 * @returns token 列表
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = []
  const segments = text.split(/\s+/)

  for (const segment of segments) {
    if (!segment) {
      continue
    }
    const chars = Array.from(segment)
    if (CHINESE_RE.test(segment)) {
      if (chars.length === 1) {
        tokens.push(chars[0])
      } else {
        for (let i = 0; i < chars.length - 1; i += 1) {
          tokens.push(`${chars[i]}${chars[i + 1]}`)
        }
      }
    } else {
      tokens.push(segment)
    }
  }

  return tokens
}

/**
 * 查询词归一化：小写并去空白。
 */
export function processTerm(term: string): string {
  return term.trim().toLowerCase()
}

/**
 * 获取原文中命中关键词的区间（用于高亮）。
 * 优先匹配完整关键词；未命中时回退到查询词中的二字片段。
 * @param text 原文
 * @param query 用户查询
 * @returns [start, end] 区间数组
 */
export function getHighlightRanges(text: string, query: string): Array<[number, number]> {
  const keywords = query.trim().split(/\s+/).filter(Boolean)
  const ranges: Array<[number, number]> = []

  for (const keyword of keywords) {
    let index = 0
    const lowerText = text.toLowerCase()
    const lowerKeyword = keyword.toLowerCase()
    while (index < text.length) {
      const found = lowerText.indexOf(lowerKeyword, index)
      if (found === -1) {
        break
      }
      ranges.push([found, found + keyword.length])
      index = found + keyword.length
    }
  }

  if (ranges.length > 0) {
    return ranges
  }

  // 回退：按 bigram 片段高亮
  const bigrams = tokenize(query)
  for (const bigram of bigrams) {
    if (bigram.length < 2) {
      continue
    }
    let index = 0
    const lowerText = text.toLowerCase()
    const lowerBigram = bigram.toLowerCase()
    while (index < text.length) {
      const found = lowerText.indexOf(lowerBigram, index)
      if (found === -1) {
        break
      }
      ranges.push([found, found + bigram.length])
      index = found + bigram.length
    }
  }

  return ranges
}
