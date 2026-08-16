import { describe, expect, it } from 'vitest'

import type { ContentData } from '../../data/types'
import {
  buildSearchIndex,
  getHighlightRanges,
  groupSearchResults,
  searchContent,
  tokenize,
} from './index'

const content: ContentData = {
  book: { code: 'SHL', name: '伤寒论', editions: [{ code: 'SB', name: '宋本' }] },
  edition: { code: 'SB', book: 'SHL', name: '宋本', source: 'test', chapters: [] },
  chapters: [],
  clauses: [
    {
      id: 'SHL.SB.TYS.001',
      no: 1,
      text: '太阳之为病，脉浮，头项强痛而恶寒。',
      translation: '怕冷',
      annotations: [{ source: 's', author: 'a', text: '恶寒为太阳病提纲' }],
      formulas: [],
      symptomTags: [],
      studyTags: ['太阳病提纲'],
    },
  ],
  formulas: [
    {
      id: 'SHL.SB.F.001',
      name: '桂枝汤',
      category: '桂枝汤类',
      composition: [{ herb: 'SHL.SB.H.001', dose: '三两' }],
      originalDoseText: '',
      doseReference: '',
      decoction: '',
      relatedClauses: ['SHL.SB.TYS.001'],
      relatedFormulas: [],
      safetyNotice: 'x',
      mainSymptoms: [],
      pulse: [],
      pathomechanism: '',
    },
  ],
  herbs: [{ id: 'SHL.SB.H.001', name: '桂枝', aliases: ['桂'] }],
  symptomTerms: [],
  questions: [],
}

describe('search/tokenizer', () => {
  it('中文按二字切词', () => {
    expect(tokenize('太阳病发热')).toEqual(['太阳', '阳病', '病发', '发热'])
  })

  it('高亮区间能定位关键词', () => {
    const ranges = getHighlightRanges('太阳之为病，恶寒。', '恶寒')
    expect(ranges).toEqual([[6, 8]])
  })
})

describe('search/index', () => {
  it('按关键词检索条文', () => {
    const index = buildSearchIndex(content)
    const results = searchContent(index, '恶寒')
    expect(results.some((item) => item.id === 'SHL.SB.TYS.001')).toBe(true)
  })

  it('按关键词检索方剂与药物', () => {
    const index = buildSearchIndex(content)
    const results = searchContent(index, '桂枝')
    const grouped = groupSearchResults(results)
    expect(grouped.formulas.some((item) => item.id === 'SHL.SB.F.001')).toBe(true)
    expect(grouped.herbs.some((item) => item.id === 'SHL.SB.H.001')).toBe(true)
  })
})
