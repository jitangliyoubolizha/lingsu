import { describe, expect, it } from 'vitest'

import type { ContentData } from '../../data/types'
import { buildHerbFormulaIndex, deriveFormulaFields, getHerbFormulaNames } from './index'

const content: ContentData = {
  book: { code: 'SHL', name: '伤寒论', editions: [{ code: 'SB', name: '宋本' }] },
  edition: { code: 'SB', book: 'SHL', name: '宋本', source: 'test', chapters: [] },
  chapters: [],
  clauses: [
    {
      id: 'SHL.SB.TYS.001',
      no: 1,
      text: '太阳之为病，发热，恶寒。',
      translation: 't',
      annotations: [{ source: 's', author: 'a', text: 'a' }],
      formulas: ['SHL.SB.F.001'],
      symptomTags: ['SHL.SB.SYM.001', 'SHL.SB.SYM.002', 'SHL.SB.SYM.003'],
      studyTags: [],
    },
    {
      id: 'SHL.SB.TYS.002',
      no: 2,
      text: '太阳病，发热，汗出。',
      translation: 't',
      annotations: [{ source: 's', author: 'a', text: 'a' }],
      formulas: ['SHL.SB.F.001'],
      symptomTags: ['SHL.SB.SYM.001', 'SHL.SB.SYM.004'],
      studyTags: [],
    },
  ],
  formulas: [
    {
      id: 'SHL.SB.F.001',
      name: '桂枝汤',
      category: '桂枝汤类',
      composition: [
        { herb: 'SHL.SB.H.001', dose: '三两' },
        { herb: 'SHL.SB.H.002', dose: '三两' },
      ],
      originalDoseText: '',
      doseReference: '',
      decoction: '',
      relatedClauses: ['SHL.SB.TYS.001', 'SHL.SB.TYS.002'],
      relatedFormulas: [],
      safetyNotice: 'x',
      mainSymptoms: [],
      pulse: [],
      pathomechanism: '',
    },
  ],
  herbs: [
    { id: 'SHL.SB.H.001', name: '桂枝', aliases: [] },
    { id: 'SHL.SB.H.002', name: '芍药', aliases: [] },
    { id: 'SHL.SB.H.003', name: '大枣', aliases: [] },
  ],
  symptomTerms: [
    { id: 'SHL.SB.SYM.001', name: '发热', category: '症状', aliases: [] },
    { id: 'SHL.SB.SYM.002', name: '恶寒', category: '症状', aliases: [] },
    { id: 'SHL.SB.SYM.003', name: '脉浮', category: '脉象', aliases: [] },
    { id: 'SHL.SB.SYM.004', name: '汗出', category: '症状', aliases: [] },
    { id: 'SHL.SB.SYM.005', name: '营卫不和', category: '病机', aliases: [] },
  ],
  questions: [],
}

describe('formula/derive', () => {
  it('自动推导主症按频次排序', () => {
    const derived = deriveFormulaFields(content.formulas[0], content)
    expect(derived.mainSymptoms[0]).toBe('SHL.SB.SYM.001')
    expect(derived.mainSymptoms).toContain('SHL.SB.SYM.002')
    expect(derived.pulse).toEqual(['SHL.SB.SYM.003'])
  })

  it('手工填写值优先', () => {
    const formula = {
      ...content.formulas[0],
      mainSymptoms: ['SHL.SB.SYM.002'],
      pulse: ['SHL.SB.SYM.003'],
      pathomechanism: '营卫不和',
    }
    const derived = deriveFormulaFields(formula, content)
    expect(derived.mainSymptoms).toEqual(['SHL.SB.SYM.002'])
    expect(derived.pathomechanism).toBe('营卫不和')
  })

  it('药物反查返回方剂', () => {
    const index = buildHerbFormulaIndex(content)
    expect(index.get('SHL.SB.H.001')).toEqual(['SHL.SB.F.001'])
    expect(getHerbFormulaNames('SHL.SB.H.001', content)).toEqual(['桂枝汤'])
  })
})
