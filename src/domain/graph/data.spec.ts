import { describe, expect, it } from 'vitest'

import type { Clause, Formula, Herb, SymptomTerm } from '../../data/types'
import { buildGraphDataset, locateGraphNode, neighborSubgraph } from './data'

const herbs: Herb[] = [
  { id: 'SHL.SB.H.001', name: '桂枝', aliases: ['桂'] },
  { id: 'SHL.SB.H.002', name: '芍药', aliases: [] },
  { id: 'SHL.SB.H.003', name: '甘草', aliases: [] },
  { id: 'SHL.SB.H.004', name: '生姜', aliases: [] },
  { id: 'SHL.SB.H.009', name: '附子', aliases: [] },
]

const formulas: Formula[] = [
  {
    id: 'SHL.SB.F.001',
    name: '桂枝汤',
    category: '桂枝汤类',
    composition: [
      { herb: 'SHL.SB.H.001', dose: '三两' },
      { herb: 'SHL.SB.H.002', dose: '三两' },
      { herb: 'SHL.SB.H.003', dose: '二两' },
      // 未收录药材：应被忽略，不产生节点或边
      { herb: 'SHL.SB.H.999', dose: '未知' },
    ],
    originalDoseText: '',
    doseReference: '',
    decoction: '',
    relatedClauses: ['SHL.SB.TYS.012', 'SHL.SB.TYS.013'],
    relatedFormulas: [],
    safetyNotice: '',
    mainSymptoms: [],
    pulse: [],
    pathomechanism: '',
  },
  {
    id: 'SHL.SB.F.002',
    name: '桂枝加桂汤',
    category: '桂枝汤类',
    composition: [
      { herb: 'SHL.SB.H.001', dose: '五两' },
      { herb: 'SHL.SB.H.002', dose: '三两' },
      { herb: 'SHL.SB.H.003', dose: '二两' },
    ],
    originalDoseText: '',
    doseReference: '',
    decoction: '',
    relatedClauses: ['SHL.SB.TYS.117'],
    relatedFormulas: [],
    safetyNotice: '',
    mainSymptoms: [],
    pulse: [],
    pathomechanism: '',
  },
]

const clauses: Clause[] = [
  {
    id: 'SHL.SB.TYS.012',
    no: 12,
    text: '太阳中风，阳浮而阴弱。',
    translation: '',
    annotations: [],
    formulas: ['SHL.SB.F.001'],
    symptomTags: [],
    studyTags: [],
  },
  {
    id: 'SHL.SB.TYS.013',
    no: 13,
    text: '太阳病，头痛发热，汗出恶风。',
    translation: '',
    annotations: [],
    formulas: ['SHL.SB.F.001'],
    symptomTags: [],
    studyTags: [],
  },
  {
    id: 'SHL.SB.TYS.117',
    no: 117,
    text: '烧针令其汗，针处被寒。',
    translation: '',
    annotations: [],
    formulas: ['SHL.SB.F.002'],
    symptomTags: [],
    studyTags: [],
  },
]

