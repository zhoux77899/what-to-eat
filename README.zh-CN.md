<p align="center">
  <img src="what-to-eat/public/brand/logo-zh.webp" alt="今天吃什么 Logo" width="560">
</p>

<p align="center">
  <a href="README.md">English</a> | <strong>中文</strong>
</p>

# 今天吃什么

`what-to-eat` 是一个可部署到 Vercel 的 Next.js 应用，用冰箱里的现有食材推荐菜品。

MVP 是 OpenAI-only BYOK 产品：每个用户提供自己的 OpenAI developer API key。服务端会加密保存密钥，使用固定文本模型 `gpt-5.5` 生成结构化候选菜，使用固定图片模型 `gpt-image-2` 尝试生成食材和菜品图片，把成功图片上传到公开 Vercel Blob 存储，并保存轻量推荐历史。

## 如何使用

1. 使用 Google 或 GitHub 登录。
2. 在 OpenAI 密钥页面保存你自己的 OpenAI developer API key。应用只保存加密后的密钥，并只显示安全提示。
3. 向冰箱添加食材，食材由自然语言名称、正数数量和自由文本单位组成，例如 `2 tomatoes` 或 `1 bunch of water spinach`。
4. 用自然语言保存长期饮食偏好，例如忌口、口味、烹饪风格或工作日时间限制。
5. 在推荐页面生成一到五道候选菜。你可以为本次请求添加一个临时要求，它只影响本次生成。
6. 查看生成的菜品、做法、预计耗时、菜品图片和可编辑的冰箱消耗建议。
7. 选择一道菜并确认编辑后的消耗建议。应用会原子性扣减冰箱库存，并删除数量耗尽的食材。
8. 打开推荐历史，查看已保存的菜品文字和图片状态。
9. 当图片生成失败但文字推荐仍可用时，可以重试食材或菜品图片。
10. 不再需要时，可以删除整条推荐历史或单个历史菜品。

## 产品边界

版本一包含：

- Clerk authentication，并支持 Google 和 GitHub 登录。
- `/zh` 和 `/en` 两套路由，支持中文和英文界面。
- 冰箱 CRUD，食材使用自然语言名称、正数数量和自由文本单位。
- 当标准化后的食材名称和单位都相同时，自动合并数量。
- 长期自然语言饮食偏好，以及每次推荐请求中的一个可选临时要求。
- 每次生成一到五道结构化候选菜。
- 可编辑的消耗建议，并支持按选中菜品原子性扣减冰箱库存。
- 食材和菜品图片以公开 Vercel Blob 引用的形式存储。
- 轻量推荐历史，只包含推荐头信息、菜品行和图片引用。
- Local Codex Mode，用于本地开发中的结构化文本验证和本地图片尝试。

版本一不会持久化临时要求、消耗建议、冰箱快照或偏好快照。版本一也不支持平台自有 OpenAI 密钥、部署环境中的消费订阅额度、任意供应商、任意模型 id、流式输出、团队、账单或共享密钥。

## 当前状态

| 区域 | 状态 | 说明 |
| --- | --- | --- |
| 多语言 UI | 已实现 | 中文和英文页面、表单、空状态和业务错误都使用翻译资源。 |
| 认证外壳 | 已实现 | Clerk OAuth 入口、回调、受保护路由和本地配置兜底已接入。 |
| 冰箱库存 | 已实现 | CRUD、标准化合并、图片状态、重试动作和原子性消耗确认已接入 Postgres 服务。 |
| OpenAI 密钥管理 | 已实现 | AES-256-GCM 持久化、提示、删除、替换和上游验证已接入。 |
| 推荐生成 | 已实现 | 结构化非流式文本生成、候选校验、历史持久化、图片尝试和临时消耗建议已接入。 |
| 推荐历史 | 已实现 | 历史会列出已保存菜品和图片状态；失败图片可重试，可删除单个菜品或整条记录。 |
| Local Codex Mode | 本地开发已实现 | 结构化文本使用本地 SDK。图片尝试使用受约束的 `codex exec` 桥接，并在本地图片能力不可用时安全失败。 |
| 数据库迁移 | 已在本地生成 | 初始 Drizzle migration 已提交到 `what-to-eat/drizzle/`；配置 Neon development-branch `DATABASE_URL` 后再应用。 |
| 源码级测试 | 已实现 | 单元测试覆盖 schema、领域校验、数据层保护、生成模式开关、多语言 UI 结构、品牌资源和路由源码约束。 |
| 已登录浏览器 E2E | 待补充 | 当前 Playwright 只覆盖公开多语言页面和认证门禁。已登录业务流还需要真实 Clerk-backed E2E 覆盖。 |

## 技术栈

- Next.js App Router 和 TypeScript
- Clerk authentication
- Neon Postgres with Drizzle
- OpenAI JavaScript SDK
- Vercel Blob
- next-intl
- Tailwind CSS
- Vitest 和 Playwright
- `@openai/codex-sdk` 用于本地结构化文本验证
- `@openai/codex` CLI 用于本地图片文件输出尝试

