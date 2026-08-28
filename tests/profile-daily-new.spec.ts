// @vitest-environment jsdom
import 'fake-indexeddb/auto'

import { flushPromises, mount } from '@vue/test-utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '../src/store/db'
import { ensureDefaultStudyPlan } from '../src/store/studyPlans'
import { getSetting } from '../src/store/settings'

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, fullPath: '/profile', params: {} }),
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    options: { history: { state: { back: null } } },
  }),
}))

vi.mock('../src/data', () => ({
  loadMeta: () => ({
    clauseOrder: [],
    formulas: [],
    symptomTerms: [],
    chapters: [
      { code: 'TYS', name: '辨太阳病脉证并治上', order: 1, clauseCount: 30 },
      { code: 'TYZ', name: '辨太阳病脉证并治中', order: 2, clauseCount: 66 },
    ],
  }),
}))

import ProfileView from '../src/ui/views/ProfileView.vue'

const RouterLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
}

function mountProfile() {
  return mount(ProfileView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

async function seedActiveDefaultPlan() {
  await ensureDefaultStudyPlan()
}

async function activePlanDailyNew(): Promise<number | undefined> {
  const plans = await db.studyPlans.where('status').equals('active').toArray()
  return plans[0]?.dailyNew
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('ProfileView 每日新学数量（含自定义）', () => {
  it('默认值为 5 条（2026-08-26 上调）', async () => {
    await seedActiveDefaultPlan()
    const wrapper = mountProfile()
    await flushPromises()
    await flushPromises()

    const select = wrapper.find('select[aria-label="每日新学数量"]')
    expect((select.element as HTMLSelectElement).value).toBe('5')
    expect(await getSetting<number>('dailyNew', 0)).toBe(5)
  })

  it('选择 8 条立即生效：写设置并联动更新 active 计划', async () => {
    await seedActiveDefaultPlan()
    const wrapper = mountProfile()
    await flushPromises()
    await flushPromises()

    const select = wrapper.find('select[aria-label="每日新学数量"]')
    await select.setValue('8')
    await flushPromises()
    await flushPromises()

    expect(await getSetting<number>('dailyNew', 0)).toBe(8)
    expect(await activePlanDailyNew()).toBe(8)
  })

  it('选择「自定义」出现数字输入，应用 12 后设置与计划同步生效', async () => {
    await seedActiveDefaultPlan()
    const wrapper = mountProfile()
    await flushPromises()
    await flushPromises()

    await wrapper.find('select[aria-label="每日新学数量"]').setValue('custom')
    await flushPromises()

    const input = wrapper.find('input[aria-label="自定义条数"]')
    expect(input.exists()).toBe(true)
    await input.setValue('12')
    await wrapper.findAll('button').find((b) => b.text().includes('应用'))!.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(await getSetting<number>('dailyNew', 0)).toBe(12)
    expect(await activePlanDailyNew()).toBe(12)
  })

  it('自定义输入越界时钳制到 1~20', async () => {
    await seedActiveDefaultPlan()
    const wrapper = mountProfile()
    await flushPromises()
    await flushPromises()

    await wrapper.find('select[aria-label="每日新学数量"]').setValue('custom')
    await flushPromises()
    await wrapper.find('input[aria-label="自定义条数"]').setValue('99')
    await wrapper.findAll('button').find((b) => b.text().includes('应用'))!.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(await getSetting<number>('dailyNew', 0)).toBe(20)

    await wrapper.find('input[aria-label="自定义条数"]').setValue('0')
    await wrapper.findAll('button').find((b) => b.text().includes('应用'))!.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(await getSetting<number>('dailyNew', 0)).toBe(1)
  })

  it('新增计划表单支持自定义条数并创建成功', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    await flushPromises()

    const add = wrapper.findAll('button').find((b) => b.text().includes('新增计划'))
    expect(add).toBeTruthy()
    await add!.trigger('click')
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text().includes('自定义'))!.trigger('click')
    await flushPromises()
    const input = wrapper.find('input[aria-label="自定义每日条数"]')
    expect(input.exists()).toBe(true)
    await input.setValue('6')

    const create = wrapper.findAll('button').find((b) => b.text().includes('创建计划'))
    await create!.trigger('click')
    await flushPromises()
    await flushPromises()

    const plans = await db.studyPlans.toArray()
    expect(plans.some((p) => p.dailyNew === 6)).toBe(true)
  })
})
