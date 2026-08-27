/**
 * 设置读写。
 */
import { db } from './db'

const AGREED_KEY = 'agreed'
const LS_AGREED_KEY = 'lingsu.agreed'

function readMirrorFlag(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(LS_AGREED_KEY) === '1'
  } catch {
    return false
  }
}

function writeMirrorFlag(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LS_AGREED_KEY, '1')
  } catch {
    // 隐私模式等场景下写入失败，忽略
  }
}

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
 *
 * 持久化双保险：主存 IndexedDB（settings 表），镜像 localStorage。
 * 移动端浏览器存在定期清理站点存储的策略（如 Safari 对长期不活跃站点
 * 的 7 天清除），单一存储会导致协议页反复弹出，因此读取时任一路径为真
 * 即视为已同意；写入时任一失败不抛错、不阻断同意流程。
 */
export async function hasAgreed(): Promise<boolean> {
  let idbAgreed = false
  try {
    idbAgreed = await getSetting<boolean>(AGREED_KEY, false)
  } catch {
    // IndexedDB 打开/读取异常时退回镜像判断
  }
  return idbAgreed || readMirrorFlag()
}

/**
 * 标记已同意协议。IDB 与 localStorage 镜像双写，任一失败静默容忍。
 */
export async function markAgreed(): Promise<void> {
  writeMirrorFlag()
  try {
    await setSetting(AGREED_KEY, true)
  } catch {
    // 镜像已保底；失败常见于隐私模式配额限制
  }
}
