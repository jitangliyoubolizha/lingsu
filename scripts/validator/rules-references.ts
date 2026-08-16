import {
  addIssue,
  isRecord,
  isString,
  isEmptyString,
  type Collected,
  type EntityRef,
  type ValidationIssue,
} from './types'

function checkRef(
  entity: EntityRef,
  fieldPath: Array<string | number>,
  fieldName: string,
  value: unknown,
  validIds: Set<string>,
  issues: ValidationIssue[]
): void {
  if (!isString(value) || !validIds.has(value)) {
    addIssue(
      issues,
      entity.file,
      fieldPath,
      'E2003',
      fieldName,
      `引用不存在：${String(value)}`,
      '请改为存在的 ID'
    )
  }
}

export function validateReferences(collected: Collected, issues: ValidationIssue[]): void {
  const clauseIds = new Set(collected.clauses.map((item) => item.value.id).filter(isString))
  const formulaIds = new Set(collected.formulas.map((item) => item.value.id).filter(isString))
  const herbIds = new Set(collected.herbs.map((item) => item.value.id).filter(isString))
  const termIds = new Set(collected.terms.map((item) => item.value.id).filter(isString))

  for (const clause of collected.clauses) {
    if (Array.isArray(clause.value.formulas)) {
      clause.value.formulas.forEach((formula, index) => {
        checkRef(
          clause,
          clause.path.concat('formulas', index),
          'clauses[].formulas[]',
          formula,
          formulaIds,
          issues
        )
      })
    }
    if (Array.isArray(clause.value.symptom_tags)) {
      clause.value.symptom_tags.forEach((term, index) => {
        checkRef(
          clause,
          clause.path.concat('symptom_tags', index),
          'clauses[].symptom_tags[]',
          term,
          termIds,
          issues
        )
      })
    }
  }

  for (const formula of collected.formulas) {
    if (Array.isArray(formula.value.composition)) {
      formula.value.composition.forEach((item, index) => {
        if (isRecord(item)) {
          checkRef(
            formula,
            formula.path.concat('composition', index, 'herb'),
            'formulas[].composition[].herb',
            item.herb,
            herbIds,
            issues
          )
        }
      })
    }
    if (Array.isArray(formula.value.related_clauses)) {
      formula.value.related_clauses.forEach((clause, index) => {
        checkRef(
          formula,
          formula.path.concat('related_clauses', index),
          'formulas[].related_clauses[]',
          clause,
          clauseIds,
          issues
        )
      })
    }
    if (Array.isArray(formula.value.related_formulas)) {
      formula.value.related_formulas.forEach((relation, index) => {
        if (isRecord(relation)) {
          checkRef(
            formula,
            formula.path.concat('related_formulas', index, 'target'),
            'formulas[].related_formulas[].target',
            relation.target,
            formulaIds,
            issues
          )
        }
      })
    }
    for (const field of ['main_symptoms', 'pulse'] as const) {
      if (Array.isArray(formula.value[field])) {
        formula.value[field].forEach((term, index) => {
          checkRef(
            formula,
            formula.path.concat(field, index),
            `formulas[].${field}[]`,
            term,
            termIds,
            issues
          )
        })
      }
    }
  }

  for (const question of collected.questions) {
    checkRef(
      question,
      question.path.concat('clause'),
      'questions[].clause',
      question.value.clause,
      clauseIds,
      issues
    )
    if (!isEmptyString(question.value.formula)) {
      checkRef(
        question,
        question.path.concat('formula'),
        'questions[].formula',
        question.value.formula,
        formulaIds,
        issues
      )
    }
  }
}

export function validateUniqueness(collected: Collected, issues: ValidationIssue[]): void {
  const seen = new Map<string, EntityRef>()

  const check = (entity: EntityRef, fieldName: string): void => {
    const id = entity.value.id
    if (!isString(id) || id.trim() === '') {
      return
    }
    const previous = seen.get(id)
    if (previous) {
      addIssue(
        issues,
        entity.file,
        entity.path.concat('id'),
        'E2001',
        `${fieldName}.id`,
        `ID 重复：${id}`,
        '请改为全局唯一 ID'
      )
      addIssue(
        issues,
        previous.file,
        previous.path.concat('id'),
        'E2001',
        `${fieldName}.id`,
        `ID 重复：${id}`,
        '请改为全局唯一 ID'
      )
    } else {
      seen.set(id, entity)
    }
  }

  for (const clause of collected.clauses) check(clause, 'clauses')
  for (const formula of collected.formulas) check(formula, 'formulas')
  for (const herb of collected.herbs) check(herb, 'herbs')
  for (const term of collected.terms) check(term, 'terms')
  for (const question of collected.questions) check(question, 'questions')
}
