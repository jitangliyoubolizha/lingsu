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
    chapters: [{ code: 'TYS', name: '辨太阳病脉证并治上', order: 1, clauseCount: 30 }],
  }),
}))

import ProfileView from '../src/ui/views/ProfileView.vue'

const RouterLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
}

function mountProfile() {
  return mount(ProfileView, {
    global: { stubs: { RouterLink: RouterLinkStub, Transition: { template: '<div><slot /></div>' } } },
    attachTo: document.body,
  })
}

async function openSheet(wrapper: ReturnType<typeof mountProfile>) {
  await wrapper.find('button[aria-label="设置"]').trigger('click')
  await flushPromises()
  return wrapper.find('div[aria-label="设置弹层"]')
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('ProfileView 设置按钮弹层', () => {
  it('点击设置按钮打开弹层：含字号/朗读/每日新学，且外观主题仍在页面主体', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('外观主题') // 主题保留在主体
    expect(wrapper.text()).not.toContain('朗读语音') // 主体已移除

    const sheet = await openSheet(wrapper)
    expect(sheet.exists()).toBe(true)
    expect(sheet.text()).toContain('字号大小')
    expect(sheet.text()).toContain('朗读语音')
    expect(sheet.text()).toContain('每日新学数量')
  })

  it('弹层内改字号为大：写设置并应用到根元素', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    await flushPromises()
    const sheet = await openSheet(wrapper)

    await sheet.findAll('button').find((b) => b.text().includes('大'))!.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(await getSetting('fontSize', '中')).toBe('大')
    await flushPromises()
    expect(document.documentElement.classList.contains('font-size-lg')).toBe(true)
  })

  it('弹层内关闭朗读语音并生效', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    await flushPromises()
    const sheet = await openSheet(wrapper)

    const toggle = sheet.find('button[role="switch"]')
    await toggle.trigger('click')
    await flushPromises()

    expect(await getSetting('voiceEnabled', true)).toBe(false)
  })

  it('弹层内改每日新学为 12：设置与 active 计划联动', async () => {
    await ensureDefaultStudyPlan()
    const wrapper = mountProfile()
    await flushPromises()
    await flushPromises()
    const sheet = await openSheet(wrapper)

    await sheet.find('select[aria-label="每日新学数量"]').setValue('custom')
    await flushPromises()
    await sheet.find('input[aria-label="自定义条数"]').setValue('12')
    await sheet.findAll('button').find((b) => b.text().includes('应用'))!.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(await getSetting('dailyNew', 0)).toBe(12)
    const plans = await db.studyPlans.where('status').equals('active').toArray()
    expect(plans[0]?.dailyNew).toBe(12)
  })

  it('点关闭或遮罩可收起弹层', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    await flushPromises()
    await openSheet(wrapper)

    await wrapper.find('button[aria-label="关闭设置"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('div[aria-label="设置弹层"]').exists()).toBe(false)

    await openSheet(wrapper)
    await wrapper.find('div[aria-label="设置遮罩"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('div[aria-label="设置弹层"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
