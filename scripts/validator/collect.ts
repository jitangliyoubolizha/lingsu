import { isRecord, isString, type Collected, type YamlFile } from './types'

export function collectEntities(files: YamlFile[]): Collected {
  const collected: Collected = {
    chapters: [],
    clauses: [],
    formulas: [],
    herbs: [],
    terms: [],
    questions: [],
  }

  for (const file of files) {
    if (Array.isArray(file.data.editions) && isString(file.data.code)) {
      collected.book = { value: file.data, file, path: [] }
    }

    if (Array.isArray(file.data.chapters) && isString(file.data.book)) {
      collected.edition = { value: file.data, file, path: [] }
    }

    if (isRecord(file.data.chapter) && Array.isArray(file.data.clauses)) {
      const chapterCode = isString(file.data.chapter.code) ? file.data.chapter.code : ''
      collected.chapters.push({
        value: file.data.chapter,
        file,
        path: ['chapter'],
        chapterCode,
        clausesPath: ['clauses'],
      })
      file.data.clauses.forEach((clause, index) => {
        if (isRecord(clause)) {
          collected.clauses.push({ value: clause, file, path: ['clauses', index] })
        }
      })
    }

    if (Array.isArray(file.data.formulas)) {
      file.data.formulas.forEach((formula, index) => {
        if (isRecord(formula)) {
          collected.formulas.push({ value: formula, file, path: ['formulas', index] })
        }
      })
    }

    if (Array.isArray(file.data.herbs)) {
      file.data.herbs.forEach((herb, index) => {
        if (isRecord(herb)) {
          collected.herbs.push({ value: herb, file, path: ['herbs', index] })
        }
      })
    }

    if (Array.isArray(file.data.terms)) {
      file.data.terms.forEach((term, index) => {
        if (isRecord(term)) {
          collected.terms.push({ value: term, file, path: ['terms', index] })
        }
      })
    }

    if (Array.isArray(file.data.questions)) {
      file.data.questions.forEach((question, index) => {
        if (isRecord(question)) {
          collected.questions.push({ value: question, file, path: ['questions', index] })
        }
      })
    }
  }

  return collected
}