describe('buildGraphDataset', () => {
  it('为每个方剂与中药生成节点，id 带类型前缀且保留 refId', () => {
    const dataset = buildGraphDataset({ formulas, herbs })

    const formulaNode = dataset.nodes.find((n) => n.refId === 'SHL.SB.F.001')
    expect(formulaNode).toMatchObject({ id: 'f:SHL.SB.F.001', label: '桂枝汤', type: 'formula' })

    const herbNode = dataset.nodes.find((n) => n.refId === 'SHL.SB.H.001')
    expect(herbNode).toMatchObject({ id: 'h:SHL.SB.H.001', label: '桂枝', type: 'herb' })
    expect(herbNode?.matchNames).toContain('桂')

    // 未收录的药材不产生节点
    expect(dataset.nodes.some((n) => n.refId === 'SHL.SB.H.999')).toBe(false)
  })

  it('默认不含条文节点；传入 clauses 时生成条文节点并按 no 命名', () => {
    const withoutTexts = buildGraphDataset({ formulas, herbs })
    expect(withoutTexts.nodes.some((n) => n.type === 'text')).toBe(false)
    expect(withoutTexts.links.some((l) => l.kind === 'text')).toBe(false)

    const withTexts = buildGraphDataset({ formulas, herbs, clauses })
    const textNode = withTexts.nodes.find((n) => n.refId === 'SHL.SB.TYS.012')
    expect(textNode).toMatchObject({ id: 't:SHL.SB.TYS.012', label: '第12条', type: 'text' })
  })

  it('compose 边由方剂组成派生并忽略未收录药材', () => {
    const dataset = buildGraphDataset({ formulas, herbs })
    const composeEdges = dataset.links.filter((l) => l.kind === 'compose')

    expect(
      composeEdges.some((l) => l.source === 'f:SHL.SB.F.001' && l.target === 'h:SHL.SB.H.001')
    ).toBe(true)
    expect(composeEdges.some((l) => l.target === 'h:SHL.SB.H.999')).toBe(false)
  })

  it('text 边仅在条文节点开启时从 relatedClauses 派生，且只连向真实存在的条文', () => {
    const dataset = buildGraphDataset({ formulas, herbs, clauses })
    const textEdges = dataset.links.filter((l) => l.kind === 'text')

    expect(textEdges).toEqual([
      { source: 'f:SHL.SB.F.001', target: 't:SHL.SB.TYS.012', kind: 'text' },
      { source: 'f:SHL.SB.F.001', target: 't:SHL.SB.TYS.013', kind: 'text' },
      { source: 'f:SHL.SB.F.002', target: 't:SHL.SB.TYS.117', kind: 'text' },
    ])
  })

  it('pair 边只为 ≥2 个方剂中共现的药对生成', () => {
    const dataset = buildGraphDataset({ formulas, herbs })
    const pairEdges = dataset.links.filter((l) => l.kind === 'pair')

    // 桂枝+芍药、桂枝+甘草、芍药+甘草 在两个方剂中都共现；
    // 附子未出现在任何方剂中，不应出现任何药对边。
    expect(pairEdges.length).toBe(3)
    expect(pairEdges.some((l) => l.target === 'h:SHL.SB.H.009')).toBe(false)
  })

  it('同方剂内重复药材去重，避免重复边与度数虚增', () => {
    const duplicated: Formula[] = [
      {
        ...formulas[0]!,
        composition: [
          { herb: 'SHL.SB.H.001', dose: '三两' },
          { herb: 'SHL.SB.H.001', dose: '五两' },
          { herb: 'SHL.SB.H.002', dose: '三两' },
        ],
      },
      {
        ...formulas[1]!,
        composition: [{ herb: 'SHL.SB.H.001', dose: '五两' }],
      },
    ]
    const dataset = buildGraphDataset({ formulas: duplicated, herbs })
    const composeF1H1 = dataset.links.filter(
      (l) => l.kind === 'compose' && l.source === 'f:SHL.SB.F.001' && l.target === 'h:SHL.SB.H.001'
    )
    expect(composeF1H1).toHaveLength(1)

    // 桂枝单味在两个方剂中出现无法构成药对（需要成对共现）
    expect(dataset.links.filter((l) => l.kind === 'pair')).toHaveLength(0)
  })
})

