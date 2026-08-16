import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { parse } from 'yaml'

const CONTENT_DIR = path.resolve('content')
const OUT_FILE = path.resolve('src/data/generated/content.json')
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
  const items = []

  for (const file of files) {
    const raw = await readFile(file, 'utf8')
    const relativePath = path.relative(CONTENT_DIR, file).replace(/\\/g, '/')
    items.push({ path: relativePath, data: parse(raw) })
  }

  await mkdir(path.dirname(OUT_FILE), { recursive: true })
  await writeFile(
    OUT_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), files: items }, null, 2),
    'utf8'
  )

  console.log(`内容构建完成：${items.length} 个文件 -> ${path.relative(process.cwd(), OUT_FILE)}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
