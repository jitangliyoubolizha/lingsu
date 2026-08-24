import { describe, expect, it } from 'vitest'

import { chineseToNumber, parseClauseNo, segmentClauseRefs } from './clauseLink'

describe('clauseLink/chineseToNumber 中文数字转阿拉伯', () => {
  it('解析一至十与组合', () => {
    expect(chineseToNumber('一')).toBe(1)
    expect(chineseToNumber('十')).toBe(10)
    expect(chineseToNumber('十一')).toBe(11)
    expect(chineseToNumber('十二')).toBe(12)
    expect(chineseToNumber('十八')).toBe(18)
    expect(chineseToNumber('二十')).toBe(20)
    expect(chineseToNumber('二十一')).toBe(21)
    expect(chineseToNumber('三十')).toBe(30)
  })

  it('解析含百的组合', () => {
    expect(chineseToNumber('一百')).toBe(100)
    expect(chineseToNumber('一百零一')).toBe(101)
    expect(chineseToNumber('一百七十九')).toBe(179)
    expect(chineseToNumber('二百')).toBe(200)
    expect(chineseToNumber('三百九十八')).toBe(398)
  })

  it('零与非法输入', () => {
    expect(chineseToNumber('零')).toBe(0)
    expect(chineseToNumber('〇')).toBe(0)
    expect(chineseToNumber('abc')).toBeNull()
    expect(chineseToNumber('')).toBeNull()
  })
})

describe('clauseLink/parseClauseNo 条文号解析', () => {
  it('阿拉伯数字', () => {
    expect(parseClauseNo('12')).toBe(12)
    expect(parseClauseNo('179')).toBe(179)
    expect(parseClauseNo('398')).toBe(398)
  })

  it('中文数字', () => {
    expect(parseClauseNo('十二')).toBe(12)
    expect(parseClauseNo('一百七十九')).toBe(179)
    expect(parseClauseNo('三百九十八')).toBe(398)
  })
})

describe('clauseLink/segmentClauseRefs 文本分段', () => {
  it('无引用时整体为一段纯文本', () => {
    expect(segmentClauseRefs('太阳之为病，脉浮，恶寒。', 398)).toEqual([
      { type: 'text', text: '太阳之为病，脉浮，恶寒。' },
    ])
  })

  it('识别阿拉伯数字条文引用', () => {
    expect(segmentClauseRefs('详见第 12 条。', 398)).toEqual([
      { type: 'text', text: '详见' },
      { type: 'clause', text: '第 12 条', no: 12 },
      { type: 'text', text: '。' },
    ])
  })

  it('识别中文数字条文引用', () => {
    expect(segmentClauseRefs('此承第十二条而言。', 398)).toEqual([
      { type: 'text', text: '此承' },
      { type: 'clause', text: '第十二条', no: 12 },
      { type: 'text', text: '而言。' },
    ])
  })

  it('识别百位中文数字', () => {
    expect(segmentClauseRefs('见第一百七十九条。', 398)).toEqual([
      { type: 'text', text: '见' },
      { type: 'clause', text: '第一百七十九条', no: 179 },
      { type: 'text', text: '。' },
    ])
  })

  it('同一段多处引用', () => {
    expect(segmentClauseRefs('第1条与第2条互参。', 398)).toEqual([
      { type: 'clause', text: '第1条', no: 1 },
      { type: 'text', text: '与' },
      { type: 'clause', text: '第2条', no: 2 },
      { type: 'text', text: '互参。' },
    ])
  })

  it('超出范围（条文号大于总数）不视为链接', () => {
    expect(segmentClauseRefs('见第 500 条。', 398)).toEqual([
      { type: 'text', text: '见第 500 条。' },
    ])
  })

  it('条文号为 0 不视为链接', () => {
    expect(segmentClauseRefs('见第 0 条。', 398)).toEqual([
      { type: 'text', text: '见第 0 条。' },
    ])
  })
})
