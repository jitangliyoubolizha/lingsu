import { describe, expect, it } from 'vitest'

import { formatChapterCode, formatClauseRef, formatQuizType } from '../src/ui/formatters'

describe('ui/formatters', () => {
  it('条文 ID 转为中文章节与条号', () => {
    expect(formatClauseRef('SHL.SB.TYS.001')).toBe('太阳病上篇 · 第 1 条')
    expect(formatClauseRef('SHL.SB.TYZ.097')).toBe('太阳病中篇 · 第 97 条')
    expect(formatClauseRef('SHL.SB.TYX.178')).toBe('太阳病下篇 · 第 178 条')
  })

  it('未知 ID 原样返回', () => {
    expect(formatClauseRef('unknown')).toBe('unknown')
  })

  it('篇代码转篇名', () => {
    expect(formatChapterCode('TYS')).toBe('太阳病上篇')
    expect(formatChapterCode('XYZ')).toBe('XYZ')
  })

  it('题型枚举转中文', () => {
    expect(formatQuizType('fill_blank')).toBe('填空题')
    expect(formatQuizType('clause_chain')).toBe('条文接龙')
    expect(formatQuizType('formula_syndrome_match')).toBe('方证匹配')
    expect(formatQuizType('formula_composition')).toBe('方剂组成')
    expect(formatQuizType('wat')).toBe('wat')
  })
})
