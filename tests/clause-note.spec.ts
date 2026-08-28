// @vitest-environment jsdom
import 'fake-indexeddb/auto'

import { flushPromises, mount } from '@vue/test-utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '../src/store/db'
import { getNote } from '../src/store/notes'

const route = { params: { id: 'SHL.SB.TYS.001' }, fullPath: '/clauses/x' }

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    options: { history: { state: { back: null } } },
  }),
}))

const clauseFixture = {
  id: 'SHL.SB.TYS.001',
  no: 1,
  text: '太阳之为病，脉浮，头项强痛而恶寒。',
  translation: '太阳病的基本脉证。',
  annotations: [],
  formulas: [],
  symptomTags: [],
  studyTags: [],
}

vi.mock('../src/data', () => ({
  loadMeta: () => ({
    clauseOrder: [clauseFixture.id],
    formulas: [],
    symptomTerms: [],
    chapters: [],
  }),
  loadChapter: () =>
    Promise.resolve({
      code: 'TYS',
      name: '辨太阳病脉证并治上',
      order: 1,
      clauses: [clauseFixture],
    }),
  chapterCodeOfClause: () => 'TYS',
}))

import ClauseDetailView from '../src/ui/views/ClauseDetailView.vue'

const RouterLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
}

function mountView() {
  return mount(ClauseDetailView, {
    global: { stubs: { RouterLink: RouterLinkStub, Transition: { template: '<div><slot /></div>' } } },
  })
}

beforeEach(async () => {
  route.params = { id: 'SHL.SB.TYS.001' }
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('ClauseDetailView 我的笔记（E-5）', () => {
  it('无笔记时显示空占位，输入并保存后写入本地库并提示已保存', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const area = wrapper.find('textarea[aria-label="我的笔记"]')
    expect(area).toBeTruthy()

    await area.setValue('桂枝汤主证：自汗出。')
    const save = wrapper.findAll('button').find((b) => b.text().includes('保存笔记'))
    expect(save).toBeTruthy()
    await save!.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('已保存')
    expect((await getNote(clauseFixture.id))?.content).toBe('桂枝汤主证：自汗出。')
  })

  it('已有笔记的条文重新进入时回填内容（跨会话持久化）', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    await wrapper.find('textarea[aria-label="我的笔记"]').setValue('第二条记忆点')
    await wrapper.findAll('button').find((b) => b.text().includes('保存笔记'))!.trigger('click')
    await flushPromises()
    wrapper.unmount()

    const again = mountView()
    await flushPromises()
    await flushPromises()

    expect((again.find('textarea[aria-label="我的笔记"]').element as HTMLTextAreaElement).value).toBe(
      '第二条记忆点'
    )
  })

  it('清空内容保存后笔记被删除', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const area = wrapper.find('textarea[aria-label="我的笔记"]')
    await area.setValue('临时内容')
    await wrapper.findAll('button').find((b) => b.text().includes('保存笔记'))!.trigger('click')
    await flushPromises()
    expect(await getNote(clauseFixture.id)).not.toBeNull()

    await area.setValue('')
    await wrapper.findAll('button').find((b) => b.text().includes('保存笔记'))!.trigger('click')
    await flushPromises()

    expect(await getNote(clauseFixture.id)).toBeNull()
  })
})
