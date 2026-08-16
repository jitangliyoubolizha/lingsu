import { describe, expect, it } from 'vitest'

import type { ContentData } from '../../data/types'
import { createAutoQuestionId, fnv1a, generateAutoQuestions } from './index'

const content: ContentData = {
  book: { code: 'SHL', name: '伤寒论', editions: [{ code: 'SB', name: '宋本' }] },
  edition: {
    code: 'SB',
    book: 'SHL',
    name: '宋本',
    source: 'test',
    chapters: [],
  },
  chapters: [],
  clauses: [
    {
      id: 'SHL.SB.TYS.001',
      no: 1,
      text: '太阳之为病，脉浮，头项强痛而恶寒。',
      translation: 't',
      annotations: [{ source: 's', author: 'a', text: 'a' }],
      formulas: ['SHL.SB.F.001'],
      symptomTags: ['SHL.SB.SYM.001', 'SHL.SB.SYM.002', 'SHL.SB.SYM.003'],
      studyTags: [],
    },
    {
      id: 'SHL.SB.TYS.002',
      no: 2,
      text: '太阳病，发热，汗出，恶风，脉缓者，名为中风。',
      translation: 't',
      annotations: [{ source: 's', author: 'a', text: 'a' }],
      formulas: ['SHL.SB.F.001'],
      symptomTags: ['SHL.SB.SYM.004', 'SHL.SB.SYM.005', 'SHL.SB.SYM.006'],
      studyTags: [],
    },
    {
      id: 'SHL.SB.TYS.003',
      no: 3,
      text: '太阳病，头痛发热，身疼腰痛，骨节疼痛，恶风，无汗而喘者，麻黄汤主之。',
      translation: 't',
      annotations: [{ source: 's', author: 'a', text: 'a' }],
      formulas: ['SHL.SB.F.002'],
      symptomTags: ['SHL.SB.SYM.004', 'SHL.SB.SYM.005', 'SHL.SB.SYM.007'],
      studyTags: [],
    },
    {
      id: 'SHL.SB.TYS.004',
      no: 4,
      text: '太阳病，项背强几几，反汗出恶风者，桂枝加葛根汤主之。',
      translation: 't',
      annotations: [{ source: 's', author: 'a', text: 'a' }],
      formulas: ['SHL.SB.F.003'],
      symptomTags: ['SHL.SB.SYM.005', 'SHL.SB.SYM.008'],
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
        { herb: 'SHL.SB.H.003', dose: '二两' },
        { herb: 'SHL.SB.H.004', dose: '三两' },
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
    {
      id: 'SHL.SB.F.002',
      name: '麻黄汤',
      category: '麻黄汤类',
      composition: [
        { herb: 'SHL.SB.H.001', dose: '三两' },
        { herb: 'SHL.SB.H.005', dose: '二两' },
        { herb: 'SHL.SB.H.006', dose: '七十个' },
        { herb: 'SHL.SB.H.003', dose: '一两' },
      ],
      originalDoseText: '',
      doseReference: '',
      decoction: '',
      relatedClauses: ['SHL.SB.TYS.003'],
      relatedFormulas: [],
      safetyNotice: 'x',
      mainSymptoms: [],
      pulse: [],
      pathomechanism: '',
    },
    {
      id: 'SHL.SB.F.003',
      name: '桂枝加葛根汤',
      category: '桂枝汤类',
      composition: [
        { herb: 'SHL.SB.H.007', dose: '四两' },
        { herb: 'SHL.SB.H.001', dose: '二两' },
        { herb: 'SHL.SB.H.002', dose: '二两' },
        { herb: 'SHL.SB.H.003', dose: '二两' },
      ],
      originalDoseText: '',
      doseReference: '',
      decoction: '',
      relatedClauses: ['SHL.SB.TYS.004'],
      relatedFormulas: [],
      safetyNotice: 'x',
      mainSymptoms: [],
      pulse: [],
      pathomechanism: '',
    },
    {
      id: 'SHL.SB.F.004',
      name: '大青龙汤',
      category: '麻黄汤类',
      composition: [
        { herb: 'SHL.SB.H.005', dose: '六两' },
        { herb: 'SHL.SB.H.001', dose: '二两' },
        { herb: 'SHL.SB.H.003', dose: '二两' },
        { herb: 'SHL.SB.H.008', dose: '十二枚' },
      ],
      originalDoseText: '',
      doseReference: '',
      decoction: '',
      relatedClauses: [],
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
    { id: 'SHL.SB.H.003', name: '甘草', aliases: [] },
    { id: 'SHL.SB.H.004', name: '生姜', aliases: [] },
    { id: 'SHL.SB.H.005', name: '麻黄', aliases: [] },
    { id: 'SHL.SB.H.006', name: '杏仁', aliases: [] },
    { id: 'SHL.SB.H.007', name: '葛根', aliases: [] },
    { id: 'SHL.SB.H.008', name: '大枣', aliases: [] },
  ],
  symptomTerms: [
    { id: 'SHL.SB.SYM.001', name: '恶寒', category: '症状', aliases: [] },
    { id: 'SHL.SB.SYM.002', name: '脉浮', category: '脉象', aliases: [] },
    { id: 'SHL.SB.SYM.003', name: '头项强痛', category: '症状', aliases: [] },
    { id: 'SHL.SB.SYM.004', name: '发热', category: '症状', aliases: [] },
    { id: 'SHL.SB.SYM.005', name: '汗出', category: '症状', aliases: [] },
    { id: 'SHL.SB.SYM.006', name: '脉缓', category: '脉象', aliases: [] },
    { id: 'SHL.SB.SYM.007', name: '身疼', category: '症状', aliases: [] },
    { id: 'SHL.SB.SYM.008', name: '项背强', category: '症状', aliases: [] },
  ],
  questions: [],
}

describe('quiz/hash', () => {
  it('FNV-1a 哈希稳定', () => {
    expect(fnv1a('abc')).toBe(fnv1a('abc'))
    expect(fnv1a('abc')).not.toBe(fnv1a('abd'))
  })

  it('自动题 ID 稳定', () => {
    const id1 = createAutoQuestionId('SHL', 'SB', 'SHL.SB.TYS.001', 'fill_blank', '恶寒')
    const id2 = createAutoQuestionId('SHL', 'SB', 'SHL.SB.TYS.001', 'fill_blank', '恶寒')
    expect(id1).toBe(id2)
    expect(id1.startsWith('AUTO.')).toBe(true)
  })
})

describe('quiz/generator', () => {
  it('生成挖空题且选项为 4 个', () => {
    const questions = generateAutoQuestions(content, 'SHL.SB.TYS.001')
    const fillBlank = questions.find((question) => question.type === 'fill_blank')
    expect(fillBlank).toBeDefined()
    expect(fillBlank?.options).toHaveLength(4)
    expect(fillBlank?.prompt).toContain('＿＿＿')
  })

  it('生成条文接龙题', () => {
    const questions = generateAutoQuestions(content, 'SHL.SB.TYS.001')
    const chain = questions.find((question) => question.type === 'clause_chain')
    expect(chain).toBeDefined()
    expect(chain?.options).toHaveLength(4)
  })

  it('生成方证匹配题', () => {
    const questions = generateAutoQuestions(content, 'SHL.SB.TYS.001')
    const match = questions.find((question) => question.type === 'formula_syndrome_match')
    expect(match).toBeDefined()
    expect(match?.options).toHaveLength(4)
  })

  it('生成方剂组成题', () => {
    const questions = generateAutoQuestions(content)
    const composition = questions.find((question) => question.type === 'formula_composition')
    expect(composition).toBeDefined()
    expect(composition?.options).toHaveLength(4)
  })
})
