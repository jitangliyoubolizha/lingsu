import type {
  Book,
  Chapter,
  Clause,
  ContentData,
  Edition,
  Formula,
  Herb,
  Question,
  SymptomTerm,
} from '../src/data/types'

import { collectEntities } from './validator/collect'
import { loadYamlFiles } from './validator/loader'
import type { Collected, EntityRef, YamlFile } from './validator/types'

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function toClause(value: Record<string, unknown>): Clause {
  return {
    id: value.id as string,
    no: value.no as number,
    text: value.text as string,
    translation: value.translation as string,
    annotations: Array.isArray(value.annotations)
      ? value.annotations.map((item) => ({
          source: (item as Record<string, unknown>).source as string,
          author: (item as Record<string, unknown>).author as string,
          text: (item as Record<string, unknown>).text as string,
        }))
      : [],
    formulas: toStringArray(value.formulas),
    symptomTags: toStringArray(value.symptom_tags),
    studyTags: toStringArray(value.study_tags),
    notes: typeof value.notes === 'string' ? value.notes : undefined,
  }
}

function toFormula(value: Record<string, unknown>): Formula {
  return {
    id: value.id as string,
    name: value.name as string,
    category: value.category as string,
    composition: Array.isArray(value.composition)
      ? value.composition.map((item) => ({
          herb: (item as Record<string, unknown>).herb as string,
          dose:
            typeof (item as Record<string, unknown>).dose === 'string'
              ? ((item as Record<string, unknown>).dose as string)
              : undefined,
          note:
            typeof (item as Record<string, unknown>).note === 'string'
              ? ((item as Record<string, unknown>).note as string)
              : undefined,
        }))
      : [],
    originalDoseText:
      typeof value.original_dose_text === 'string' ? value.original_dose_text : undefined,
    doseReference: typeof value.dose_reference === 'string' ? value.dose_reference : undefined,
    decoction: typeof value.decoction === 'string' ? value.decoction : undefined,
    relatedClauses: toStringArray(value.related_clauses),
    relatedFormulas: Array.isArray(value.related_formulas)
      ? value.related_formulas.map((item) => ({
          relation: (item as Record<string, unknown>).relation as string,
          target: (item as Record<string, unknown>).target as string,
          note:
            typeof (item as Record<string, unknown>).note === 'string'
              ? ((item as Record<string, unknown>).note as string)
              : undefined,
        }))
      : [],
    safetyNotice: value.safety_notice as string,
    mainSymptoms: toStringArray(value.main_symptoms),
    pulse: toStringArray(value.pulse),
    pathomechanism: typeof value.pathomechanism === 'string' ? value.pathomechanism : '',
  }
}

function toHerb(value: Record<string, unknown>): Herb {
  return {
    id: value.id as string,
    name: value.name as string,
    aliases: toStringArray(value.aliases),
    notes: typeof value.notes === 'string' ? value.notes : undefined,
  }
}

function toTerm(value: Record<string, unknown>): SymptomTerm {
  return {
    id: value.id as string,
    name: value.name as string,
    category: value.category as SymptomTerm['category'],
    aliases: toStringArray(value.aliases),
  }
}

function toQuestion(value: Record<string, unknown>): Question {
  return {
    id: value.id as string,
    type: value.type as Question['type'],
    clause: value.clause as string,
    formula: typeof value.formula === 'string' ? value.formula : undefined,
    prompt: value.prompt as string,
    options: toStringArray(value.options),
    answerIndex: value.answer_index as number,
    rationale: value.rationale as string,
    status: value.status as Question['status'],
  }
}

function toBook(value: Record<string, unknown>): Book {
  return {
    code: value.code as string,
    name: value.name as string,
    description: typeof value.description === 'string' ? value.description : undefined,
    editions: Array.isArray(value.editions)
      ? value.editions.map((item) => ({
          code: (item as Record<string, unknown>).code as string,
          name: (item as Record<string, unknown>).name as string,
        }))
      : [],
  }
}

function toEdition(value: Record<string, unknown>): Edition {
  return {
    code: value.code as string,
    book: value.book as string,
    name: value.name as string,
    source: value.source as string,
    chapters: Array.isArray(value.chapters)
      ? value.chapters.map((item) => ({
          code: (item as Record<string, unknown>).code as string,
          name: (item as Record<string, unknown>).name as string,
          order: (item as Record<string, unknown>).order as number,
          files: toStringArray((item as Record<string, unknown>).files),
        }))
      : [],
  }
}

function buildChapters(files: YamlFile[], collected: Collected): Chapter[] {
  const chapterMap = new Map<string, Chapter>()

  for (const chapterFile of collected.chapters) {
    const code = chapterFile.chapterCode
    const existing = chapterMap.get(code)
    const chapter: Chapter = existing ?? {
      code,
      name: chapterFile.value.name as string,
      order: chapterFile.value.order as number,
      part: typeof chapterFile.value.part === 'number' ? chapterFile.value.part : undefined,
      partTotal:
        typeof chapterFile.value.part_total === 'number' ? chapterFile.value.part_total : undefined,
      clauses: [],
    }

    if (!existing) {
      chapterMap.set(code, chapter)
    }

    const rawClauses = chapterFile.file.data[chapterFile.clausesPath[0]]
    if (Array.isArray(rawClauses)) {
      for (const rawClause of rawClauses) {
        if (rawClause && typeof rawClause === 'object') {
          chapter.clauses.push(toClause(rawClause as Record<string, unknown>))
        }
      }
    }
  }

  return Array.from(chapterMap.values()).sort((a, b) => a.order - b.order)
}

export function buildContentData(files: YamlFile[], collected: Collected): ContentData {
  return {
    book: collected.book ? toBook(collected.book.value) : ({} as Book),
    edition: collected.edition ? toEdition(collected.edition.value) : ({} as Edition),
    chapters: buildChapters(files, collected),
    clauses: collected.clauses.map((clause: EntityRef) => toClause(clause.value)),
    formulas: collected.formulas.map((formula: EntityRef) => toFormula(formula.value)),
    herbs: collected.herbs.map((herb: EntityRef) => toHerb(herb.value)),
    symptomTerms: collected.terms.map((term: EntityRef) => toTerm(term.value)),
    questions: collected.questions.map((question: EntityRef) => toQuestion(question.value)),
  }
}

export async function buildContent(rootDir: string): Promise<ContentData> {
  const files = await loadYamlFiles(rootDir)
  const collected = collectEntities(files)
  return buildContentData(files, collected)
}
