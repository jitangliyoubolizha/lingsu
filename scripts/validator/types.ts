import type { Document } from 'yaml'

export const YAML_EXTENSIONS = new Set(['.yaml', '.yml'])
export const FORBIDDEN_WORDS = ['诊断', '治疗方案', '推荐用药']
export const TERM_CATEGORIES = new Set(['症状', '脉象', '病机'])
export const QUESTION_TYPES = new Set([
  'fill_blank',
  'clause_chain',
  'formula_syndrome_match',
  'formula_composition',
])
export const QUESTION_STATUSES = new Set(['auto', 'reviewed'])

export interface ValidationIssue {
  file: string
  line: number
  code: string
  field: string
  message: string
  suggestion: string
  fatal?: boolean
}

export interface YamlFile {
  path: string
  raw: string
  data: Record<string, unknown>
  doc: Document
}

export interface EntityRef {
  value: Record<string, unknown>
  file: YamlFile
  path: Array<string | number>
}

export interface ChapterFileRef {
  value: Record<string, unknown>
  file: YamlFile
  path: Array<string | number>
  chapterCode: string
  clausesPath: Array<string | number>
}

export interface Collected {
  book?: EntityRef
  edition?: EntityRef
  chapters: ChapterFileRef[]
  clauses: EntityRef[]
  formulas: EntityRef[]
  herbs: EntityRef[]
  terms: EntityRef[]
  questions: EntityRef[]
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isEmptyString(value: unknown): boolean {
  return !isString(value) || value.trim() === ''
}

export function pathToField(path: Array<string | number>): string {
  let field = ''
  for (const segment of path) {
    if (typeof segment === 'number') {
      field += `[${segment}]`
    } else {
      field += field ? `.${segment}` : segment
    }
  }
  return field
}

export function getLine(raw: string, offset: number): number {
  let line = 1
  const end = Math.min(offset, raw.length)
  for (let i = 0; i < end; i += 1) {
    if (raw.charCodeAt(i) === 10) {
      line += 1
    }
  }
  return line
}

export function getNodeLine(file: YamlFile, nodePath: Array<string | number>): number {
  const node = file.doc.getIn(nodePath, true) as { range?: [number, number, number] } | undefined
  if (node && Array.isArray(node.range) && typeof node.range[0] === 'number') {
    return getLine(file.raw, node.range[0])
  }
  if (nodePath.length > 0) {
    return getNodeLine(file, nodePath.slice(0, -1))
  }
  return 1
}

export function addIssue(
  issues: ValidationIssue[],
  file: YamlFile,
  nodePath: Array<string | number>,
  code: string,
  field: string,
  message: string,
  suggestion: string,
  fatal = false
): void {
  issues.push({
    file: file.path,
    line: getNodeLine(file, nodePath),
    code,
    field,
    message,
    suggestion,
    fatal,
  })
}
