import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { loadContent } from '../src/data'
import { validateContent } from '../scripts/validator'

describe('内容数据层', () => {
  it('太阳病上中下篇内容可通过校验', async () => {
    const issues = await validateContent(path.resolve('content'))
    expect(issues).toEqual([])
  })

  it('构建产物可加载且包含太阳病上中下篇数据', async () => {
    const content = await loadContent()

    expect(content.book.code).toBe('SHL')
    expect(content.edition.code).toBe('SB')
    expect(content.clauses).toHaveLength(398)
    expect(content.formulas).toHaveLength(112)
    expect(content.herbs).toHaveLength(81)
    expect(content.symptomTerms).toHaveLength(213)
    expect(content.questions).toHaveLength(36)

    const firstClause = content.clauses[0]
    expect(firstClause.id).toBe('SHL.SB.TYS.001')
    expect(firstClause.annotations.length).toBeGreaterThan(0)
  })

  it('81 味药物本草卡字段齐备', async () => {
    const content = await loadContent()
    for (const herb of content.herbs) {
      expect(herb.category, `${herb.id} 缺少 category`).toBeTruthy()
      expect(herb.nature, `${herb.id} 缺少 nature`).toBeTruthy()
      expect(herb.meridians?.length, `${herb.id} 缺少 meridians`).toBeGreaterThan(0)
      expect(herb.effects, `${herb.id} 缺少 effects`).toBeTruthy()
      expect(herb.applications, `${herb.id} 缺少 applications`).toBeTruthy()
      expect(herb.dosage, `${herb.id} 缺少 dosage`).toBeTruthy()
      expect(herb.cautions, `${herb.id} 缺少 cautions`).toBeTruthy()
    }
  })
})
