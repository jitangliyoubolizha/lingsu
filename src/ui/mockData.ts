/**
 * 子计划 4 的 UI 预览数据。
 * 仅用于页面骨架与视觉验证，后续接入内容数据层后删除或替换。
 */

export interface ClausePreview {
  id: string
  no: number
  chapter: string
  title: string
  text: string
  firstLine: string
  translation: string
  annotations: Array<{ source: string; author: string; text: string }>
  symptomTags: string[]
  status: 'unlearned' | 'learning' | 'mastered'
  favorite: boolean
}

export interface FormulaPreview {
  id: string
  name: string
  category: string
  composition: Array<{ herb: string; dose: string }>
  originalDoseText: string
  doseReference: string
  decoction: string
  relatedClauses: string[]
  relatedFormulas: Array<{ relation: string; target: string }>
  safetyNotice: string
  mainSymptoms: string[]
  pulse: string[]
  pathomechanism: string
}

export interface HerbPreview {
  id: string
  name: string
  aliases: string[]
  formulas: string[]
}

export interface QuizPreview {
  id: string
  type: string
  prompt: string
  options: string[]
  answerIndex: number
  rationale: string
  clause: string
}

export interface CompareFormulaPreview {
  id: string
  name: string
  composition: string[]
  mainSymptoms: string[]
  pulse: string[]
  pathomechanism: string
  relatedClauses: string[]
}

export const clauses: ClausePreview[] = [
  {
    id: 'SHL.SB.TYS.001',
    no: 1,
    chapter: '辨太阳病脉证并治上',
    title: '太阳·第 1 条',
    text: '太阳之为病，脉浮，头项强痛而恶寒。',
    firstLine: '太阳之为病，脉浮，头项强痛而恶寒。',
    translation: '太阳病的提纲证：脉象浮，头部和颈项强硬疼痛，并且怕冷。',
    annotations: [
      {
        source: '《伤寒论》成无己注',
        author: '成无己',
        text: '太阳受病，则脉浮，头项强痛而恶寒，此太阳病之提纲也。',
      },
    ],
    symptomTags: ['脉浮', '头项强痛', '恶寒'],
    status: 'mastered',
    favorite: true,
  },
  {
    id: 'SHL.SB.TYS.002',
    no: 2,
    chapter: '辨太阳病脉证并治上',
    title: '太阳·第 2 条',
    text: '太阳病，发热，汗出，恶风，脉缓者，名为中风。',
    firstLine: '太阳病，发热，汗出，恶风，脉缓者，名为中风。',
    translation: '太阳病见到发热、汗出、怕风、脉象缓的，称为中风。',
    annotations: [
      {
        source: '《伤寒论》',
        author: '张仲景',
        text: '此太阳中风之脉证，与伤寒有别。',
      },
    ],
    symptomTags: ['发热', '汗出', '恶风', '脉缓'],
    status: 'learning',
    favorite: false,
  },
  {
    id: 'SHL.SB.TYS.003',
    no: 3,
    chapter: '辨太阳病脉证并治上',
    title: '太阳·第 3 条',
    text: '太阳病，或已发热，或未发热，必恶寒，体痛，呕逆，脉阴阳俱紧者，名为伤寒。',
    firstLine: '太阳病，或已发热，或未发热，必恶寒，体痛，呕逆，脉阴阳俱紧者，名为伤寒。',
    translation:
      '太阳病，无论已经发热还是尚未发热，必定怕冷，身体疼痛，呕逆，脉象阴阳俱紧的，称为伤寒。',
    annotations: [
      {
        source: '《伤寒论》',
        author: '张仲景',
        text: '此太阳伤寒之脉证。',
      },
    ],
    symptomTags: ['恶寒', '体痛', '呕逆', '脉紧'],
    status: 'unlearned',
    favorite: false,
  },
  {
    id: 'SHL.SB.TYS.004',
    no: 4,
    chapter: '辨太阳病脉证并治上',
    title: '太阳·第 4 条',
    text: '太阳中风，阳浮而阴弱，阳浮者，热自发；阴弱者，汗自出。啬啬恶寒，淅淅恶风，翕翕发热，鼻鸣干呕者，桂枝汤主之。',
    firstLine: '太阳中风，阳浮而阴弱，阳浮者，热自发；阴弱者，汗自出。',
    translation:
      '太阳中风，脉象阳浮而阴弱。阳浮所以发热自现，阴弱所以汗自出。症见怕冷怕风、发热、鼻鸣干呕的，用桂枝汤主治。',
    annotations: [
      {
        source: '《医宗金鉴》',
        author: '吴谦',
        text: '桂枝汤为解肌之剂，治太阳中风表虚证。',
      },
    ],
    symptomTags: ['发热', '汗出', '恶风', '鼻鸣', '干呕'],
    status: 'learning',
    favorite: true,
  },
  {
    id: 'SHL.SB.TYS.005',
    no: 5,
    chapter: '辨太阳病脉证并治上',
    title: '太阳·第 5 条',
    text: '太阳病，头痛发热，汗出恶风，桂枝汤主之。',
    firstLine: '太阳病，头痛发热，汗出恶风，桂枝汤主之。',
    translation: '太阳病见头痛、发热、汗出、怕风的，用桂枝汤主治。',
    annotations: [
      {
        source: '《伤寒论》',
        author: '张仲景',
        text: '头痛发热，汗出恶风，桂枝证也。',
      },
    ],
    symptomTags: ['头痛', '发热', '汗出', '恶风'],
    status: 'unlearned',
    favorite: false,
  },
  {
    id: 'SHL.SB.TYS.006',
    no: 6,
    chapter: '辨太阳病脉证并治上',
    title: '太阳·第 6 条',
    text: '太阳病，项背强几几，反汗出恶风者，桂枝加葛根汤主之。',
    firstLine: '太阳病，项背强几几，反汗出恶风者，桂枝加葛根汤主之。',
    translation: '太阳病，项背部僵硬拘急，反而汗出怕风的，用桂枝加葛根汤主治。',
    annotations: [
      {
        source: '《伤寒论》',
        author: '张仲景',
        text: '项背强几几，汗出恶风者，桂枝加葛根汤主之。',
      },
    ],
    symptomTags: ['项背强', '汗出', '恶风'],
    status: 'unlearned',
    favorite: false,
  },
]

