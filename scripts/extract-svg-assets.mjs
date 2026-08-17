// 自动生成：从 design/preview 原型中提取定制 SVG（印章/葫芦/折扇纹）
// 用法：node scripts/extract-svg-assets.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (p) => readFileSync(join(root, p), 'utf8')
const write = (p, content) => {
  const full = join(root, p)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content, 'utf8')
}

/** 按 data-pencil-name 提取最外层 div 块，返回内部 HTML */
function extractBlock(html, dataName) {
  const marker = `data-pencil-name="${dataName}"`
  const start = html.indexOf(marker)
  if (start < 0) {
    throw new Error(`未找到 ${dataName}`)
  }
  const divStart = html.lastIndexOf('<div', start)
  if (divStart < 0) {
    throw new Error(`未找到 ${dataName} 的 div 起点`)
  }
  let depth = 0
  let i = divStart
  for (; i < html.length; i++) {
    if (html.startsWith('<div', i)) depth++
    if (html.startsWith('</div>', i)) {
      depth--
      if (depth === 0) break
      i += 5
    }
  }
  if (depth !== 0) throw new Error(`${dataName} div 未闭合`)
  const block = html.slice(divStart, i + 6)
  const innerOpen = block.indexOf('>')
  const innerClose = block.lastIndexOf('</div>')
  return block.slice(innerOpen + 1, innerClose)
}

/** 将原型里的 <svg style="..."> 转成带 x/y/width/height 属性的嵌套 svg */
function convertSvg(svgHtml) {
  const openTagEnd = svgHtml.indexOf('>')
  const openTag = svgHtml.slice(0, openTagEnd + 1)
  const inner = svgHtml.slice(openTagEnd + 1, svgHtml.lastIndexOf('</svg>'))

  const attrs = {}
  const attrRe = /([a-zA-Z-]+)="([^"]*)"/g
  let m
  while ((m = attrRe.exec(openTag)) !== null) {
    if (m[1] !== 'style') attrs[m[1]] = m[2]
  }

  const styleMatch = /style="([^"]*)"/.exec(openTag)
  if (styleMatch) {
    const style = styleMatch[1]
    const get = (key) => {
      const re = new RegExp(`${key}:\\s*([^;]+)`)
      const hit = re.exec(style)
      return hit ? hit[1].trim() : undefined
    }
    const left = get('left')
    const top = get('top')
    const width = get('width')
    const height = get('height')
    if (left) attrs.x = left.replace('px', '')
    if (top) attrs.y = top.replace('px', '')
    if (width) attrs.width = width.replace('px', '')
    if (height) attrs.height = height.replace('px', '')
  }

  const attrText = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')
  return `<svg ${attrText}>${inner}</svg>`
}

/** 从一块内部 HTML 中提取所有顶层 <svg>...</svg> */
function findSvgBlocks(innerHtml) {
  const blocks = []
  const re = /<svg[\s\S]*?<\/svg>/g
  let m
  while ((m = re.exec(innerHtml)) !== null) {
    blocks.push(m[0])
  }
  return blocks
}

function buildSeal() {
  const inner = extractBlock(s1Html, '印章 · 灵')
  const svgs = findSvgBlocks(inner)
  const body = svgs.map(convertSvg).join('\n  ')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34">\n  ${body}\n</svg>\n`
}

function buildGourd() {
  const inner = extractBlock(s1Html, '葫芦')
  const svgs = findSvgBlocks(inner)
  const body = svgs.map(convertSvg).join('\n  ')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 15">\n  ${body}\n</svg>\n`
}

function buildFanDivider() {
  const inner = extractBlock(s4Html, '折扇纹分隔线')
  const svgs = findSvgBlocks(inner)
  // 原型里还有一个背景色矩形 div，这里用等价 rect 保留视觉
  const rectMatch = /background-color:\s*(#[0-9a-fA-F]{3,6})/.exec(inner)
  const rect = rectMatch
    ? `<rect x="160" y="0" width="40" height="12" rx="2" fill="${rectMatch[1]}" />`
    : ''
  const body = svgs.map(convertSvg).join('\n  ')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 12">\n  ${rect}\n  ${body}\n</svg>\n`
}

const s1Html = read('design/preview/s1-dash.html')
const s4Html = read('design/preview/s4-lit.html')

write('src/assets/svg/seal.svg', buildSeal())
write('src/assets/svg/gourd.svg', buildGourd())
write('src/assets/svg/fan-divider.svg', buildFanDivider())

console.log('已生成 src/assets/svg/{seal,gourd,fan-divider}.svg')