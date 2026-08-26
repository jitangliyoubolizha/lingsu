/**
 * ForceGraph —— 零依赖 Canvas 力导向图引擎。
 *
 * 移植自旧项目 `伤寒论-demo/js/graph.js`，按本工程规范重写为 TypeScript，
 * 并落实 docs/核心模块设计.md §8.3 的基线改进：
 *   1. dispose() 生命周期（SPA 路由切换防泄漏）
 *   2. 布局保位（setData 复用同 id 节点坐标，仅新节点随机落位）
 *   3. 性能护栏（devicePixelRatio 上限 2、页面隐藏暂停、touch-action: none）
 *   4. 收敛调优（alphaDecay ≈ 0.022，约 4 秒静止；交互 reheat 保持活性）
 *   5. 主题配色（对齐 src/style.css 的朱砂/青绿/黛蓝 token 值）
 */

export interface GraphNodeTypeColor {
  formula: string
  herb: string
  text: string
}

/** 节点颜色：取自 src/style.css @theme token。 */
const TYPE_COLORS: Record<string, string> = {
  formula: '#8b0000', // --color-cinnabar
  herb: '#3e7c4f', // --color-green
  text: '#35506b', // --color-indigo
}

const LINK_COLORS: Record<string, string> = {
  compose: 'rgba(62, 124, 79, 0.38)', // green
  text: 'rgba(53, 80, 107, 0.30)', // indigo
  pair: 'rgba(201, 162, 39, 0.45)', // gold
}

const SELECT_STROKE = '#c9a227' // --color-gold

export type GraphNodeInput = {
  id: string
  label: string
  type: string
}

export type GraphLinkInput = {
  source: string
  target: string
  kind: string
}

export interface SimNode extends GraphNodeInput {
  x: number
  y: number
  vx: number
  vy: number
  degree: number
  fixed: boolean
  r: number
}

interface SimLink {
  source: SimNode
  target: SimNode
  kind: string
  len: number
}

function linkLength(kind: string): number {
  if (kind === 'text') return 100
  if (kind === 'pair') return 48
  return 62
}

export class ForceGraph {
  readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D

  nodes: SimNode[] = []
  links: SimLink[] = []
  readonly nodeById = new Map<string, SimNode>()

  /** 物理参数 */
  alpha = 1
  alphaDecay = 0.022
  private readonly repulsion = 2600
  private readonly springK = 0.012
  private readonly gravity = 0.012
  private readonly damping = 0.82
  /** 当前物理活动阈值：低于此值暂停积分计算。 */
  private static readonly ALPHA_FLOOR = 0.004

  /** 视图（世界中心点 + 缩放） */
  viewX = 0
  viewY = 0
  scale = 1

  hovered: SimNode | null = null
  selected: SimNode | null = null
  neighborSet = new Set<string>()

  onSelect: (node: SimNode | null) => void

  private onNodeSelect: (node: SimNode) => void

  /* 内部交互状态 */
  private dragNode: SimNode | null = null
  private panning = false
  private downPos: { sx: number; sy: number; viewX: number; viewY: number } | null = null
  private moved = false
  private pinching = false
  private pinchDist = 1
  private pinchStartScale = 1
  private pinchWorld = { x: 0, y: 0 }
  private pointers = new Map<number, { sx: number; sy: number }>()

  /* 生命周期 */
  private frameId: number | null = null
  private disposed = false
  /** 跨 setData 的坐标备忘（id → 最近坐标），保障布局保位。 */
  private posMemo = new Map<string, { x: number; y: number }>()

  private w = 0
  private h = 0
  private dpr = 1

