import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { Chapter, ContentMeta } from '../src/data/types'
import { buildContent } from './content-builder'
import { validateContent } from './validator'

/**
 * 构建内容产物：meta.json（轻量元数据，随主包加载）与 chapters/<code>.json（按篇拆分，按需加载）。
 * @param contentDir 内容源目录（content/）
 * @param outDir 产物目录（src/data/generated/）
 */
async function writeSplitContent(contentDir: string, outDir: string): Promise<void> {
  const data = await buildContent(contentDir)

  const meta: ContentMeta = {
    book: data.book,
    edition: data.edition,
    chapters: data.chapters.map((chapter) => ({
      code: chapter.code,
      name: chapter.name,
      order: chapter.order,
      part: chapter.part,
      partTotal: chapter.partTotal,
      clauseCount: chapter.clauses.length,
    })),
    clauseOrder: data.chapters.flatMap((chapter) => chapter.clauses.map((clause) => clause.id)),
    // 方剂仅保留摘要进主包，完整数据（组成/煎服/剂量等）拆到 formulas.json 按需加载
    formulas: data.formulas.map(({ id, name, category }) => ({ id, name, category })),
    herbs: data.herbs,
    symptomTerms: data.symptomTerms,
    questions: data.questions,
  }

  await mkdir(path.join(outDir, 'chapters'), { recursive: true })
  await writeFile(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8')
  await writeFile(path.join(outDir, 'formulas.json'), JSON.stringify(data.formulas, null, 2), 'utf8')

  for (const chapter of data.chapters) {
    await writeFile(
      path.join(outDir, 'chapters', `${chapter.code}.json`),
      JSON.stringify(chapter satisfies Chapter, null, 2),
      'utf8'
    )
  }
}

async function main(): Promise<void> {
  const contentDir = path.resolve('content')
  const outDir = path.resolve('src/data/generated')

  const issues = await validateContent(contentDir)
  if (issues.length > 0) {
    console.error('内容构建失败：校验未通过')
    for (const issue of issues) {
      console.error(
        `${issue.file}:${issue.line} ${issue.code} ${issue.field} ${issue.message} 建议：${issue.suggestion}`
      )
    }
    process.exit(issues.some((issue) => issue.fatal) ? 2 : 1)
  }

  // 移除旧的单文件产物，避免拆分产物与旧文件并存造成数据源歧义
  await rm(path.join(outDir, 'content.json'), { force: true })
  await writeSplitContent(contentDir, outDir)

  console.log(`内容构建完成 -> ${path.relative(process.cwd(), outDir)}（meta.json + chapters/）`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
})
