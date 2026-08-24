/**
 * 学习计划持久化。
 */
import type { StudyPlan, StudyPlanScope } from '../domain/memory/types'
import { db } from './db'

/** 新增学习计划的输入，不包含 id 与 status（由创建函数统一生成）。 */
export interface CreateStudyPlanInput {
  name: string
  scope: StudyPlanScope
  dailyNew: 3 | 5 | 10
  /** 开始日期 YYYY-MM-DD，缺省为当天。 */
  startDate?: string
}

/** 同一时间最多保持进行的计划数。 */
export const MAX_ACTIVE_PLANS = 2

let planSeq = 0

/**
 * 保存学习计划（新增或更新）。
 */
export async function saveStudyPlan(plan: StudyPlan): Promise<void> {
  await db.studyPlans.put(plan)
}

/**
 * 新增一个 active 学习计划。
 * 若已存在 2 个 active 计划则拒绝创建，返回 null。
 * @returns 创建成功的计划；超上限返回 null
 */
export async function createStudyPlan(input: CreateStudyPlanInput): Promise<StudyPlan | null> {
  if ((await getActivePlanCount()) >= MAX_ACTIVE_PLANS) {
    return null
  }
  planSeq += 1
  const plan: StudyPlan = {
    id: `plan-${Date.now().toString(36)}-${planSeq}`,
    name: input.name,
    scope: input.scope,
    dailyNew: input.dailyNew,
    startDate: input.startDate ?? new Date().toISOString().slice(0, 10),
    status: 'active',
  }
  await saveStudyPlan(plan)
  return plan
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
 * 获取 active 计划数量。
 */
export async function getActivePlanCount(): Promise<number> {
  return db.studyPlans.where('status').equals('active').count()
}

/**
 * 切换计划状态（暂停 ↔ 激活）。
 * 激活时检查是否超过 2 个 active 上限。
 * @returns 是否成功切换
 */
export async function togglePlanStatus(plan: StudyPlan): Promise<boolean> {
  if (plan.status === 'active') {
    await db.studyPlans.update(plan.id, { status: 'paused' })
    return true
  }
  const activeCount = await getActivePlanCount()
  if (activeCount >= 2) {
    return false
  }
  await db.studyPlans.update(plan.id, { status: 'active' })
  return true
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
