import type { Chapter, ContentData, ContentMeta, Formula } from './types'
import metaJson from './generated/meta.json'

/** 按篇懒加载器：由 Vite 静态分析，每篇 JSON 编译为独立异步 chunk。 */
const chapterLoaders = import.meta.glob('./generated/chapters/*.json') as Record<
  string,
  () => Promise<{ default: Chapter }>
>

/** 完整方剂数据懒加载器：独立异步 chunk，随主包仅保留方剂摘要。 */
const formulaLoaders = import.meta.glob('./generated/formulas.json') as Record<
  string,
  () => Promise<{ default: Formula[] }>
>

let metaCache: ContentMeta | undefined
const chapterCache = new Map<string, Chapter>()
let formulasCache: Formula[] | undefined
let contentCache: ContentData | undefined

/**
 * 加载内容元数据（书、篇章目录、全书条文顺序、方剂、药物、术语、题目）。
 * 元数据随主包加载，不含条文正文，同步返回。
 * @returns 内容元数据对象
 */
export function loadMeta(): ContentMeta {
  if (!metaCache) {
    metaCache = metaJson as ContentMeta
  }
  return metaCache
}

/**
 * 按篇章代码按需加载单篇条文（含缓存）。
 * @param code 篇章代码（如 TYS）
 * @returns 篇章对象；代码不存在时返回 undefined
 */
export async function loadChapter(code: string): Promise<Chapter | undefined> {
  const cached = chapterCache.get(code)
  if (cached) return cached

  const loader = chapterLoaders[`./generated/chapters/${code}.json`]
  if (!loader) return undefined

  const chapter = (await loader()).default
  chapterCache.set(code, chapter)
  return chapter
}

/**
 * 加载全部篇章（按篇章顺序），已加载的篇章走缓存。
 * @returns 全部篇章数组
 */
export async function loadAllChapters(): Promise<Chapter[]> {
  const metas = loadMeta().chapters
  const chapters = await Promise.all(
    metas.map((chapterMeta) => loadChapter(chapterMeta.code))
  )
  return chapters.filter((chapter): chapter is Chapter => Boolean(chapter))
}

/**
 * 依据全书条文顺序定位条文所属篇章（仅用元数据，不加载条文正文）。
 * @param clauseId 条文 ID（如 SHL.SB.TYS.001）
 * @returns 篇章代码；条文不存在时返回 undefined
 */
export function chapterCodeOfClause(clauseId: string): string | undefined {
  const meta = loadMeta()
  const index = meta.clauseOrder.indexOf(clauseId)
  if (index < 0) return undefined

  let remaining = index
  for (const chapterMeta of meta.chapters) {
    if (remaining < chapterMeta.clauseCount) return chapterMeta.code
    remaining -= chapterMeta.clauseCount
  }
  return undefined
}

/**
 * 加载完整方剂数据（含缓存）。
 * 列表/搜索/收藏等只需摘要的场景优先用 loadMeta().formulas；需完整字段时调用本函数。
 * @returns 完整方剂数组
 */
export async function loadAllFormulas(): Promise<Formula[]> {
  if (formulasCache) return formulasCache

  const loader = formulaLoaders['./generated/formulas.json']
  if (!loader) return []

  formulasCache = (await loader()).default
  return formulasCache
}

/**
 * 按 ID 加载单个完整方剂。
 * @param id 方剂 ID（如 SHL.SB.F.001）
 * @returns 方剂对象；ID 不存在时返回 undefined
 */
export async function loadFormula(id: string): Promise<Formula | undefined> {
  const formulas = await loadAllFormulas()
  return formulas.find((formula) => formula.id === id)
}

/**
 * 加载全量内容数据：元数据 + 全部篇章 + 完整方剂，clauses 由各篇条文按顺序派生。
 * 供搜索、刷题、每日任务等需要跨篇数据的页面使用；仅浏览单篇/单条的页面应优先用 loadMeta/loadChapter。
 * @returns 完整内容数据对象
 */
export async function loadContent(): Promise<ContentData> {
  if (contentCache) return contentCache

  const meta = loadMeta()
  const [chapters, formulas] = await Promise.all([loadAllChapters(), loadAllFormulas()])
  contentCache = {
    ...meta,
    chapters,
    clauses: chapters.flatMap((chapter) => chapter.clauses),
    formulas,
  }
  return contentCache
}
