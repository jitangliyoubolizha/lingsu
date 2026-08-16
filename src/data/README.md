# src/data

内容数据加载、解析与校验。

- `types.ts`：运行时类型（camelCase，与 `content/` YAML snake_case 对应）
- `loader.ts` / `index.ts`：加载构建产物 `generated/content.json`
- `generated/`：由 `npm run build:content` 生成的 JSON 构建产物
