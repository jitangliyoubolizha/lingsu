/**
 * 条文笔记存取（E-5）。
 * 一条条文一篇笔记（clauseId 主键）；保存空内容等价于删除。
 */
import { db } from './db'
import type { NoteRecord } from './db'

/** 读取某条文的笔记；无笔记返回 null。 */
export async function getNote(clauseId: string): Promise<NoteRecord | null> {
  return (await db.notes.get(clauseId)) ?? null
}

/**
 * 保存笔记。内容去除首尾空白后为空时删除该笔记。
 */
export async function saveNote(clauseId: string, content: string): Promise<void> {
  const trimmed = content.trim()
  if (!trimmed) {
    await db.notes.delete(clauseId)
    return
  }
  await db.notes.put({ clauseId, content: trimmed, updatedAt: new Date() })
}

/** 删除笔记；记录不存在时静默成功。 */
export async function deleteNote(clauseId: string): Promise<void> {
  await db.notes.delete(clauseId)
}
