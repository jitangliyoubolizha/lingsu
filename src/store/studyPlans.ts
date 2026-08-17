/**
 * 学习计划持久化。
 */
import type { StudyPlan } from '../domain/memory/types'
import { db } from './db'

/**
 * 保存学习计划（新增或更新）。
 */
export async function saveStudyPlan(plan: StudyPlan): Promise<void> {
  await db.studyPlans.put(plan)
}

/**
 * 获取全部学习计划。
 */
export async function getAllStudyPlans(): Promise<StudyPlan[]> {
  return db.studyPlans.toArray()
}

/**
 * 获取 active 学习计划，最多两个。
 */
export async function getActiveStudyPlans(): Promise<StudyPlan[]> {
  const plans = await db.studyPlans.where('status').equals('active').toArray()
  return plans.slice(0, 2)
}

/**
 * 确保存在至少一个 active 学习计划。
 * 没有 active 计划时创建默认「太阳病上篇」计划，便于 MVP 每日任务直接可用。
 * @returns 当前第一个 active 计划
 */
export async function ensureDefaultStudyPlan(): Promise<StudyPlan> {
  const active = await getActiveStudyPlans()
  if (active.length > 0) {
    return active[0]
  }
  const today = new Date().toISOString().slice(0, 10)
  const plan: StudyPlan = {
    id: 'default-tys',
    name: '太阳病上篇 30 天计划',
    scope: { book: 'SHL', edition: 'SB', chapters: ['TYS'] },
    dailyNew: 3,
    startDate: today,
    status: 'active',
  }
  await saveStudyPlan(plan)
  return plan
}

/**
 * 删除学习计划。
 */
export async function deleteStudyPlan(id: string): Promise<void> {
  await db.studyPlans.delete(id)
}
