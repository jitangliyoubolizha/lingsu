# design

视觉设计相关文件放这里：风格参考、配色、字体、图标、组件规范、页面设计稿、切图等。

## 目录内容

| 文件 | 说明 |
|---|---|
| `设计规范.md` | **视觉设计规范（设计系统）**：风格定位、设计令牌（色彩/字体/圆角/阴影/间距）、图标规范、组件规范、全部页面规范（对应 PRD §8）、合规视觉红线、实现约定 |
| `关键页面设计补充.md` | 未出稿页面的线框与设计规则补充（首次进入、列表、搜索、统计、我的、方证对比等） |
| `UI提示词.md` | 搜索页、统计页、方证对比页、协议页、列表页、我的页的 AI UI 设计提示词 |
| `视觉资源准备方案.md` | PWA 图标、定制 SVG、字体自托管的准备方案 |
| `交互状态与动效规范.md` | 组件状态、空/加载/错误状态、弹层与动效规则 |
| `响应式与桌面适配规范.md` | 手机/平板/桌面断点、导航与布局适配规则 |
| `无障碍规范.md` | 对比度、触控、键盘、屏幕阅读器、字号缩放与减少动效规范 |
| `灵素-UI原型.pen` | Pencil 画布源文件（设计规范板 + 组件 + **13 屏原型**），改稿用 Pencil 打开 |
| `preview/` | 原型 HTML 预览：`lingsu-prototype.html`（纯 CSS 13 屏合集）、`lingsu-prototype-tailwind.html`（Tailwind 版，含图层标注，AI 实现时首选）、`s1-dash.html` ~ `s13-profile.html`（单屏） |

## 使用规则

1. 视觉规范以 `设计规范.md` 为准，已同步至 `docs/PRD.md` 第 11 节。
2. 新增/修改视觉稿：用 Pencil 编辑 `灵素-UI原型.pen`，改后重新导出 HTML 放入 `preview/`，并同步更新 `设计规范.md` 与 PRD §11。
3. 原型 13 屏 = 首页 / 背诵卡正面 / 背诵卡背面 / 条文详情 / 方剂详情 / 测验答题 / 错题反馈 / 搜索 / 统计 / 方证对比 / 协议页 / 条文列表 / 我的；待出稿：方剂列表页、药物详情页。

## 已提取/自托管资源

| 资源 | 位置 | 说明 |
|---|---|---|
| 印章「灵」 | `src/assets/svg/seal.svg` | 从 `preview/s1-dash.html` 提取，保持原 path 不变；用于 PWA 品牌与桌面导航 |
| 葫芦 | `src/assets/svg/gourd.svg` | 从 `preview/s1-dash.html` 提取，保持原 path 不变 |
| 折扇纹 | `src/assets/svg/fan-divider.svg` | 从 `preview/s4-lit.html` 提取，保持原 path 不变 |
| PWA 图标 | `public/icons/` | `icon-192.png` / `icon-512.png` / `maskable-512.png` / `favicon.ico` / `apple-touch-icon.png` |
| 字体 | `public/fonts/noto-sans-sc/`、`public/fonts/noto-serif-sc/` | Fontsource 自托管 Noto Sans SC / Noto Serif SC 变量字体 woff2 |

> 如需重新提取 SVG：`node scripts/extract-svg-assets.mjs`。
> 如需重新拉取字体：`powershell -ExecutionPolicy Bypass -File scripts/vendor-fonts.ps1`。
