import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { loadContent } from '../src/data'
import { validateContent } from '../scripts/validator'

describe('内容数据层', () => {
  it('太阳病上中下篇内容可通过校验', async () => {
    const issues = await validateContent(path.resolve('content'))
    expect(issues).toEqual([])
  })

  it('构建产物可加载且包含太阳病上中下篇数据', () => {
    const content = loadContent()

    expect(content.book.code).toBe('SHL')
    expect(content.edition.code).toBe('SB')
    expect(content.clauses).toHaveLength(80)
    expect(content.formulas).toHaveLength(31)
    expect(content.herbs).toHaveLength(37)
    expect(content.symptomTerms).toHaveLength(84)
    expect(content.questions).toHaveLength(12)

    const firstClause = content.clauses[0]
    expect(firstClause.id).toBe('SHL.SB.TYS.001')
    expect(firstClause.annotations.length).toBeGreaterThan(0)
  })
})
