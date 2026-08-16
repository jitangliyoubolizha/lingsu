import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { buildContent } from './content-builder'
import { validateContent } from './validator'

async function main(): Promise<void> {
  const contentDir = path.resolve('content')
  const outFile = path.resolve('src/data/generated/content.json')

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

  const data = await buildContent(contentDir)
  await mkdir(path.dirname(outFile), { recursive: true })
  await writeFile(outFile, JSON.stringify(data, null, 2), 'utf8')

  console.log(`内容构建完成 -> ${path.relative(process.cwd(), outFile)}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
})
