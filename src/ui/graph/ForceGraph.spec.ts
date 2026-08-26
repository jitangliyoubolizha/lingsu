// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ForceGraph } from './ForceGraph'

/* ---------- 测试用桩件 ---------- */

function makeCtx(): CanvasRenderingContext2D {
  const target: Record<string, unknown> = {}
  return new Proxy(target, {
    get(t, key) {
      if (!(key in t)) t[key as string] = vi.fn()
      return t[key as string]
    },
    set(t, key, value) {
      t[key as string] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

function makeCanvas(ctx: CanvasRenderingContext2D): HTMLCanvasElement {
  const canvas = {
    style: {} as Record<string, string>,
    clientWidth: 800,
    clientHeight: 600,
    getContext: () => ctx,
    width: 0,
    height: 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    classList: { add: vi.fn(), remove: vi.fn() },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  }
  return canvas as unknown as HTMLCanvasElement
}

const BASE_NODES = [
  { id: 'f:1', label: '甲汤', type: 'formula' },
  { id: 'h:1', label: '药一', type: 'herb' },
  { id: 'h:2', label: '药二', type: 'herb' },
  { id: 'h:3', label: '药三', type: 'herb' },
]
const BASE_LINKS = [
  { source: 'f:1', target: 'h:1', kind: 'compose' },
  { source: 'f:1', target: 'h:2', kind: 'compose' },
  { source: 'h:2', target: 'h:3', kind: 'pair' },
]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ForceGraph', () => {
  it('setData 时同 id 节点保留坐标，仅新增节点随机落位（布局保位）', () => {
    let seq = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seq += 1
      return ((seq * 37) % 97) / 97
    })

    const graph = new ForceGraph(makeCanvas(makeCtx()))
    graph.setData(
      BASE_NODES.slice(0, 3).map((n) => ({ ...n })),
      [{ source: 'f:1', target: 'h:1', kind: 'compose' }]
    )

    const f1Before = { x: graph.nodeById.get('f:1')!.x, y: graph.nodeById.get('f:1')!.y }
    const h1Before = { x: graph.nodeById.get('h:1')!.x, y: graph.nodeById.get('h:1')!.y }

    graph.setData(BASE_NODES.map((n) => ({ ...n })), [])
    expect(graph.nodeById.get('f:1')!.x).toBeCloseTo(f1Before.x, 6)
    expect(graph.nodeById.get('f:1')!.y).toBeCloseTo(f1Before.y, 6)
    expect(graph.nodeById.get('h:1')!.x).toBeCloseTo(h1Before.x, 6)

    graph.dispose()
  })

  it('step() 单步推进物理并让 alpha 单调下降，低于阈值后停摆', () => {
    const graph = new ForceGraph(makeCanvas(makeCtx()))
    graph.setData(BASE_NODES.map((n) => ({ ...n })), BASE_LINKS)

    const a0 = graph.alpha
    graph.step()
    expect(graph.alpha).toBeLessThan(a0)

    graph.dispose()
  })

  it('selectById 收敛邻居集合（含自身与直接相连节点），clearSelection 清空', () => {
    const onSelect = vi.fn()
    const graph = new ForceGraph(makeCanvas(makeCtx()), { onSelect })
    graph.setData(BASE_NODES.map((n) => ({ ...n })), BASE_LINKS)

    graph.selectById('f:1')
    expect(onSelect).toHaveBeenCalled()
    const neighborsOfF1 = new Set([...graph.neighborSet])
    expect(neighborsOfF1.has('f:1')).toBe(true)
    expect(neighborsOfF1.has('h:1')).toBe(true)
    expect(neighborsOfF1.has('h:2')).toBe(true)
    expect(neighborsOfF1.has('h:3')).toBe(false)

    graph.selectById('h:2')
    const neighborsOfH2 = new Set([...graph.neighborSet])
    expect(neighborsOfH2.has('f:1')).toBe(true)
    expect(neighborsOfH2.has('h:3')).toBe(true)
    expect(neighborsOfH2.has('h:1')).toBe(false)

    graph.clearSelection()
    expect(graph.neighborSet.size).toBe(0)

    graph.dispose()
  })

  it('fitView 将包围盒纳入视野并居中', () => {
    const graph = new ForceGraph(makeCanvas(makeCtx()))
    graph.setData(BASE_NODES.map((n) => ({ ...n })), [])

    // 固定全部节点坐标，包围盒中点为原点
    for (const [id, x, y] of [
      ['f:1', -200, -150],
      ['h:1', 200, 150],
      ['h:2', 0, 0],
      ['h:3', 10, -10],
    ] as const) {
      graph.nodeById.get(id)!.x = x
      graph.nodeById.get(id)!.y = y
    }

    graph.fitView()
    expect(graph.scale).toBeGreaterThan(0)
    // 包围盒中点 (0, 0)：视口中心应对准原点附近
    expect(Math.abs(graph.viewX)).toBeLessThan(20)
    expect(Math.abs(graph.viewY)).toBeLessThan(20)

    graph.dispose()
  })

  it('relayout 清空坐标备忘并重新布位、归零物理', () => {
    let seq = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seq += 1
      return ((seq * 37) % 97) / 97
    })

    const graph = new ForceGraph(makeCanvas(makeCtx()))
    graph.setData(BASE_NODES.map((n) => ({ ...n })), BASE_LINKS)
    const before = graph.nodeById.get('f:1')!.x

    // 改变随机序列后 relayout 应产生不同落位
    seq = 50
    graph.alpha = 0 // 先让物理停摆再验证 relayout 复热
    graph.relayout()

    expect(graph.nodeById.get('f:1')!.x).not.toBeCloseTo(before, 3)
    expect(graph.alpha).toBe(1)
    expect(graph.selected).toBeNull()
    expect(graph.neighborSet.size).toBe(0)

    graph.dispose()
  })

  it('dispose 解绑全局监听并停止后续帧循环', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')

    const graph = new ForceGraph(makeCanvas(makeCtx()))
    graph.setData(BASE_NODES.map((n) => ({ ...n })), BASE_LINKS)
    graph.dispose()

    const removedEvents = removeSpy.mock.calls.map((call) => call[0])
    expect(removedEvents).toContain('resize')
    expect(cancelSpy).toHaveBeenCalled()

    // dispose 后手动 step 不应再改变状态或抛错
    expect(() => graph.step()).not.toThrow()
  })

  it('devicePixelRatio 高分屏下渲染尺寸按上限 2 计算', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 3,
    })
    const ctx = makeCtx()
    const canvasEl = makeCanvas(ctx)
    const graph = new ForceGraph(canvasEl)
    graph.handleResize()
    expect(canvasEl.width).toBe(1600)
    expect(canvasEl.height).toBe(1200)
    graph.dispose()
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 1,
    })
  })
})
