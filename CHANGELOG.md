# Changelog

本文件记录《灵素》每个版本的重要变更。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循语义化版本。

## [Unreleased]

### Added

- **学习计划管理**（T1-3）：我的页新增学习计划管理——列出全部计划（进行中/已暂停/已完成标签）、暂停/激活切换、删除、新增计划（选择篇章 + 每日新学 3/5/10）；强制最多 2 个 active 计划（`createStudyPlan` 超限返回 null、`togglePlanStatus` 激活前检查上限，常量 `MAX_ACTIVE_PLANS`）；新增 `src/store/studyPlans.spec.ts` 真库测试 13 例 + `tests/profile-study-plans.spec.ts` UI 组件测试 5 例，测试 149 → 177（2026-08-24）

- **安全头配置**（TD-7）：`index.html` 注入 CSP（Content-Security-Policy）与 Referrer-Policy meta 标签，限制脚本/样式/字体/图片/连接来源均为同源；GitHub Pages 自带 HSTS/X-Frame-Options/X-Content-Type-Options；159 测试 + lint/typecheck/validate:content/build 全绿（2026-08-23）

- **测试覆盖率门禁**（TD-4）：安装 `@vitest/coverage-v8@3.2.7`；`vite.config.ts` 配置 domain ≥90% / store ≥80% 阈值；新增 `npm run test:coverage` 脚本；CI workflow 接入覆盖率步骤；纯 Dexie 代理层（cards/favorites/studyPlans/settings）排除（由 store-db 集成测试保证覆盖）；28 文件 159 测试全绿，覆盖率门禁通过（2026-08-23）

- **E2E 冒烟测试**（TD-5）：安装 `@playwright/test`；新增 `playwright.config.ts` + `e2e/smoke.spec.ts` 三条关键链路——协议→首页→背诵 / 搜索→条文详情 / 刷题→错题本；新增 `npm run test:e2e` 脚本；CI workflow 接入 `playwright install --with-deps` + `test:e2e`；本机跑通 3 passed（2026-08-23）

- **完成伤寒论全篇内容录入**（T1-1）：新增 7 篇 220 条条文（阳明病 84 条、少阳病 10 条、太阴病 8 条、少阴病 45 条、厥阴病 56 条、霍乱病 10 条、阴阳易差后劳复 7 条），总计 398 条覆盖完整原文；新增方剂、药物、症状术语并启用全部 10 篇；新增 `docs/方剂目录.md`（`npm run build:formulas-doc` 自动生成），便于集中查看与维护全部方剂（2026-01-22）

- 内容按篇懒加载（T1-6/TD-2/E-9）：构建产物拆为 `meta.json`（79KB，随主包）+ `chapters/<code>.json`（按篇异步 chunk，加载器带缓存）；新增 `loadMeta`/`loadChapter`/`loadAllChapters`/`chapterCodeOfClause` API；条文详情页只加载所属篇、方剂/药物/我的页只用元数据；搜索/刷题/每日任务等跨篇页面按全量加载但共享缓存；测试 142 → 149 用例（2026-08-22）

- 刷题筛选模式（T0-2）：进入刷题页先选模式——随机综合（整卷洗牌）、按篇（太阳病上/中/下）、按题型（四种）、待巩固错题，与错题重做并列；支持 `?mode=random` / `?chapter=` / `?type=` 深链直达；新增 domain 纯函数 `filterQuizDeck` / `shuffleDeck`，共 21 条新测试（2026-08-21）

- GitHub Pages 部署：`BASE_PATH` 环境变量支持子路径构建，PWA manifest/scope/start_url 随 base 调整，新增 `.github/workflows/deploy-pages.yml` 自动部署；woff2 字体改为按需运行时缓存，precache 从 222 项（11MB）降到 17 项（0.9MB）（2026-08-20）

- 错题轻 Leitner 排期：答错次日到期、答对 3 天后复测、连续答对 2 次已掌握；到期错题并入每日任务（每轮最多 10 道、计入打卡），错题重做只取今日到期（2026-08-19）
- 错题本改为「待巩固」台账：正面汇总（今日到期/之后到期/已掌握）、分组折叠、去掉红色“答错 N 次”，手动“已掌握”移出（2026-08-19）
- 意见反馈：站内表单 `/feedback`（类型/位置/描述/联系方式）→ mailto 发送至 l2752255876@gmail.com；入口为全局提示条、条文/搜索横幅、我的页，以及条文详情/学习卡片顶栏（自动预填当前条文位置）（2026-08-19）
- 全局底部合规提示条：`GlobalNoticeBar` 低调纸色常驻（协议页除外），条文详情/搜索页保留自带横幅并让位避免叠加（2026-08-19）
- 古籍书卷气视觉：宣纸纤维纹理背景、暖色令牌、朱丝栏 `.zhusi-rule`、页眉朱砂印章、打卡盖章动画 `.seal-stamp`（2026-08-19）
- 测试补齐：错题排期纯函数与迁移、每日任务错题卡、待巩固台账、streak 边界、统计页/方剂页 UI、反馈表单与纠错入口、题库选项顺序，共 121 用例（2026-08-19）
- 错题本闭环：人工复核题优先（`buildQuizDeck`）、错题自动收录、`/quiz?wrong=1` 错题重做、`/wrong-book` 待巩固台账（2026-08-19）
- 护眼纸墨色系调整：宣纸暖米黄背景与暖褐墨色，同步设计规范与 PRD（2026-08-19）

### Changed

- 主 chunk 体积优化：内容按篇拆分后，条文正文不再打进主包（含重复存储消除），主 chunk 从 500kB+（有警告）降到 453kB（警告消除）；precache 从 17 项（0.9MB）变为 20 项（826KB）（2026-08-22）
- 提示策略瘦身：首次协议页一次性提示补充“条文可能存在错误，可点击底部『内容纠错』反馈”（2026-08-19）
- 产品方决定专业人工校对后置：内容以 AI 初稿上线，以用户反馈为持续纠错机制；同步更新 PRD、项目计划、MVP 验收清单、维护与迭代计划、内容录入与校对流程、用户协议与免责声明（2026-08-19）

### Removed

- 移除未使用的 `echarts` 依赖（TD-1）：`npm ls echarts` 为空；统计页图表为自绘实现；若后续做方药图谱（E-7/T3-2）再按需引入（2026-08-21）

### Fixed

- 太阳病下篇条文顺序错乱（148–178、128–147 交错排列）：内容构建按文件名拼接时 `taiyang-xia-2` 排在 `taiyang-xia` 前，导致条文列表与「上一条/下一条」导航错乱；改为章内统一按条文号排序（2026-08-22）
- 选择题正确选项全为 A：题库组装时对每题 Fisher–Yates 洗牌并重算 `answerIndex`，每次进入刷题页随机（2026-08-19）

## [0.1.0] - 待发布

MVP 内测版（发布时补充完整说明）。
