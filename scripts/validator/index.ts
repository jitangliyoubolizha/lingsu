import { collectEntities } from './collect'
import { loadYamlFiles } from './loader'
import { validateEditionFiles, validateIdFormats, validateMetadata } from './rules-metadata'
import { validateRequiredFields } from './rules-fields'
import { validateReferences, validateUniqueness } from './rules-references'
import { validateChapterMerge, validateForbiddenWords } from './rules-merge'
import type { ValidationIssue } from './types'

export async function validateContent(rootDir: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []
  let files

  try {
    files = await loadYamlFiles(rootDir)
  } catch (error) {
    issues.push({
      file: rootDir,
      line: 0,
      code: 'E9999',
      field: 'content',
      message: `读取内容目录失败：${error instanceof Error ? error.message : String(error)}`,
      suggestion: '请检查 content/ 目录是否存在',
      fatal: true,
    })
    return issues
  }

  for (const file of files) {
    if (file.doc.errors.length > 0) {
      for (const error of file.doc.errors) {
        issues.push({
          file: file.path,
          line: error.linePos?.[0]?.line ?? 0,
          code: 'E1002',
          field: 'yaml',
          message: `YAML 解析失败：${error.message}`,
          suggestion: '请修正 YAML 语法',
          fatal: true,
        })
      }
    }
  }

  if (issues.some((issue) => issue.fatal)) {
    return issues
  }

  const collected = collectEntities(files)
  validateMetadata(collected, issues)
  validateIdFormats(collected, issues)
  validateRequiredFields(collected, issues)
  validateReferences(collected, issues)
  validateUniqueness(collected, issues)
  validateChapterMerge(collected, issues)
  validateForbiddenWords(files, issues)
  validateEditionFiles(collected, issues)

  return issues
}

export type { ValidationIssue } from './types'