export const formulas: FormulaPreview[] = [
  {
    id: 'gui-zhi-tang',
    name: '桂枝汤',
    category: '桂枝汤类',
    composition: [
      { herb: '桂枝', dose: '三两' },
      { herb: '芍药', dose: '三两' },
      { herb: '甘草（炙）', dose: '二两' },
      { herb: '生姜（切）', dose: '三两' },
      { herb: '大枣（擘）', dose: '十二枚' },
    ],
    originalDoseText: '上五味，㕮咀三味，以水七升，微火煮取三升，去滓，适寒温，服一升。',
    doseReference: '现代参考：桂枝 9g，芍药 9g，炙甘草 6g，生姜 9g，大枣 4 枚。',
    decoction: '以水七升，微火煮取三升，去滓，适寒温，服一升。服已须臾，啜热稀粥一升余，以助药力。',
    relatedClauses: ['SHL.SB.TYS.001', 'SHL.SB.TYS.004', 'SHL.SB.TYS.005'],
    relatedFormulas: [
      { relation: '加减方', target: '桂枝加葛根汤' },
      { relation: '类方', target: '麻黄汤' },
    ],
    safetyNotice: '学术探讨，非用药指导。',
    mainSymptoms: ['发热', '汗出', '恶风', '头痛'],
    pulse: ['浮缓', '阳浮阴弱'],
    pathomechanism: '营卫不和，卫强营弱。',
  },
  {
    id: 'gui-zhi-jia-ge-gen-tang',
    name: '桂枝加葛根汤',
    category: '桂枝汤类',
    composition: [
      { herb: '葛根', dose: '四两' },
      { herb: '桂枝（去皮）', dose: '二两' },
      { herb: '芍药', dose: '二两' },
      { herb: '甘草（炙）', dose: '二两' },
      { herb: '生姜（切）', dose: '三两' },
      { herb: '大枣（擘）', dose: '十二枚' },
    ],
    originalDoseText: '上六味，以水一斗，先煮葛根，减二升，内诸药，煮取三升，去滓，温服一升。',
    doseReference: '现代参考：葛根 12g，桂枝 6g，芍药 6g，炙甘草 6g，生姜 9g，大枣 4 枚。',
    decoction: '以水一斗，先煮葛根减二升，去上沫，内诸药，煮取三升，去滓，温服一升。',
    relatedClauses: ['SHL.SB.TYS.006'],
    relatedFormulas: [{ relation: '母方', target: '桂枝汤' }],
    safetyNotice: '学术探讨，非用药指导。',
    mainSymptoms: ['项背强', '汗出', '恶风'],
    pulse: ['浮缓'],
    pathomechanism: '太阳中风，经输不利。',
  },
  {
    id: 'ma-huang-tang',
    name: '麻黄汤',
    category: '麻黄汤类',
    composition: [
      { herb: '麻黄（去节）', dose: '三两' },
      { herb: '桂枝（去皮）', dose: '二两' },
      { herb: '杏仁（去皮尖）', dose: '七十个' },
      { herb: '甘草（炙）', dose: '一两' },
    ],
    originalDoseText:
      '上四味，以水九升，先煮麻黄减二升，去上沫，内诸药，煮取二升半，去滓，温服八合。',
    doseReference: '现代参考：麻黄 9g，桂枝 6g，杏仁 9g，炙甘草 3g。',
    decoction:
      '以水九升，先煮麻黄减二升，去上沫，内诸药，煮取二升半，去滓，温服八合。覆取微似汗，不须啜粥。',
    relatedClauses: ['SHL.SB.TYS.003'],
    relatedFormulas: [{ relation: '类方', target: '桂枝汤' }],
    safetyNotice: '学术探讨，非用药指导。',
    mainSymptoms: ['恶寒', '发热', '无汗', '身痛'],
    pulse: ['浮紧'],
    pathomechanism: '风寒束表，卫闭营郁。',
  },
]

