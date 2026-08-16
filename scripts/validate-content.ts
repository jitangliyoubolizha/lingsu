import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { parse } from 'yaml'

const CONTENT_DIR = path.resolve('content')
const YAML_EXTENSIONS = new Set(['.yaml', '.yml'])

/** 递归收集 content 目录下的全部 YAML 文件路径。 */
async function listYamlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listYamlFiles(fullPath)))
    } else if (entry.isFile() && YAML_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath)
    }
  }

  return files
}

async function main(): Promise<void> {
  const files = await listYamlFiles(CONTENT_DIR)
  const errors: string[] = []

  for (const file of files) {
    const raw = await readFile(file, 'utf8')
    try {
      parse(raw)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${path.relative(process.cwd(), file)}: ${message}`)
    }
  }

  if (errors.length > 0) {
    console.error(`内容校验失败：${errors.length} 个文件`)
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    process.exit(1)
  }

  console.log(`内容校验通过：${files.length} 个 YAML 文件`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
