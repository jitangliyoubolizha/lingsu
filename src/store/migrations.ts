/**
 * 数据版本与迁移。
 * Dexie 的 version(n).stores 负责结构升级；这里集中登记业务迁移。
 */
export const CURRENT_SCHEMA_VERSION = 2

/** 仍可导入的历史备份版本（v1：无 notes 表；导入时按空表处理）。 */
export const SUPPORTED_SCHEMA_VERSIONS: number[] = [1, 2]

export interface Migration {
  version: number
  name: string
  run: () => Promise<void> | void
}

/**
 * 已登记的迁移列表。新增结构变更时在 `db.ts` 升版本并在此追加迁移。
 */
export const migrations: Migration[] = []

/**
 * 执行所有未执行的业务迁移。
 * MVP 暂无迁移，保留入口供后续版本使用。
 */
export async function runMigrations(): Promise<void> {
  for (const migration of migrations) {
    await migration.run()
  }
}
