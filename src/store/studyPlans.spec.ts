import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { StudyPlan } from '../domain/memory'
import { db } from './db'
import {
  createStudyPlan,
  deleteStudyPlan,
  ensureDefaultStudyPlan,
  getActivePlanCount,
  getActiveStudyPlans,
  getAllStudyPlans,
  saveStudyPlan,
  togglePlanStatus,
} from './studyPlans'

function makePlan(overrides: Partial<StudyPlan> = {}): StudyPlan {
  return {
    id: 'plan-test',
    name: '太阳病上篇计划',
    scope: { book: 'SHL', edition: 'SB', chapters: ['TYS'] },
    dailyNew: 3,
    startDate: '2026-08-01',
    status: 'active',
    ...overrides,
  }
}

describe('store/studyPlans 学习计划管理', () => {
  beforeEach(async () => {
    await db.delete().catch(() => undefined)
    await db.open()
  })

  afterEach(async () => {
    await db.delete().catch(() => undefined)
  })

  it('保存并读取全部学习计划', async () => {
    await saveStudyPlan(makePlan({ id: 'p1', name: '甲计划' }))
    await saveStudyPlan(makePlan({ id: 'p2', name: '乙计划', status: 'paused' }))

    const plans = await getAllStudyPlans()
    expect(plans).toHaveLength(2)
    expect(plans.map((plan) => plan.name)).toEqual(['甲计划', '乙计划'])
  })

  it('getActiveStudyPlans 只返回 active 计划且最多两个', async () => {
    await saveStudyPlan(makePlan({ id: 'p1', name: '甲' }))
    await saveStudyPlan(makePlan({ id: 'p2', name: '乙' }))
    await saveStudyPlan(makePlan({ id: 'p3', name: '丙' }))
    await saveStudyPlan(makePlan({ id: 'p4', name: '丁', status: 'paused' }))

    const active = await getActiveStudyPlans()
    expect(active).toHaveLength(2)
    expect(active.every((plan) => plan.status === 'active')).toBe(true)
  })

  it('getActivePlanCount 正确统计 active 数量', async () => {
    await saveStudyPlan(makePlan({ id: 'p1' }))
    await saveStudyPlan(makePlan({ id: 'p2', status: 'paused' }))
    await saveStudyPlan(makePlan({ id: 'p3', status: 'completed' }))

    expect(await getActivePlanCount()).toBe(1)
  })

  describe('togglePlanStatus 暂停/激活', () => {
    it('active 计划可暂停', async () => {
      await saveStudyPlan(makePlan({ id: 'p1', status: 'active' }))

      const ok = await togglePlanStatus(makePlan({ id: 'p1', status: 'active' }))
      expect(ok).toBe(true)
      expect((await db.studyPlans.get('p1'))?.status).toBe('paused')
    })

    it('paused 计划在未达上限时可激活', async () => {
      await saveStudyPlan(makePlan({ id: 'p1', status: 'paused' }))

      const ok = await togglePlanStatus(makePlan({ id: 'p1', status: 'paused' }))
      expect(ok).toBe(true)
      expect((await db.studyPlans.get('p1'))?.status).toBe('active')
    })

    it('已有两个 active 时激活第三个被拒绝且状态不变', async () => {
      await saveStudyPlan(makePlan({ id: 'p1', status: 'active' }))
      await saveStudyPlan(makePlan({ id: 'p2', status: 'active' }))
      await saveStudyPlan(makePlan({ id: 'p3', status: 'paused' }))

      const ok = await togglePlanStatus(makePlan({ id: 'p3', status: 'paused' }))
      expect(ok).toBe(false)
      expect((await db.studyPlans.get('p3'))?.status).toBe('paused')
    })

    it('completed 计划可重新激活', async () => {
      await saveStudyPlan(makePlan({ id: 'p1', status: 'completed' }))

      const ok = await togglePlanStatus(makePlan({ id: 'p1', status: 'completed' }))
      expect(ok).toBe(true)
      expect((await db.studyPlans.get('p1'))?.status).toBe('active')
    })
  })

  describe('createStudyPlan 新增计划', () => {
    it('新增计划默认 active，自动生成 id 与当天 startDate', async () => {
      const plan = await createStudyPlan({
        name: '阳明病计划',
        scope: { book: 'SHL', edition: 'SB', chapters: ['YM'] },
        dailyNew: 5,
      })

      expect(plan).not.toBeNull()
      expect(plan!.id).toMatch(/^plan-/)
      expect(plan!.status).toBe('active')
      expect(plan!.startDate).toBe(new Date().toISOString().slice(0, 10))

      const stored = await db.studyPlans.get(plan!.id)
      expect(stored?.name).toBe('阳明病计划')
    })

    it('新增计划可指定 startDate 与每日新学数量', async () => {
      const plan = await createStudyPlan({
        name: '太阴病计划',
        scope: { book: 'SHL', edition: 'SB', chapters: ['TAI'] },
        dailyNew: 10,
        startDate: '2026-09-01',
      })

      expect(plan!.dailyNew).toBe(10)
      expect(plan!.startDate).toBe('2026-09-01')
    })

    it('已有两个 active 时新增返回 null 且不写入', async () => {
      await saveStudyPlan(makePlan({ id: 'p1', status: 'active' }))
      await saveStudyPlan(makePlan({ id: 'p2', status: 'active' }))

      const plan = await createStudyPlan({
        name: '少阳病计划',
        scope: { book: 'SHL', edition: 'SB', chapters: ['SY'] },
        dailyNew: 3,
      })

      expect(plan).toBeNull()
      expect(await getActivePlanCount()).toBe(2)
    })
  })

  describe('ensureDefaultStudyPlan 兜底', () => {
    it('无 active 计划时创建默认「太阳病上篇」计划', async () => {
      const plan = await ensureDefaultStudyPlan()
      expect(plan.status).toBe('active')
      expect(plan.name).toBe('太阳病上篇 30 天计划')
      expect(plan.scope.chapters).toEqual(['TYS'])
      expect(await getActivePlanCount()).toBe(1)
    })

    it('已有 active 计划时直接返回第一个', async () => {
      await saveStudyPlan(makePlan({ id: 'p1', name: '既有计划' }))

      const plan = await ensureDefaultStudyPlan()
      expect(plan.id).toBe('p1')
      expect(await getAllStudyPlans()).toHaveLength(1)
    })
  })

  it('deleteStudyPlan 删除后不再出现', async () => {
    await saveStudyPlan(makePlan({ id: 'p1' }))
    await deleteStudyPlan('p1')

    expect(await getAllStudyPlans()).toEqual([])
  })
})
