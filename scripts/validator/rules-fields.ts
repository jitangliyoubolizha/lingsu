import {
  addIssue,
  isNumber,
  isRecord,
  isString,
  isEmptyString,
  HERB_CATEGORIES,
  TERM_CATEGORIES,
  QUESTION_TYPES,
  QUESTION_STATUSES,
  type Collected,
  type ValidationIssue,
} from './types'

export function validateRequiredFields(collected: Collected, issues: ValidationIssue[]): void {
  for (const clause of collected.clauses) {
    const p = clause.path
    if (!isNumber(clause.value.no)) {
      addIssue(
        issues,
        clause.file,
        p.concat('no'),
        'E1002',
        'clauses[].no',
        'no 必须是数字',
        '请填写整数条文序号'
      )
    }
    for (const field of ['text', 'translation'] as const) {
      if (isEmptyString(clause.value[field])) {
        addIssue(
          issues,
          clause.file,
          p.concat(field),
          'E1001',
          `clauses[].${field}`,
          `缺少 ${field}`,
          `请补充 ${field}`
        )
      }
    }
    if (!Array.isArray(clause.value.annotations) || clause.value.annotations.length === 0) {
      addIssue(
        issues,
        clause.file,
        p.concat('annotations'),
        'E1001',
        'clauses[].annotations',
        '至少需要 1 条注解',
        '请补充 annotations'
      )
    } else {
      clause.value.annotations.forEach((annotation, index) => {
        if (!isRecord(annotation)) {
          addIssue(
            issues,
            clause.file,
            p.concat('annotations', index),
            'E1002',
            `clauses[].annotations[${index}]`,
            '注解必须是对象',
            '请检查注解结构'
          )
          return
        }
        for (const field of ['source', 'author', 'text'] as const) {
          if (isEmptyString(annotation[field])) {
            addIssue(
              issues,
              clause.file,
              p.concat('annotations', index, field),
              'E1001',
              `clauses[].annotations[${index}].${field}`,
              `注解缺少 ${field}`,
              `请补充 annotations[${index}].${field}`
            )
          }
        }
      })
    }
  }

  for (const formula of collected.formulas) {
    const p = formula.path
    for (const field of ['id', 'name', 'category', 'safety_notice'] as const) {
      if (isEmptyString(formula.value[field])) {
        addIssue(
          issues,
          formula.file,
          p.concat(field),
          'E1001',
          `formulas[].${field}`,
          `缺少 ${field}`,
          `请补充 ${field}`
        )
      }
    }
    if (!Array.isArray(formula.value.composition) || formula.value.composition.length === 0) {
      addIssue(
        issues,
        formula.file,
        p.concat('composition'),
        'E1001',
        'formulas[].composition',
        'composition 必须是非空数组',
        '请至少填写一味药'
      )
    } else {
      formula.value.composition.forEach((item, index) => {
        if (!isRecord(item)) {
          addIssue(
            issues,
            formula.file,
            p.concat('composition', index),
            'E1002',
            `formulas[].composition[${index}]`,
            '组成项必须是对象',
            '请检查 composition 结构'
          )
          return
        }
        if (isEmptyString(item.herb)) {
          addIssue(
            issues,
            formula.file,
            p.concat('composition', index, 'herb'),
            'E1001',
            `formulas[].composition[${index}].herb`,
            '缺少药物引用',
            '请填写存在的药物 ID'
          )
        }
      })
    }
  }

  for (const herb of collected.herbs) {
    if (isEmptyString(herb.value.name)) {
      addIssue(
        issues,
        herb.file,
        herb.path.concat('name'),
        'E1001',
        'herbs[].name',
        '缺少药名',
        '请填写 name'
      )
    }
    // 本草卡字段（81 味已全部补齐，升级为必填）：category 枚举、其余文本非空、归经为非空字符串数组
    if (!isString(herb.value.category) || !HERB_CATEGORIES.has(herb.value.category)) {
      addIssue(
        issues,
        herb.file,
        herb.path.concat('category'),
        'E1003',
        'herbs[].category',
        `category 必须是 ${Array.from(HERB_CATEGORIES).join(' / ')}`,
        '请修正 category'
      )
    }
    for (const field of ['nature', 'effects', 'applications', 'dosage', 'cautions'] as const) {
      if (isEmptyString(herb.value[field])) {
        addIssue(
          issues,
          herb.file,
          herb.path.concat(field),
          'E1001',
          `herbs[].${field}`,
          `本草卡缺少 ${field}`,
          `请补充 ${field}`
        )
      }
    }
    const meridians = herb.value.meridians
    if (
      !Array.isArray(meridians) ||
      meridians.length === 0 ||
      !meridians.every((item) => isString(item) && item.trim() !== '')
    ) {
      addIssue(
        issues,
        herb.file,
        herb.path.concat('meridians'),
        'E1002',
        'herbs[].meridians',
        'meridians 必须是非空字符串数组（脏腑名，不带「经」字）',
        '请补充归经，如 [心, 肺, 膀胱]'
      )
    }
  }

  for (const term of collected.terms) {
    if (isEmptyString(term.value.name)) {
      addIssue(
        issues,
        term.file,
        term.path.concat('name'),
        'E1001',
        'terms[].name',
        '缺少术语名',
        '请填写 name'
      )
    }
    if (!isString(term.value.category) || !TERM_CATEGORIES.has(term.value.category)) {
      addIssue(
        issues,
        term.file,
        term.path.concat('category'),
        'E1003',
        'terms[].category',
        `category 必须是 ${Array.from(TERM_CATEGORIES).join(' / ')}`,
        '请修正 category'
      )
    }
  }

  for (const question of collected.questions) {
    const p = question.path
    if (!isString(question.value.type) || !QUESTION_TYPES.has(question.value.type)) {
      addIssue(
        issues,
        question.file,
        p.concat('type'),
        'E1003',
        'questions[].type',
        `type 必须是 ${Array.from(QUESTION_TYPES).join(' / ')}`,
        '请修正 type'
      )
    }
    if (!isString(question.value.status) || !QUESTION_STATUSES.has(question.value.status)) {
      addIssue(
        issues,
        question.file,
        p.concat('status'),
        'E1003',
        'questions[].status',
        `status 必须是 ${Array.from(QUESTION_STATUSES).join(' / ')}`,
        '请修正 status'
      )
    }
    for (const field of ['clause', 'prompt', 'rationale'] as const) {
      if (isEmptyString(question.value[field])) {
        addIssue(
          issues,
          question.file,
          p.concat(field),
          'E1001',
          `questions[].${field}`,
          `缺少 ${field}`,
          `请补充 ${field}`
        )
      }
    }
    if (!Array.isArray(question.value.options) || question.value.options.length < 4) {
      addIssue(
        issues,
        question.file,
        p.concat('options'),
        'E1001',
        'questions[].options',
        'options 至少需要 4 个选项',
        '请补充到至少 4 个选项'
      )
    }
    if (isNumber(question.value.answer_index) && Array.isArray(question.value.options)) {
      if (
        question.value.answer_index < 0 ||
        question.value.answer_index >= question.value.options.length
      ) {
        addIssue(
          issues,
          question.file,
          p.concat('answer_index'),
          'E2004',
          'questions[].answer_index',
          'answer_index 超出 options 范围',
          '请修正 answer_index'
        )
      }
    }
    if (
      (question.value.type === 'formula_syndrome_match' ||
        question.value.type === 'formula_composition') &&
      isEmptyString(question.value.formula)
    ) {
      addIssue(
        issues,
        question.file,
        p.concat('formula'),
        'E1001',
        'questions[].formula',
        '该题型必须关联方剂',
        '请补充 formula'
      )
    }
  }
}
