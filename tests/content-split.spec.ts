import { describe, expect, it } from 'vitest'

import {
  chapterCodeOfClause,
  loadAllChapters,
  loadAllFormulas,
  loadChapter,
  loadContent,
  loadFormula,
  loadMeta,
} from '../src/data'

describe('内容按篇懒加载（T1-6）', () => {
  it('loadMeta 同步返回篇章元数据、全书顺序与方剂摘要', () => {
    const meta = loadMeta()

    expect(meta.chapters).toHaveLength(10)
    expect(meta.chapters.map((chapter) => chapter.code)).toEqual([
      'TYS', 'TYZ', 'TYX', 'YM', 'SY', 'TAI', 'SI', 'JUE', 'HUO', 'YI',
    ])
    expect(meta.chapters.reduce((sum, chapter) => sum + chapter.clauseCount, 0)).toBe(398)
    expect(meta.clauseOrder).toHaveLength(398)
    expect(meta.clauseOrder[0]).toBe('SHL.SB.TYS.001')
    expect(meta.formulas).toHaveLength(112)
    expect(meta.herbs).toHaveLength(81)
    expect(meta.questions).toHaveLength(36)
  })

  it('loadChapter 按篇加载条文，meta 不含条文正文', async () => {
    const chapter = await loadChapter('TYS')

    expect(chapter?.code).toBe('TYS')
    expect(chapter?.clauses).toHaveLength(30)
    expect(chapter?.clauses[0]?.id).toBe('SHL.SB.TYS.001')
    // 译文只存在于章节产物中，meta 不应携带条文译文
    expect(JSON.stringify(loadMeta())).not.toContain('太阳病的提纲')
  })

  it('未知篇章返回 undefined，不抛错', async () => {
    await expect(loadChapter('NOPE')).resolves.toBeUndefined()
  })

  it('loadChapter 缓存已加载篇章', async () => {
    const first = await loadChapter('TYZ')
    const second = await loadChapter('TYZ')
    expect(second).toBe(first)
  })

  it('loadAllChapters 按篇章顺序返回全部章节', async () => {
    const chapters = await loadAllChapters()
    expect(chapters.map((chapter) => chapter.code)).toEqual([
      'TYS', 'TYZ', 'TYX', 'YM', 'SY', 'TAI', 'SI', 'JUE', 'HUO', 'YI',
    ])
    expect(chapters.reduce((sum, chapter) => sum + chapter.clauses.length, 0)).toBe(398)
  })

  it('chapterCodeOfClause 依据全书顺序定位条文所属篇章', () => {
    expect(chapterCodeOfClause('SHL.SB.TYS.001')).toBe('TYS')
    expect(chapterCodeOfClause('SHL.SB.TYS.030')).toBe('TYS')
    expect(chapterCodeOfClause('SHL.SB.TYZ.031')).toBe('TYZ')
    expect(chapterCodeOfClause('SHL.SB.TYX.128')).toBe('TYX')
    expect(chapterCodeOfClause('SHL.SB.TYX.178')).toBe('TYX')
    expect(chapterCodeOfClause('SHL.SB.XX.999')).toBeUndefined()
  })

  it('loadAllFormulas 按需加载完整方剂，meta 仅保留摘要', async () => {
    const meta = loadMeta()
    expect(meta.formulas[0]).toEqual({
      id: 'SHL.SB.F.001',
      name: '桂枝汤',
      category: '桂枝汤类',
    })
    expect('composition' in (meta.formulas[0] ?? {})).toBe(false)

    const formulas = await loadAllFormulas()
    expect(formulas).toHaveLength(112)
    expect(formulas[0]?.name).toBe('桂枝汤')
    expect(formulas[0]?.composition.length).toBeGreaterThan(0)

    const formula = await loadFormula('SHL.SB.F.001')
    expect(formula?.name).toBe('桂枝汤')
    expect(formula?.composition.length).toBeGreaterThan(0)
    await expect(loadFormula('SHL.SB.F.999')).resolves.toBeUndefined()
  })

  it('loadContent 聚合全量数据，clauses 由章节派生且顺序正确', async () => {
    const content = await loadContent()

    expect(content.clauses).toHaveLength(398)
    expect(content.chapters).toHaveLength(10)
    expect(content.clauses[0]?.id).toBe('SHL.SB.TYS.001')
    expect(content.clauses[29]?.id).toBe('SHL.SB.TYS.030')
    expect(content.clauses[30]?.id).toBe('SHL.SB.TYZ.031')
    expect(content.clauses[177]?.id).toBe('SHL.SB.TYX.178')
    expect(content.formulas).toHaveLength(112)
    expect(content.formulas[0]?.composition.length).toBeGreaterThan(0)
    expect(content.questions).toHaveLength(36)
  })
})