  constructor(
    canvas: HTMLCanvasElement,
    opts?: {
      onSelect?: (node: SimNode | null) => void
    }
  ) {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('ForceGraph: canvas 2d context unavailable')

    this.canvas = canvas
    this.ctx = context
    this.onSelect = opts?.onSelect ?? (() => {})
    this.onNodeSelect = (node) => this.onSelect(node)

    // 移动端护栏：避免画布拖动触发页面滚动
    canvas.style.touchAction = 'none'

    this.boundResize = this.handleResize.bind(this)
    this.boundFrame = this.frame.bind(this)
    window.addEventListener('resize', this.boundResize)
    document.addEventListener('visibilitychange', this.boundVisibility)

    this.bindEvents()
    this.handleResize()
    this.scheduleFrame()
  }

  private boundResize!: () => void
  private boundFrame!: () => void
  private boundVisibility!: () => void

  /* ---------------- 数据 ---------------- */

  setData(nodes: GraphNodeInput[], links: GraphLinkInput[]): void {
    // 先把当前坐标写入备忘，供保位使用
    for (const node of this.nodes) {
      this.posMemo.set(node.id, { x: node.x, y: node.y })
    }

    const w = this.canvas.clientWidth || 800
    const h = this.canvas.clientHeight || 600

    this.nodes = nodes.map((n) => {
      const memo = this.posMemo.get(n.id)
      return {
        ...n,
        x: memo ? memo.x : (Math.random() - 0.5) * w * 0.7,
        y: memo ? memo.y : (Math.random() - 0.5) * h * 0.7,
        vx: 0,
        vy: 0,
        degree: 0,
        fixed: false,
        r: 6,
      } satisfies SimNode
    })
    this.nodeById.clear()
    for (const node of this.nodes) this.nodeById.set(node.id, node)

    this.links = []
    for (const link of links) {
      const source = this.nodeById.get(link.source)
      const target = this.nodeById.get(link.target)
      if (!source || !target || source === target) continue
      this.links.push({ source, target, kind: link.kind, len: linkLength(link.kind) })
      source.degree += 1
      target.degree += 1
    }
    for (const node of this.nodes) {
      node.r = Math.min(5 + node.degree * 1.1, 20)
    }

    this.alpha = 1
    this.selected = null
    this.hovered = null
    this.neighborSet = new Set()
    this.fitView()
  }

  reheat(): void {
    this.alpha = Math.max(this.alpha, 0.6)
  }

  /** 清空坐标备忘、重新随机布位并复热物理，用于「重新布局」。 */
  relayout(): void {
    this.posMemo.clear()
    const w = this.canvas.clientWidth || 800
    const h = this.canvas.clientHeight || 600
    for (const node of this.nodes) {
      node.x = (Math.random() - 0.5) * w * 0.7
      node.y = (Math.random() - 0.5) * h * 0.7
      node.vx = 0
      node.vy = 0
      node.fixed = false
    }
    this.selected = null
    this.hovered = null
    this.neighborSet = new Set()
    this.dragNode = null
    this.alpha = 1
    this.fitView()
  }

  selectById(id: string, center = false): SimNode | null {
    const node = this.nodeById.get(id)
    if (!node) return null
    this.selected = node
    this.computeNeighbors()
    if (center) {
      this.viewX = node.x
      this.viewY = node.y
      if (this.scale < 0.9) this.scale = 0.9
    }
    this.reheat()
    this.onNodeSelect(node)
    return node
  }

  clearSelection(): void {
    this.selected = null
    this.neighborSet = new Set()
    this.reheat()
  }

