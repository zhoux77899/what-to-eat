# what-to-eat

`what-to-eat` is a Vercel-ready Next.js application that recommends dishes from a user's refrigerator inventory.

The deployed MVP is OpenAI-only BYOK: each user supplies an OpenAI developer API key. The server encrypts keys, generates structured dish candidates with fixed model `gpt-5.5`, attempts ingredient and dish images with fixed model `gpt-image-2`, uploads successful images to public Vercel Blob storage, and stores lightweight recommendation history.

## Product Boundary

Version one includes:

- Clerk authentication with Google and GitHub sign-in.
- Chinese and English locale routes under `/zh` and `/en`.
- Refrigerator CRUD with natural-language ingredient names, positive numeric quantities, and free-text units.
- Automatic quantity merging for matching normalized ingredient names and units.
- Long-term natural-language food preferences and one optional per-request temporary requirement.
- One to five structured dish candidates per generation.
- Editable consumption suggestions with atomic per-dish fridge decrements.
- Ingredient and dish images stored as public Vercel Blob references.
- Lightweight history containing recommendation headers, dish rows, and image references only.
- Local Codex Mode for opt-in local structured-text validation through `@openai/codex-sdk`.

Version one does not persist temporary requirements, consumption suggestions, fridge snapshots, or preference snapshots. It also does not support platform-owned OpenAI keys, consumer-subscription quota in deployed environments, arbitrary providers, custom model ids, streaming output, teams, or billing.

## Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Locale-aware UI | Implemented | Chinese and English pages, forms, empty states, and business errors use translation resources. |
| Authentication shell | Implemented | Clerk OAuth entry points, callback handling, protected routes, and local configuration fallback are present. |
| Refrigerator inventory | Implemented | CRUD, normalized merge behavior, image state, retry action, and atomic consumption confirmation are wired to Postgres services. |
| OpenAI key management | Implemented | AES-256-GCM persistence, hints, delete, replace, and upstream validation are wired. |
| Recommendation generation | Implemented | Structured non-streaming text generation, candidate validation, history persistence, image attempts, and ephemeral consumption suggestions are wired. |
| Recommendation history | Implemented | History lists saved dishes and image status; failed dish images can be retried. |
| Local Codex Mode | Partially implemented | Structured text uses the local SDK. Image attempts fail safely because the SDK does not expose generated image bytes. |
| Database migration | Generated locally | Review and apply the initial Drizzle migration after configuring a Neon development-branch `DATABASE_URL`. |
| Authenticated browser E2E | Pending | The local verification suite covers unit, lint, build, and anonymous smoke behavior. |

## Stack

- Next.js App Router and TypeScript
- Clerk authentication
- Neon Postgres with Drizzle
- OpenAI JavaScript SDK
- Vercel Blob
- next-intl
- Tailwind CSS
- Vitest and Playwright
- `@openai/codex-sdk` for local-only structured text validation

## Local Development

The Next.js application lives in the nested `what-to-eat/` directory.

```bash
cd what-to-eat
corepack pnpm install
cp .env.example .env
corepack pnpm dev
```

Open `http://127.0.0.1:3000/zh` or `http://127.0.0.1:3000/en`.

Configure:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
DATABASE_URL
MASTER_ENCRYPTION_KEY
BLOB_READ_WRITE_TOKEN
```

`MASTER_ENCRYPTION_KEY` must be a base64-encoded 32-byte value. Generate one in PowerShell:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

For optional local structured-text validation, add:

```text
LOCAL_CODEX_ENABLED=true
```

Do not configure `LOCAL_CODEX_ENABLED` in Vercel Preview or Production. Local Codex Mode is a development convenience, not a deployed provider or a replacement for OpenAI API keys.

## Database Migrations

Point `DATABASE_URL` at an isolated Neon development branch, then run:

```bash
cd what-to-eat
corepack pnpm db:generate
corepack pnpm db:migrate
```

Review generated SQL before applying it to a shared database.

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
| `/api/recommendations/:dishId/retry-image` | `POST` | Retry one historical dish image. |

## Verification

```bash
cd what-to-eat
corepack pnpm test
corepack pnpm lint
corepack pnpm build
corepack pnpm test:e2e
```

## License

This project is licensed under the MIT License.
