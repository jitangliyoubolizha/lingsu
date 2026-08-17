import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { validateContent } from '../scripts/validator'

const activeDirs: string[] = []

async function createContent(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'lingsu-content-'))
  activeDirs.push(root)
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel)
    const dir = join(root, rel.split('/').slice(0, -1).join('/'))
    await mkdir(dir, { recursive: true })
    await writeFile(full, content, 'utf8')
  }
  return root
}

afterEach(async () => {
  while (activeDirs.length > 0) {
    const dir = activeDirs.pop()
    if (dir) await rm(dir, { recursive: true, force: true })
  }
})

const VALID_CHAPTER = `chapter:
  code: TYS
  name: 辨太阳病脉证并治上
  order: 1
  part: 1
  part_total: 1
clauses:
  - id: SHL.SB.TYS.001
    no: 1
    text: 太阳之为病，脉浮，头项强痛而恶寒。
    translation: 测试译文。
    annotations:
      - source: 测试注本
        author: 测试
        text: 测试注解。
    formulas:
      - SHL.SB.F.001
    symptom_tags:
      - SHL.SB.SYM.001
    study_tags: []
`

function validFiles(): Record<string, string> {
  return {
    'book.yaml': `code: SHL
name: 伤寒论
description: 测试
editions:
  - code: SB
    name: 宋本
`,
    'sb/edition.yaml': `code: SB
book: SHL
name: 宋本
source: 测试底本
chapters:
  - code: TYS
    name: 辨太阳病脉证并治上
    order: 1
    files:
      - chapters/a.yaml
`,
    'sb/chapters/a.yaml': VALID_CHAPTER,
    'sb/formulas.yaml': `formulas:
  - id: SHL.SB.F.001
    name: 桂枝汤
    category: 桂枝汤类
    composition:
      - herb: SHL.SB.H.001
        dose: 三两
        note: ""
    original_dose_text: 桂枝三两
    dose_reference: 测试换算参考，非用药指导。
    decoction: 以水煮取。
    related_clauses:
      - SHL.SB.TYS.001
    related_formulas: []
    safety_notice: 仅供学习研究，不构成医疗建议，请勿自行用药。
    main_symptoms: []
    pulse: []
    pathomechanism: ""
`,
    'sb/herbs.yaml': `herbs:
  - id: SHL.SB.H.001
    name: 桂枝
    aliases: []
    notes: ""
`,
    'sb/symptom-terms.yaml': `terms:
  - id: SHL.SB.SYM.001
    name: 发热
    category: 症状
    aliases: []
`,
    'sb/questions.yaml': 'questions: []\n',
  }
}

