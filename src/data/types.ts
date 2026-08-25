/**
 * 内容数据运行时类型。
 * 字段命名统一使用 camelCase，与 content/ 下 YAML 的 snake_case 字段一一对应。
 */

export type TermCategory = '症状' | '脉象' | '病机'

export type QuestionType =
  'fill_blank' | 'clause_chain' | 'formula_syndrome_match' | 'formula_composition'

export type QuestionStatus = 'auto' | 'reviewed'

export interface Book {
  code: string
  name: string
  description?: string
  editions: Array<{
    code: string
    name: string
  }>
}

export interface EditionChapterRef {
  code: string
  name: string
  order: number
  files: string[]
}

export interface Edition {
  code: string
  book: string
  name: string
  source: string
  chapters: EditionChapterRef[]
}

export interface Annotation {
  source: string
  author: string
  text: string
}

export interface Clause {
  id: string
  no: number
  text: string
  translation: string
  annotations: Annotation[]
  formulas: string[]
  symptomTags: string[]
  studyTags: string[]
  notes?: string
}

export interface Chapter {
  code: string
  name: string
  order: number
  part?: number
  partTotal?: number
  clauses: Clause[]
}

/** 篇章元数据：不含条文正文，用于首屏轻量加载与篇章导航。 */
export interface ChapterMeta {
  code: string
  name: string
  order: number
  part?: number
  partTotal?: number
  clauseCount: number
}

export interface FormulaCompositionItem {
  herb: string
  dose?: string
  note?: string
}

export interface FormulaRelation {
  relation: string
  target: string
  note?: string
}

export interface Formula {
  id: string
  name: string
  category: string
  composition: FormulaCompositionItem[]
  originalDoseText?: string
  doseReference?: string
  decoction?: string
  relatedClauses: string[]
  relatedFormulas: FormulaRelation[]
  safetyNotice: string
  mainSymptoms: string[]
  pulse: string[]
  pathomechanism: string
}

/** 方剂摘要：列表/搜索/收藏/互链名查询所需的最小字段，随主包加载。 */
export interface FormulaSummary {
  id: string
  name: string
  category: string
}

export interface Herb {
  id: string
  name: string
  aliases: string[]
  notes?: string
}

export interface SymptomTerm {
  id: string
  name: string
  category: TermCategory
  aliases: string[]
}

export interface Question {
  id: string
  type: QuestionType
  clause: string
  formula?: string
  prompt: string
  options: string[]
  answerIndex: number
  rationale: string
  status: QuestionStatus
}

/** 内容元数据：随主包加载的轻量部分，条文正文按篇拆分、按需加载。 */
export interface ContentMeta {
  book: Book
  edition: Edition
  chapters: ChapterMeta[]
  /** 全书条文顺序（按篇章顺序与条文号排列），用于上一条/下一条导航与条文定位。 */
  clauseOrder: string[]
  /** 方剂摘要（id/name/category），完整方剂数据按需加载，见 loadAllFormulas/loadFormula。 */
  formulas: FormulaSummary[]
  herbs: Herb[]
  symptomTerms: SymptomTerm[]
  questions: Question[]
}

export interface ContentData extends Omit<ContentMeta, 'chapters' | 'clauseOrder' | 'formulas'> {
  chapters: Chapter[]
  clauses: Clause[]
  /** 完整方剂数据（含组成/煎服/剂量/类方关系等），由 loadContent 聚合加载。 */
  formulas: Formula[]
}