  fitView(): void {
    if (!this.nodes.length) {
      this.viewX = 0
      this.viewY = 0
      this.scale = 1
      return
    }
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const node of this.nodes) {
      minX = Math.min(minX, node.x)
      maxX = Math.max(maxX, node.x)
      minY = Math.min(minY, node.y)
      maxY = Math.max(maxY, node.y)
    }
    const midX = (minX + maxX) / 2
    const midY = (minY + maxY) / 2
    const padX = Math.max((maxX - minX) / 2 + 120, 200)
    const padY = Math.max((maxY - minY) / 2 + 120, 160)
    if (!this.w || !this.h) {
      this.viewX = midX
      this.viewY = midY
      this.scale = 1
      return
    }
    const scale = Math.min(this.w / (padX * 2), this.h / (padY * 2))
    this.viewX = midX
    this.viewY = midY
    this.scale = Math.min(1.6, Math.max(0.25, scale))
  }

  private computeNeighbors(): void {
    this.neighborSet = new Set()
    const focus = this.selected ?? this.hovered
    if (!focus) return
    this.neighborSet.add(focus.id)
    for (const link of this.links) {
      if (link.source.id === focus.id) this.neighborSet.add(link.target.id)
      if (link.target.id === focus.id) this.neighborSet.add(link.source.id)
    }
  }

  /* ---------------- 视口与尺寸 ---------------- */

  handleResize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    if (!w || !h) return
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.w = w
    this.h = h
    this.dpr = dpr
  }

  toScreen(x: number, y: number): [number, number] {
    return [(x - this.viewX) * this.scale + this.w / 2, (y - this.viewY) * this.scale + this.h / 2]
  }

  private toWorld(sx: number, sy: number): [number, number] {
    return [(sx - this.w / 2) / this.scale + this.viewX, (sy - this.h / 2) / this.scale + this.viewY]
  }

  /* ---------------- 物理 ---------------- */

  step(): void {
    if (this.disposed || this.alpha < ForceGraph.ALPHA_FLOOR) return
    const nodes = this.nodes
    const n = nodes.length
    const a = this.alpha

    // 斥力（O(n²)；节点量约数百时可行，后续可按需引入空间网格降采样）
    for (let i = 0; i < n; i++) {
      const A = nodes[i]!
      for (let j = i + 1; j < n; j++) {
        const B = nodes[j]!
        let dx = A.x - B.x
        let dy = A.y - B.y
        let d2 = dx * dx + dy * dy
        if (d2 < 0.01) {
          dx = Math.random() - 0.5
          dy = Math.random() - 0.5
          d2 = dx * dx + dy * dy + 0.01
        }
        const d = Math.sqrt(d2)
        const f = (this.repulsion * a) / d2
        const fx = (dx / d) * f
        const fy = (dy / d) * f
        A.vx += fx
        A.vy += fy
        B.vx -= fx
        B.vy -= fy
      }
    }

    // 弹簧
    for (const link of this.links) {
      const A = link.source
      const B = link.target
      const dx = B.x - A.x
      const dy = B.y - A.y
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01
      const f = (d - link.len) * this.springK * a
      const fx = (dx / d) * f
      const fy = (dy / d) * f
      A.vx += fx
      A.vy += fy
      B.vx -= fx
      B.vy -= fy
    }

    // 向心
    for (const node of nodes) {
      node.vx += -node.x * this.gravity * a
      node.vy += -node.y * this.gravity * a
    }

    // 积分
    for (const node of nodes) {
      if (node.fixed) {
        node.vx = 0
        node.vy = 0
        continue
      }
      node.vx *= this.damping
      node.vy *= this.damping
      node.x += node.vx
      node.y += node.vy
    }

    this.alpha *= 1 - this.alphaDecay
  }

  /* ---------------- 绘制 ---------------- */

  private draw(): void {
    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.w, this.h)

    const focus = this.selected ?? this.hovered
    const hasFocus = !!focus

    ctx.lineWidth = 1
    for (const link of this.links) {
      const [x1, y1] = this.toScreen(link.source.x, link.source.y)
      const [x2, y2] = this.toScreen(link.target.x, link.target.y)
      const isActive = hasFocus && (link.source.id === focus!.id || link.target.id === focus!.id)
      ctx.strokeStyle = LINK_COLORS[link.kind] ?? 'rgba(0,0,0,0.2)'
      ctx.globalAlpha = hasFocus ? (isActive ? 1 : 0.12) : 1
      ctx.lineWidth = isActive ? 1.6 : 1
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    ctx.textAlign = 'center'
    for (const node of this.nodes) {
      const [sx, sy] = this.toScreen(node.x, node.y)
      const r = node.r * Math.sqrt(this.scale)
      if (sx < -40 || sy < -40 || sx > this.w + 40 || sy > this.h + 40) continue
      const dimmed = hasFocus && !this.neighborSet.has(node.id)
      ctx.globalAlpha = dimmed ? 0.18 : 1

      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fillStyle = TYPE_COLORS[node.type] ?? '#888888'
      ctx.fill()
      if (node === this.selected) {
        ctx.lineWidth = 2.5
        ctx.strokeStyle = SELECT_STROKE
        ctx.stroke()
      } else if (node === this.hovered) {
        ctx.lineWidth = 2
        ctx.strokeStyle = 'rgba(43, 39, 32, 0.65)'
        ctx.stroke()
      }

      if (
        !dimmed &&
        (node.degree >= 5 || node === focus || node === this.selected || this.scale > 1.6)
      ) {
        ctx.font = '12px "Noto Serif SC","Songti SC","SimSun",serif'
        ctx.fillStyle = 'rgba(43, 39, 32, 0.92)'
        ctx.fillText(node.label, sx, sy + r + 14)
      }
    }
    ctx.globalAlpha = 1
  }

  private frame(): void {
    if (this.disposed) return
    this.frameId = window.requestAnimationFrame(this.boundFrame)
    if (document.hidden) return
    this.step()
    this.draw()
  }

  private scheduleFrame(): void {
    if (this.frameId !== null) return
    this.frameId = window.requestAnimationFrame(this.boundFrame)
  }

  /* ---------------- 交互 ---------------- */

  private hitTest(sx: number, sy: number): SimNode | null {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i]!
      const [x, y] = this.toScreen(node.x, node.y)
      const r = node.r * Math.sqrt(this.scale) + 4
      const dx = sx - x
      const dy = sy - y
      if (dx * dx + dy * dy <= r * r) return node
    }
    return null
  }

  private bindEvents(): void {
    const cv = this.canvas
    this.pointers = new Map()

    cv.addEventListener('pointerdown', (e: PointerEvent) => {
      const rect = cv.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      this.pointers.set(e.pointerId, { sx, sy })

      if (this.pointers.size === 1) {
        this.downPos = { sx, sy, viewX: this.viewX, viewY: this.viewY }
        this.moved = false
        const node = this.hitTest(sx, sy)
        if (node) {
          this.dragNode = node
          node.fixed = true
        } else {
          this.panning = true
        }
      } else if (this.pointers.size === 2) {
        this.dragNode = null
        this.panning = false
        this.initPinch()
      }
      cv.classList.add('dragging')
      try {
        cv.setPointerCapture(e.pointerId)
      } catch {
        /* 某些环境不支持指针捕获 */
      }
    })

    cv.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.pointers.has(e.pointerId)) return
      const rect = cv.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      this.pointers.set(e.pointerId, { sx, sy })

      if (this.pointers.size >= 2 && this.pinching) {
        this.handlePinch()
      } else if (this.dragNode) {
        const [wx, wy] = this.toWorld(sx, sy)
        this.dragNode.x = wx
        this.dragNode.y = wy
        this.moved = true
        this.reheatTo(0.08)
      } else if (this.panning && this.downPos) {
        const dx = (sx - this.downPos.sx) / this.scale
        const dy = (sy - this.downPos.sy) / this.scale
        if (Math.abs(sx - this.downPos.sx) + Math.abs(sy - this.downPos.sy) > 4) this.moved = true
        this.viewX = this.downPos.viewX - dx
        this.viewY = this.downPos.viewY - dy
      } else {
        const node = this.hitTest(sx, sy)
        if ((node?.id ?? null) !== (this.hovered?.id ?? null)) {
          this.hovered = node
          this.computeNeighbors()
        }
      }
    })

    const endPointer = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId)

      if (this.pointers.size < 2) this.pinching = false

      if (this.pointers.size === 1 && !this.pinching) {
        // 双指切换到单指：转为平移，且视为已移动以防误触选中
        const [pt] = [...this.pointers.values()]
        this.downPos = { sx: pt.sx, sy: pt.sy, viewX: this.viewX, viewY: this.viewY }
        this.panning = true
        this.dragNode = null
        this.moved = true
      }

      if (this.pointers.size === 0) {
        cv.classList.remove('dragging')
        if (this.dragNode) {
          const node = this.dragNode
          node.fixed = false
          this.dragNode = null
          if (!this.moved) this.commitSelection(node)
        } else if (this.panning && !this.moved) {
          this.commitSelection(null)
        }
        this.panning = false
        this.downPos = null
      }

      try {
        cv.releasePointerCapture(e.pointerId)
      } catch {
        /* 同上 */
      }
    }
    cv.addEventListener('pointerup', endPointer)
    cv.addEventListener('pointercancel', (e: PointerEvent) => {
      this.pointers.delete(e.pointerId)
      this.pinching = false
      if (this.dragNode) {
        this.dragNode.fixed = false
        this.dragNode = null
      }
      this.panning = false
      this.downPos = null
      cv.classList.remove('dragging')
    })

    cv.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault()
        const rect = cv.getBoundingClientRect()
        const sx = e.clientX - rect.left
        const sy = e.clientY - rect.top
        const [wx, wy] = this.toWorld(sx, sy)
        const factor = Math.exp(-e.deltaY * 0.0012)
        this.scale = Math.min(3.2, Math.max(0.2, this.scale * factor))
        const [nx, ny] = this.toWorld(sx, sy)
        this.viewX += wx - nx
        this.viewY += wy - ny
      },
      { passive: false }
    )

    cv.addEventListener('dblclick', () => this.fitView())
  }

  private commitSelection(node: SimNode | null): void {
    this.selected = node
    this.computeNeighbors()
    this.reheat()
    this.onSelect(node)
  }

  private reheatTo(level: number): void {
    this.alpha = Math.max(this.alpha, level)
  }

  /* ---- 双指缩放 ---- */

  private initPinch(): void {
    const pts = [...this.pointers.values()]
    if (pts.length < 2) return
    this.pinchDist = Math.hypot(pts[0]!.sx - pts[1]!.sx, pts[0]!.sy - pts[1]!.sy)
    this.pinchStartScale = this.scale
    const mid = { x: (pts[0]!.sx + pts[1]!.sx) / 2, y: (pts[0]!.sy + pts[1]!.sy) / 2 }
    const [wx, wy] = this.toWorld(mid.x, mid.y)
    this.pinchWorld = { x: wx, y: wy }
    this.pinching = true
  }

  private handlePinch(): void {
    const pts = [...this.pointers.values()]
    if (pts.length < 2) return
    const dist = Math.hypot(pts[0]!.sx - pts[1]!.sx, pts[0]!.sy - pts[1]!.sy)
    const mid = { x: (pts[0]!.sx + pts[1]!.sx) / 2, y: (pts[0]!.sy + pts[1]!.sy) / 2 }
    const factor = dist / (this.pinchDist || 1)
    this.scale = Math.min(3.2, Math.max(0.2, this.pinchStartScale * factor))
    this.viewX = this.pinchWorld.x - (mid.x - this.w / 2) / this.scale
    this.viewY = this.pinchWorld.y - (mid.y - this.h / 2) / this.scale
  }

  /* ---------------- 生命周期 ---------------- */

  dispose(): void {
    this.disposed = true
    if (this.frameId !== null) {
      window.cancelAnimationFrame(this.frameId)
      this.frameId = null
    }
    window.removeEventListener('resize', this.boundResize)
    document.removeEventListener('visibilitychange', this.boundVisibility)
    this.nodes = []
    this.links = []
    this.nodeById.clear()
    this.posMemo.clear()
    this.neighborSet = new Set()
    this.selected = null
    this.hovered = null
  }
}
