/**
 * 设置读写。
 */
import { db } from './db'

/**
 * 读取设置。
 * @param key 设置键
 * @param defaultValue 缺省值
 * @returns 设置值
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const record = await db.settings.get(key)
  return (record?.value as T | undefined) ?? defaultValue
}

/**
 * 写入设置。
 * @param key 设置键
 * @param value 设置值
 */
export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value })
}

/**
 * 是否已同意协议。
 */
export async function hasAgreed(): Promise<boolean> {
  return getSetting<boolean>('agreed', false)
}

/**
 * 标记已同意协议。
 */
export async function markAgreed(): Promise<void> {
  await setSetting('agreed', true)
}
