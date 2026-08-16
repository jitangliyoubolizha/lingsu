import path from 'node:path'

import { validateContent } from './validator'

async function main(): Promise<void> {
  const contentDir = path.resolve('content')
  const issues = await validateContent(contentDir)

  if (issues.some((issue) => issue.fatal)) {
    console.error('内容校验失败（脚本/解析错误）')
    for (const issue of issues) {
      console.error(formatIssue(issue))
    }
    process.exit(2)
  }

  if (issues.length > 0) {
    console.error(`内容校验失败：${issues.length} 个问题`)
    for (const issue of issues) {
      console.error(formatIssue(issue))
    }
    process.exit(1)
  }

  console.log('内容校验通过')
}

function formatIssue(issue: {
  file: string
  line: number
  code: string
  field: string
  message: string
  suggestion: string
}): string {
  const location = issue.file ? `${issue.file}:${issue.line}` : issue.field
  return `${location} ${issue.code} ${issue.field} ${issue.message} 建议：${issue.suggestion}`
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
})
