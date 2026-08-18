/**
 * UI 展示格式化：把内部 ID / 枚举转成用户可见的中文。
 * 仅用于展示层，不改动数据。
 */

const CHAPTER_NAMES: Record<string, string> = {
  TYS: '太阳病上篇',
  TYZ: '太阳病中篇',
  TYX: '太阳病下篇',
}

/**
 * 把条文 ID（如 SHL.SB.TYS.001）格式化为「太阳病上篇 · 第 1 条」。
 */
export function formatClauseRef(id: string): string {
  const parts = id.split('.')
  if (parts.length >= 4) {
    const chapter = CHAPTER_NAMES[parts[2]] ?? parts[2]
    const no = Number(parts[3])
    if (Number.isFinite(no)) {
      return `${chapter} · 第 ${no} 条`
    }
  }
  return id
}

/**
 * 把篇代码（如 TYS）转成篇名。
 */
export function formatChapterCode(code: string): string {
  return CHAPTER_NAMES[code] ?? code
}

/**
 * 把题型枚举转成中文题型名。
 */
export function formatQuizType(type: string): string {
  switch (type) {
    case 'fill_blank':
      return '填空题'
    case 'clause_chain':
      return '条文接龙'
    case 'formula_syndrome_match':
      return '方证匹配'
    case 'formula_composition':
      return '方剂组成'
    default:
      return type
  }
}
