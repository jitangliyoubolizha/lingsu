/**
 * 收藏持久化。
 */
import type { FavoriteRecord } from './db'
import { db } from './db'

function favoriteId(type: FavoriteRecord['type'], targetId: string): string {
  return `${type}:${targetId}`
}

/**
 * 添加收藏。
 */
export async function addFavorite(
  type: FavoriteRecord['type'],
  targetId: string,
  createdAt: Date = new Date()
): Promise<void> {
  await db.favorites.put({ id: favoriteId(type, targetId), type, targetId, createdAt })
}

/**
 * 取消收藏。
 */
export async function removeFavorite(
  type: FavoriteRecord['type'],
  targetId: string
): Promise<void> {
  await db.favorites.delete(favoriteId(type, targetId))
}

/**
 * 是否已收藏。
 */
export async function isFavorite(type: FavoriteRecord['type'], targetId: string): Promise<boolean> {
  return Boolean(await db.favorites.get(favoriteId(type, targetId)))
}

/**
 * 获取全部收藏。
 */
export async function getFavorites(): Promise<FavoriteRecord[]> {
  return db.favorites.toArray()
}
