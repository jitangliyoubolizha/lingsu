import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { parseDocument } from 'yaml'

import { YAML_EXTENSIONS, type YamlFile } from './types'

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

export async function loadYamlFiles(rootDir: string): Promise<YamlFile[]> {
  const files = await listYamlFiles(rootDir)
  const loaded: YamlFile[] = []

  for (const filePath of files) {
    const raw = await readFile(filePath, 'utf8')
    const doc = parseDocument(raw, { keepSourceTokens: true })
    const data = (doc.toJS() ?? {}) as Record<string, unknown>
    loaded.push({ path: filePath, raw, data, doc })
  }

  return loaded
}
