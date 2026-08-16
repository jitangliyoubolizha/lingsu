import path from 'node:path'

import {
  addIssue,
  isRecord,
  isString,
  isEmptyString,
  type Collected,
  type EntityRef,
  type ValidationIssue,
} from './types'

export function validateMetadata(collected: Collected, issues: ValidationIssue[]): void {
  if (!collected.book) {
    issues.push({
      file: '',
      line: 0,
      code: 'E1001',
      field: 'book',
      message: '缺少 book.yaml 或 book.yaml 缺少 code/editions',
      suggestion: '在 content/ 下提供符合规范的 book.yaml',
    })
  }

  if (!collected.edition) {
    issues.push({
      file: '',
      line: 0,
      code: 'E1001',
      field: 'edition',
      message: '缺少 edition.yaml 或 edition.yaml 缺少 book/chapters',
      suggestion: '在版本目录下提供符合规范的 edition.yaml',
    })
  }

  if (collected.book) {
    const book = collected.book
    if (isEmptyString(book.value.code)) {
      addIssue(
        issues,
        book.file,
        book.path.concat('code'),
        'E1001',
        'book.code',
        '书代码不能为空',
        '请填写 book.code'
      )
    }
    if (isEmptyString(book.value.name)) {
      addIssue(
        issues,
        book.file,
        book.path.concat('name'),
        'E1001',
        'book.name',
        '书名不能为空',
        '请填写 book.name'
      )
    }
    if (!Array.isArray(book.value.editions) || book.value.editions.length === 0) {
      addIssue(
        issues,
        book.file,
        book.path.concat('editions'),
        'E1001',
        'book.editions',
        'editions 必须是非空数组',
        '请至少登记一个版本'
      )
    }
  }

  if (collected.edition) {
    const edition = collected.edition
    for (const field of ['code', 'book', 'name', 'source'] as const) {
      if (isEmptyString(edition.value[field])) {
        addIssue(
          issues,
          edition.file,
          edition.path.concat(field),
          'E1001',
          `edition.${field}`,
          `${field} 不能为空`,
          `请填写 edition.${field}`
        )
      }
    }
    if (!Array.isArray(edition.value.chapters) || edition.value.chapters.length === 0) {
      addIssue(
        issues,
        edition.file,
        edition.path.concat('chapters'),
        'E1001',
        'edition.chapters',
        'chapters 必须是非空数组',
        '请至少登记一篇'
      )
    }
  }
}

export function validateIdFormats(collected: Collected, issues: ValidationIssue[]): void {
  const bookCode =
    collected.book && isString(collected.book.value.code) ? collected.book.value.code : ''
  const editionCode =
    collected.edition && isString(collected.edition.value.code) ? collected.edition.value.code : ''
  const chapterCodes = new Set<string>()

  if (collected.edition && Array.isArray(collected.edition.value.chapters)) {
    for (const chapter of collected.edition.value.chapters) {
      if (isRecord(chapter) && isString(chapter.code)) {
        chapterCodes.add(chapter.code)
      }
    }
  }

  const check = (entity: EntityRef, pattern: RegExp, fieldName: string): void => {
    const id = entity.value.id
    if (!isString(id) || id.trim() === '') {
      addIssue(
        issues,
        entity.file,
        entity.path.concat('id'),
        'E1001',
        `${fieldName}.id`,
        'id 不能为空',
        `请填写 ${fieldName}.id`
      )
      return
    }

    const prefix = `${bookCode}.${editionCode}.`
    const rest = id.startsWith(prefix) ? id.slice(prefix.length) : id
    const valid = id.startsWith(prefix) && pattern.test(rest)

    if (!valid) {
      addIssue(
        issues,
        entity.file,
        entity.path.concat('id'),
        'E2002',
        `${fieldName}.id`,
        `ID 格式错误：${id}`,
        `应为 ${prefix}${pattern.source.replace(/\\d/g, '数字')}`
      )
    }
  }

  for (const clause of collected.clauses) {
    check(clause, /^[A-Z]+\.\d{3}$/, 'clauses')
  }
  for (const formula of collected.formulas) {
    check(formula, /^F\.\d{3}$/, 'formulas')
  }
  for (const herb of collected.herbs) {
    check(herb, /^H\.\d{3}$/, 'herbs')
  }
  for (const term of collected.terms) {
    check(term, /^SYM\.\d{3}$/, 'terms')
  }
  for (const question of collected.questions) {
    check(question, /^Q\.\d{4}$/, 'questions')
  }
}

export function validateEditionFiles(collected: Collected, issues: ValidationIssue[]): void {
  if (!collected.edition || !collected.book) {
    return
  }

  const editionDir = path.dirname(collected.edition.file.path)
  const chapterFiles = new Map(
    collected.chapters.map((chapter) => [path.resolve(chapter.file.path), chapter])
  )

  if (!Array.isArray(collected.edition.value.chapters)) {
    return
  }

  for (const chapter of collected.edition.value.chapters) {
    if (!isRecord(chapter) || !Array.isArray(chapter.files)) {
      continue
    }
    for (const filePath of chapter.files) {
      if (!isString(filePath)) {
        continue
      }
      const resolved = path.resolve(editionDir, filePath)
      const chapterFile = chapterFiles.get(resolved)
      if (!chapterFile) {
        issues.push({
          file: collected.edition.file.path,
          line: 0,
          code: 'E2003',
          field: 'edition.chapters[].files',
          message: `edition 引用的章节文件不存在：${filePath}`,
          suggestion: '请检查文件路径或补充该文件',
        })
      } else if (isString(chapter.code) && chapterFile.chapterCode !== chapter.code) {
        addIssue(
          issues,
          chapterFile.file,
          chapterFile.path.concat('code'),
          'E4001',
          'chapter.code',
          `章节文件 ${filePath} 的 code 与 edition 不一致`,
          '请修正 chapter.code'
        )
      }
    }
  }
}
