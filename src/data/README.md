# src/data

内容数据加载、解析与校验。

- `types.ts`：运行时类型（camelCase，与 `content/` YAML snake_case 对应）
- `loader.ts` / `index.ts`：加载构建产物——`meta.json` 同步返回；`chapters/*.json` 按篇懒加载（带缓存）
- `generated/`：由 `npm run build:content` 生成的拆分产物（`meta.json` + `chapters/<code>.json`）
