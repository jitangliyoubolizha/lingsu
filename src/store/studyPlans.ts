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
 * 删除学习计划。
 */
export async function deleteStudyPlan(id: string): Promise<void> {
  await db.studyPlans.delete(id)
}