describe('locateGraphNode', () => {
  const withTexts = buildGraphDataset({ formulas, herbs, clauses })

  it('空查询返回 null', () => {
    expect(locateGraphNode(withTexts, '')).toBeNull()
    expect(locateGraphNode(withTexts, '   ')).toBeNull()
  })

  it('纯数字查询定位对应条文号', () => {
    expect(locateGraphNode(withTexts, '13')).toBe('t:SHL.SB.TYS.013')
  })

  it('文本查询优先精确匹配方剂名，其次中药名（含别名）', () => {
    expect(locateGraphNode(withTexts, '桂枝汤')).toBe('f:SHL.SB.F.001')
    expect(locateGraphNode(withTexts, '桂')).toBe('h:SHL.SB.H.001')
  })

  it('无精确命中时回退到名称包含匹配', () => {
    expect(locateGraphNode(withTexts, '加桂')).toBe('f:SHL.SB.F.002')
  })

  it('中药主名属于精确命中，优先于包含匹配', () => {
    expect(locateGraphNode(withTexts, '桂枝')).toBe('h:SHL.SB.H.001')
  })

  it('查不到时返回 null', () => {
    expect(locateGraphNode(withTexts, '不存在的东西')).toBeNull()
  })

  it('纯数字但条文节点缺失时不误报（返回 null 由视图决定是否开启条文）', () => {
    const withoutTexts = buildGraphDataset({ formulas, herbs })
    expect(locateGraphNode(withoutTexts, '13')).toBeNull()
  })
})

describe('neighborSubgraph', () => {
  const withTexts = buildGraphDataset({ formulas, herbs, clauses })

  it('抽取选中节点的直接邻居：保留邻居间边，丢弃无关边', () => {
    const sub = neighborSubgraph(withTexts, 'f:SHL.SB.F.001')
    const ids = sub.nodes.map((n) => n.id)

    // 自身 + compose 邻居（3味被收录药材）+ text 邻居（2条条文）
    expect(ids).toContain('f:SHL.SB.F.001')
    expect(ids).toEqual(expect.arrayContaining([
      'h:SHL.SB.H.001',
      'h:SHL.SB.H.002',
      'h:SHL.SB.H.003',
      't:SHL.SB.TYS.012',
      't:SHL.SB.TYS.013',
    ]))
    expect(ids).not.toContain('f:SHL.SB.F.002')

    // 无关 text 边（F002 → T117）不进入子图
    expect(sub.links.some((l) => l.target === 't:SHL.SB.TYS.117')).toBe(false)
  })

  it('邻居间的药对边保留；与外部节点的药对边丢弃', () => {
    const sub = neighborSubgraph(withTexts, 'h:SHL.SB.H.001')
    // H001 的邻居含 H002/H003/H004? —— H009 未入图；
    // pair 边 H002↔H003 两端都在子图内应保留。
    expect(sub.links.some((l) => l.kind === 'pair' && l.source === 'h:SHL.SB.H.002' && l.target === 'h:SHL.SB.H.003')).toBe(true)

    // 若某药对边一端不在邻居集合内，则不应出现在子图
    for (const link of sub.links.filter((l) => l.kind === 'pair')) {
      expect(sub.nodes.some((n) => n.id === link.source)).toBe(true)
      expect(sub.nodes.some((n) => n.id === link.target)).toBe(true)
    }
  })

  it('选中不存在节点时返回空数据集', () => {
    const sub = neighborSubgraph(withTexts, 'h:NOT.EXIST')
    expect(sub.nodes).toHaveLength(0)
    expect(sub.links).toHaveLength(0)
  })
})

/* ---------------- 症状维度 ---------------- */

const symptomTerms: SymptomTerm[] = [
  { id: 'SYM1', name: '发热', category: '症状', aliases: ['身热'] },
  { id: 'SYM2', name: '恶寒', category: '症状', aliases: [] },
  { id: 'SYM3', name: '孤立症状', category: '症状', aliases: [] },
]

const clausesWithTags: Clause[] = [
  { ...clauses[0]!, symptomTags: ['SYM1', 'SYM2'] }, // T12
  { ...clauses[1]!, symptomTags: ['SYM1'] }, // T13
  { ...clauses[2]!, symptomTags: ['SYM1', 'SYM2'] }, // T117
]

const formulaWithTargets: Formula[] = [
  formulas[0]!,
  { ...formulas[1]!, mainSymptoms: ['SYM2', 'SYM9'] }, // SYM9 未收录，应忽略
]

