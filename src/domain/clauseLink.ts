/**
 * 条文间互链（E-3 / T1-5）：把文本中的「第 N 条」识别为可点击的条文引用。
 * 条文号 N 采用宋本全书号（1–398），映射由调用方通过 `clauseOrder` 完成。
 */

export interface ClauseRefSegment {
  type: 'text' | 'clause'
  text: string
  /** type === 'clause' 时的条文号（宋本全书号） */
  no?: number
}

const CN_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

/**
 * 中文数字转阿拉伯数字（支持 0–999 常见表达，如「十二」「一百七十九」「三百九十八」）。
 * @returns 转换结果；含无法识别的字符时返回 null
 */
export function chineseToNumber(text: string): number | null {
  if (!text) return null
  let section = 0
  let number = 0
  let recognized = false
  for (const char of text) {
    const digit = CN_DIGITS[char]
    if (digit !== undefined) {
      number = digit
      recognized = true
    } else if (char === '十') {
      section += (number || 1) * 10
      number = 0
      recognized = true
    } else if (char === '百') {
      section += (number || 1) * 100
      number = 0
      recognized = true
    } else {
      return null
    }
  }
  return recognized ? section + number : null
}

/**
 * 解析条文号 token（阿拉伯数字或中文数字）。
 * @returns 条文号；无法解析时返回 null
 */
export function parseClauseNo(token: string): number | null {
  if (/^\d+$/.test(token)) {
    return parseInt(token, 10)
  }
  return chineseToNumber(token)
}

const CLAUSE_REF_RE = /第\s*([零〇一二三四五六七八九十百]+|\d+)\s*条/g

/**
 * 把文本切分成段，将「第 N 条」（阿拉伯或中文数字）识别为 clause 段。
 * 只有条文号落在 1..totalClauses 范围内才视为有效链接，否则并入纯文本。
 */
export function segmentClauseRefs(text: string, totalClauses: number): ClauseRefSegment[] {
  const segments: ClauseRefSegment[] = []
  let textStart = 0
  const flushText = (end: number) => {
    if (end > textStart) {
      segments.push({ type: 'text', text: text.slice(textStart, end) })
    }
  }

  CLAUSE_REF_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = CLAUSE_REF_RE.exec(text)) !== null) {
    const no = parseClauseNo(match[1])
    const valid = no != null && no >= 1 && no <= totalClauses
    if (valid) {
      flushText(match.index)
      segments.push({ type: 'clause', text: match[0], no })
      textStart = match.index + match[0].length
    }
  }
  flushText(text.length)
  return segments
}
