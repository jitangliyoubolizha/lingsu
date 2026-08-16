import {
  addIssue,
  FORBIDDEN_WORDS,
  getLine,
  isNumber,
  isRecord,
  isString,
  type ChapterFileRef,
  type Collected,
  type ValidationIssue,
  type YamlFile,
} from './types'

export function validateChapterMerge(collected: Collected, issues: ValidationIssue[]): void {
  const byChapter = new Map<string, ChapterFileRef[]>()

  for (const chapterFile of collected.chapters) {
    const list = byChapter.get(chapterFile.chapterCode) ?? []
    list.push(chapterFile)
    byChapter.set(chapterFile.chapterCode, list)
  }

  for (const [code, files] of byChapter) {
    const name = files[0].value.name
    const order = files[0].value.order

    for (const file of files.slice(1)) {
      if (file.value.name !== name) {
        addIssue(
          issues,
          file.file,
          file.path.concat('name'),
          'E4001',
          'chapter.name',
          `同一篇 ${code} 的 name 不一致`,
          '请保持拆分文件 chapter.name 相同'
        )
      }
      if (file.value.order !== order) {
        addIssue(
          issues,
          file.file,
          file.path.concat('order'),
          'E4001',
          'chapter.order',
          `同一篇 ${code} 的 order 不一致`,
          '请保持拆分文件 chapter.order 相同'
        )
      }
    }

    const noSet = new Set<number>()
    const idSet = new Set<string>()

    for (const file of files) {
      const clauses = file.file.data[file.clausesPath[0]]
      if (!Array.isArray(clauses)) {
        continue
      }
      clauses.forEach((clause, index) => {
        if (!isRecord(clause)) {
          return
        }
        const path = file.clausesPath.concat(index)
        if (isNumber(clause.no)) {
          if (noSet.has(clause.no)) {
            addIssue(
              issues,
              file.file,
              path.concat('no'),
              'E4001',
              'clauses[].no',
              `篇 ${code} 内条文序号重复：${clause.no}`,
              '请修正 no'
            )
          } else {
            noSet.add(clause.no)
          }
        }
        if (isString(clause.id) && clause.id.trim() !== '') {
          if (idSet.has(clause.id)) {
            addIssue(
              issues,
              file.file,
              path.concat('id'),
              'E4001',
              'clauses[].id',
              `篇 ${code} 内条文 ID 重复：${clause.id}`,
              '请修正 id'
            )
          } else {
            idSet.add(clause.id)
          }
        }
      })
    }
  }
}

export function validateForbiddenWords(files: YamlFile[], issues: ValidationIssue[]): void {
  for (const file of files) {
    for (const word of FORBIDDEN_WORDS) {
      let index = file.raw.indexOf(word)
      while (index !== -1) {
        issues.push({
          file: file.path,
          line: getLine(file.raw, index),
          code: 'E3001',
          field: 'content',
          message: `命中禁用词：${word}`,
          suggestion: '删除或替换该表述',
        })
        index = file.raw.indexOf(word, index + word.length)
      }
    }
  }
}