## 品牌资源

品牌资源位于 `what-to-eat/public/brand/`。

- `logo-en.webp` 和 `logo-zh.webp` 是 README 使用的完整 Logo。
- `header-logo-en.webp` 和 `header-logo-zh.webp` 是应用外壳使用的透明 Logo。
- `app-icon-1024.png`、`app-icon-512.png` 和 `app-icon-192.png` 是派生应用图标。
- `source-logo-board.png` 是用于可重复生成资源的批准源设计板。

修改源设计板后，重新生成派生资源：

```bash
cd what-to-eat
node scripts/generate-brand-assets.mjs
```

## 本地开发

Next.js 应用位于嵌套目录 `what-to-eat/`。

```bash
cd what-to-eat
corepack pnpm install
cp .env.example .env
corepack pnpm dev
```

打开 `http://127.0.0.1:3000/zh` 或 `http://127.0.0.1:3000/en`。

配置：

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
DATABASE_URL
MASTER_ENCRYPTION_KEY
BLOB_READ_WRITE_TOKEN
```

`MASTER_ENCRYPTION_KEY` 必须是 base64 编码的 32 字节值。可以在 PowerShell 中生成：

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

如需可选的本地结构化文本验证，添加：

```text
LOCAL_CODEX_ENABLED=true
```

不要在 Vercel Preview 或 Production 中配置 `LOCAL_CODEX_ENABLED`。Local Codex Mode 是本地开发便利功能，不是部署后的供应商，也不是 OpenAI API key 的替代品。

当 Local Codex Mode 尝试生成食材或菜品图片时，应用会在本地以禁用插件和低 reasoning effort 的方式运行 `codex exec`。Codex 触发本地图像生成后，会写入 `$CODEX_HOME/generated_images/<threadId>/`；应用解析 CLI thread id，把生成的 PNG 复制到 `.tmp/local-codex-images/`，移除 `#ff00ff` chroma-key 背景，成功后上传到 Vercel Blob，并在本地图片能力不可用时记录安全的图片失败状态。

## Vercel 部署说明

支持图片的 API routes 使用 Node.js runtime，并设置 `maxDuration = 300`。存储图片生命周期会在 `270_000` ms 后中止图片生成，在 Vercel function 窗口关闭前留下约 30 秒用于清理。

该部署配置假设已启用 Vercel Fluid Compute。Fluid Compute 对新的 Vercel 项目默认启用，并在 Hobby、Pro 和 Enterprise 计划上支持 300 秒 Node.js function duration。如果关闭 Fluid Compute，Hobby 项目最多只支持 60 秒，需要重新启用 Fluid Compute，或在部署前降低图片超时时间和 route `maxDuration`。

## 数据库迁移

当前分支包含初始迁移：`what-to-eat/drizzle/0000_smart_madame_masque.sql`。

将 `DATABASE_URL` 指向隔离的 Neon development branch，然后应用已提交的迁移：

```bash
cd what-to-eat
corepack pnpm db:migrate
```

只有在修改 `src/db/schema.ts` 后才运行 `corepack pnpm db:generate`，并在应用到共享数据库前审查生成的 SQL。

## API Routes

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/openai-key` | `GET`, `POST`, `DELETE` | Read hint and status, encrypt and store a key, or delete it. |
| `/api/openai-key/validate` | `POST` | Validate the current user's key with OpenAI. |
| `/api/preferences` | `GET`, `PUT` | Read and save long-term natural-language preference text. |
| `/api/fridge-items` | `GET`, `POST` | List or add fridge inventory. |
| `/api/fridge-items/:itemId` | `PATCH`, `DELETE` | Edit or delete a fridge item. |
| `/api/fridge-items/:itemId/retry-image` | `POST` | Retry one ingredient image. |
| `/api/fridge-items/apply-consumption` | `POST` | Atomically confirm one dish's edited fridge decrements. |
| `/api/recommend` | `POST` | Generate one to five dishes and return ephemeral consumption suggestions. |
| `/api/recommendations` | `GET` | List lightweight dish history. |
| `/api/recommendations/:recommendationId` | `DELETE` | Delete one recommendation history record and its current dish images. |
| `/api/recommendations/dishes/:dishId` | `DELETE` | Delete one historical dish and its current dish image. |
| `/api/recommendations/:dishId/retry-image` | `POST` | Retry one historical dish image. |

## 验证

本地检查：

```bash
cd what-to-eat
corepack pnpm test
corepack pnpm lint
corepack pnpm build
corepack pnpm test:e2e
```

发布检查还需要真实的 Neon development branch、Clerk application、OpenAI developer key 和 Vercel Blob token，以便端到端验证数据库迁移和已登录业务流程。

## Agent Notes

Coding agents should read [AGENTS.md](AGENTS.md) before editing this repository.

## License

This project is licensed under the MIT License.