export const herbs: HerbPreview[] = [
  {
    id: 'gui-zhi',
    name: '桂枝',
    aliases: ['桂', '桂枝尖'],
    formulas: ['桂枝汤', '桂枝加葛根汤', '麻黄汤'],
  },
  { id: 'shao-yao', name: '芍药', aliases: ['白芍'], formulas: ['桂枝汤', '桂枝加葛根汤'] },
  {
    id: 'gan-cao',
    name: '甘草',
    aliases: ['炙甘草', '生甘草'],
    formulas: ['桂枝汤', '桂枝加葛根汤', '麻黄汤'],
  },
  { id: 'ge-gen', name: '葛根', aliases: ['干葛'], formulas: ['桂枝加葛根汤'] },
  { id: 'ma-huang', name: '麻黄', aliases: ['净麻黄'], formulas: ['麻黄汤'] },
]

export const quizQuestions: QuizPreview[] = [
  {
    id: 'q1',
    type: '挖空题',
    prompt: '太阳之为病，脉浮，头项强痛而（  ）。',
    options: ['恶寒', '恶风', '发热', '汗出'],
    answerIndex: 0,
    rationale: '太阳病提纲：脉浮，头项强痛而恶寒。',
    clause: 'SHL.SB.TYS.001',
  },
  {
    id: 'q2',
    type: '条文配伍',
    prompt: '“太阳病，头痛发热，汗出恶风”应主以何方？',
    options: ['麻黄汤', '桂枝汤', '桂枝加葛根汤', '大青龙汤'],
    answerIndex: 1,
    rationale: '头痛发热、汗出恶风为桂枝汤证。',
    clause: 'SHL.SB.TYS.005',
  },
  {
    id: 'q3',
    type: '方剂组成',
    prompt: '桂枝汤的组成中不包含以下哪一味药？',
    options: ['桂枝', '芍药', '麻黄', '大枣'],
    answerIndex: 2,
    rationale: '桂枝汤由桂枝、芍药、甘草、生姜、大枣组成，不含麻黄。',
    clause: 'SHL.SB.TYS.004',
  },
]

export const compareFormulas: CompareFormulaPreview[] = [
  {
    id: 'gui-zhi-tang',
    name: '桂枝汤',
    composition: ['桂枝', '芍药', '甘草', '生姜', '大枣'],
    mainSymptoms: ['发热', '汗出', '恶风', '头痛'],
    pulse: ['浮缓'],
    pathomechanism: '营卫不和，卫强营弱。',
    relatedClauses: ['SHL.SB.TYS.001', 'SHL.SB.TYS.004', 'SHL.SB.TYS.005'],
  },
  {
    id: 'ma-huang-tang',
    name: '麻黄汤',
    composition: ['麻黄', '桂枝', '杏仁', '甘草'],
    mainSymptoms: ['恶寒', '发热', '无汗', '身痛'],
    pulse: ['浮紧'],
    pathomechanism: '风寒束表，卫闭营郁。',
    relatedClauses: ['SHL.SB.TYS.003'],
  },
]

export const dailyStats = {
  streakDays: 12,
  totalLearned: 68,
  mastered: 86,
  learning: 32,
  dueReviews: 14,
  favorites: 9,
  accuracy: 78,
  retention: 92,
  chapterProgress: [
    { name: '太阳病上篇', done: 30, total: 30 },
    { name: '太阳病中篇', done: 0, total: 66 },
  ],
}

export function getClauseById(id: string): ClausePreview | undefined {
  return clauses.find((item) => item.id === id)
}

export function getFormulaById(id: string): FormulaPreview | undefined {
  return formulas.find((item) => item.id === id)
}

export function getHerbById(id: string): HerbPreview | undefined {
  return herbs.find((item) => item.id === id)
}