describe('buildGraphDataset 症状维度', () => {
  it('开启症状层：生成症状节点（含别名匹配名），未被引用的术语不生成', () => {
    const dataset = buildGraphDataset({
      formulas: formulaWithTargets,
      herbs,
      clauses: clausesWithTags,
      symptomTerms,
      includeSymptomNodes: true,
    })

    const s1 = dataset.nodes.find((n) => n.id === 's:SYM1')
    expect(s1).toMatchObject({ label: '发热', type: 'symptom', refId: 'SYM1' })
    expect(s1?.matchNames).toContain('身热')
    expect(s1?.matchNames).toContain('发热')
    expect(dataset.nodes.some((n) => n.id === 's:SYM3')).toBe(false)
    expect(dataset.nodes.some((n) => n.id === 's:SYM9')).toBe(false)
  })

  it('三类症状边：present（条→症，随条文节点）、suggests（方→症，≥2 条推导）、targets（主症显式）', () => {
    const dataset = buildGraphDataset({
      formulas: formulaWithTargets,
      herbs,
      clauses: clausesWithTags,
      symptomTerms,
      includeSymptomNodes: true,
    })

    const present = dataset.links.filter((l) => l.kind === 'present')
    expect(present).toEqual([
      { source: 't:SHL.SB.TYS.012', target: 's:SYM1', kind: 'present' },
      { source: 't:SHL.SB.TYS.012', target: 's:SYM2', kind: 'present' },
      { source: 't:SHL.SB.TYS.013', target: 's:SYM1', kind: 'present' },
      { source: 't:SHL.SB.TYS.117', target: 's:SYM1', kind: 'present' },
      { source: 't:SHL.SB.TYS.117', target: 's:SYM2', kind: 'present' },
    ])

    // F1 相关条文 T12+T13 都见 SYM1（2 条）→ suggests；SYM2 只在 T12（1 条）→ 不推导
    expect(dataset.links.filter((l) => l.kind === 'suggests')).toEqual([
      { source: 'f:SHL.SB.F.001', target: 's:SYM1', kind: 'suggests' },
    ])

    // 主症显式录入直接连线（SYM9 未收录被忽略）
    expect(dataset.links.filter((l) => l.kind === 'targets')).toEqual([
      { source: 'f:SHL.SB.F.002', target: 's:SYM2', kind: 'targets' },
    ])
  })

  it('关闭条文节点但开启症状：present 边随条文节点消失，suggests/targets 不受影响', () => {
    const dataset = buildGraphDataset({
      formulas: formulaWithTargets,
      herbs,
      clauses: clausesWithTags,
      symptomTerms,
      includeTextNodes: false,
      includeSymptomNodes: true,
    })

    expect(dataset.nodes.some((n) => n.type === 'text')).toBe(false)
    expect(dataset.links.some((l) => l.kind === 'present')).toBe(false)
    expect(dataset.links.some((l) => l.kind === 'suggests')).toBe(true)
    expect(dataset.links.some((l) => l.kind === 'targets')).toBe(true)
  })

  it('不开症状层时即使传入术语也无任何症状节点/边（默认关闭）', () => {
    const dataset = buildGraphDataset({
      formulas: formulaWithTargets,
      herbs,
      clauses: clausesWithTags,
      symptomTerms,
    })
    expect(dataset.nodes.some((n) => n.type === 'symptom')).toBe(false)
    expect(dataset.links.some((l) => ['present', 'suggests', 'targets'].includes(l.kind))).toBe(
      false
    )
  })

  it('locateGraphNode 支持症状名与别名精确/回退匹配', () => {
    const dataset = buildGraphDataset({
      formulas: formulaWithTargets,
      herbs,
      clauses: clausesWithTags,
      symptomTerms,
      includeSymptomNodes: true,
    })
    expect(locateGraphNode(dataset, '发热')).toBe('s:SYM1')
    expect(locateGraphNode(dataset, '身热')).toBe('s:SYM1')
    expect(locateGraphNode(dataset, '恶寒')).toBe('s:SYM2')
  })
})