describe('内容校验负向规则', () => {
  it('ID 重复报 E2001，并带文件/字段/修正建议', async () => {
    const files = validFiles()
    // 构造两条相同 id 的条文
    files['sb/chapters/a.yaml'] = `chapter:
  code: TYS
  name: 辨太阳病脉证并治上
  order: 1
  part: 1
  part_total: 1
clauses:
  - id: SHL.SB.TYS.001
    no: 1
    text: 一。
    translation: 译一。
    annotations:
      - source: 测试
        author: 测试
        text: 注一。
    formulas: []
    symptom_tags: []
    study_tags: []
  - id: SHL.SB.TYS.001
    no: 2
    text: 一。
    translation: 译一。
    annotations:
      - source: 测试
        author: 测试
        text: 注一。
    formulas: []
    symptom_tags: []
    study_tags: []
`
    const dir = await createContent(files)
    const issues = await validateContent(dir)
    const dup = issues.filter((issue) => issue.code === 'E2001')
    expect(dup.length).toBeGreaterThanOrEqual(1)
    const first = dup[0]
    expect(first.file).toContain('chapters')
    expect(first.field).toContain('id')
    expect(first.suggestion.length).toBeGreaterThan(0)
  })

  it('ID 格式错误报 E2002', async () => {
    const files = validFiles()
    files['sb/chapters/a.yaml'] = VALID_CHAPTER.replace('SHL.SB.TYS.001', 'SHL.SB.TYS.1')
    const dir = await createContent(files)
    const issues = await validateContent(dir)
    expect(issues.some((issue) => issue.code === 'E2002')).toBe(true)
  })

  it('缺译文报 E1001', async () => {
    const files = validFiles()
    files['sb/chapters/a.yaml'] = VALID_CHAPTER.replace('    translation: 测试译文。\n', '')
    const dir = await createContent(files)
    const issues = await validateContent(dir)
    expect(
      issues.some((issue) => issue.code === 'E1001' && issue.field.includes('translation'))
    ).toBe(true)
  })

  it('缺注解报 E1001', async () => {
    const files = validFiles()
    files['sb/chapters/a.yaml'] = VALID_CHAPTER.replace(
      'annotations:\n      - source: 测试注本\n        author: 测试\n        text: 测试注解。\n',
      'annotations: []\n'
    )
    const dir = await createContent(files)
    const issues = await validateContent(dir)
    expect(
      issues.some((issue) => issue.code === 'E1001' && issue.field.includes('annotations'))
    ).toBe(true)
  })

  it('引用不存在的方剂报 E2003', async () => {
    const files = validFiles()
    files['sb/chapters/a.yaml'] = VALID_CHAPTER.replace(
      '      - SHL.SB.F.001',
      '      - SHL.SB.F.999'
    )
    const dir = await createContent(files)
    const issues = await validateContent(dir)
    expect(
      issues.some(
        (issue) => issue.code === 'E2003' && issue.field.includes('formulas')
      )
    ).toBe(true)
  })

  it('引用不存在的药物报 E2003', async () => {
    const files = validFiles()
    files['sb/formulas.yaml'] = files['sb/formulas.yaml'].replace(
      'herb: SHL.SB.H.001',
      'herb: SHL.SB.H.999'
    )
    const dir = await createContent(files)
    const issues = await validateContent(dir)
    expect(
      issues.some(
        (issue) =>
          issue.code === 'E2003' &&
          issue.field.includes('composition') &&
          issue.field.includes('herb')
      )
    ).toBe(true)
  })

  it('引用不存在的术语报 E2003', async () => {
    const files = validFiles()
    files['sb/chapters/a.yaml'] = VALID_CHAPTER.replace(
      '      - SHL.SB.SYM.001',
      '      - SHL.SB.SYM.999'
    )
    const dir = await createContent(files)
    const issues = await validateContent(dir)
    expect(
      issues.some(
        (issue) => issue.code === 'E2003' && issue.field.includes('symptom_tags')
      )
    ).toBe(true)
  })

  it('题目 answer_index 越界报 E2004', async () => {
    const files = validFiles()
    files['sb/questions.yaml'] = `questions:
  - id: SHL.SB.Q.0001
    type: fill_blank
    clause: SHL.SB.TYS.001
    prompt: 测试题？
    options:
      - 甲
      - 乙
      - 丙
      - 丁
    answer_index: 4
    rationale: 依据。
    status: reviewed
`
    const dir = await createContent(files)
    const issues = await validateContent(dir)
    expect(issues.some((issue) => issue.code === 'E2004')).toBe(true)
  })

  it('命中禁用词报 E3001', async () => {
    const files = validFiles()
    files['sb/chapters/a.yaml'] = VALID_CHAPTER.replace(
      '    text: 太阳之为病，脉浮，头项强痛而恶寒。',
      '    text: 此为推荐用药参考。'
    )
    const dir = await createContent(files)
    const issues = await validateContent(dir)
    expect(issues.some((issue) => issue.code === 'E3001')).toBe(true)
  })

  it('拆分文件合并后条文序号重复报 E4001', async () => {
    const files = validFiles()
    files['sb/edition.yaml'] = `code: SB
book: SHL
name: 宋本
source: 测试底本
chapters:
  - code: TYS
    name: 辨太阳病脉证并治上
    order: 1
    files:
      - chapters/a.yaml
      - chapters/b.yaml
`
    files['sb/chapters/b.yaml'] = `chapter:
  code: TYS
  name: 辨太阳病脉证并治上
  order: 1
  part: 2
  part_total: 2
clauses:
  - id: SHL.SB.TYS.002
    no: 1
    text: 二。
    translation: 译二。
    annotations:
      - source: 测试
        author: 测试
        text: 注二。
    formulas: []
    symptom_tags: []
    study_tags: []
`
    const dir = await createContent(files)
    const issues = await validateContent(dir)
    expect(issues.some((issue) => issue.code === 'E4001')).toBe(true)
  })

  it('合法内容不产生任何校验问题', async () => {
    const dir = await createContent(validFiles())
    const issues = await validateContent(dir)
    expect(issues).toEqual([])
  })
})
