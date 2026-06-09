# what-to-eat

`what-to-eat` is a Vercel-ready Next.js application that recommends dishes from a user's refrigerator inventory.

The MVP is OpenAI-only BYOK: each user supplies an OpenAI developer API key. The server encrypts keys, generates structured dish candidates with fixed model `gpt-5.5`, attempts ingredient and dish images with fixed model `gpt-image-2`, uploads successful images to public Vercel Blob storage, and stores lightweight recommendation history.

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
- Local Codex Mode for opt-in local structured-text validation through `@openai/codex-sdk` and image attempts through the local `@openai/codex` CLI.

Version one does not persist temporary requirements, consumption suggestions, fridge snapshots, or preference snapshots. It also does not support platform-owned OpenAI keys, consumer-subscription quota in deployed environments, arbitrary providers, custom model ids, streaming output, teams, or billing.

## Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Locale-aware UI | Implemented | Chinese and English pages, forms, empty states, and business errors use translation resources. |
| Authentication shell | Implemented | Clerk OAuth entry points, callback handling, protected routes, and local configuration fallback are present. |
| Refrigerator inventory | Implemented | CRUD, normalized merge behavior, image state, retry action, and atomic consumption confirmation are wired to Postgres services. |
| OpenAI key management | Implemented | AES-256-GCM persistence, hints, delete, replace, and upstream validation are wired. |
| Recommendation generation | Implemented | Structured non-streaming text generation, candidate validation, history persistence, image attempts, and ephemeral consumption suggestions are wired. |
| Recommendation history | Implemented | History lists saved dishes and image status; failed dish images can be retried, individual dishes can be deleted with their current images, and whole records can be deleted. |
| Local Codex Mode | Implemented for local development | Structured text uses the local SDK. Image attempts use a constrained `codex exec` bridge that triggers local imagegen, copies the generated PNG into the app temp directory, and fails safely when local image capability is unavailable. |
| Database migration | Generated locally | The initial Drizzle migration is committed under `what-to-eat/drizzle/`; apply it after configuring a Neon development-branch `DATABASE_URL`. |
| Source-level tests | Implemented | Unit tests cover schema shape, domain validation, source-level data-layer guards, generation mode gating, localized UI structure, and route source constraints. |
| Authenticated browser E2E | Pending | Current Playwright coverage exercises public locale pages and authentication gates only. Signed-in business workflows still need real Clerk-backed E2E coverage. |

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
- `@openai/codex` CLI for local-only image file-output attempts

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

When Local Codex Mode attempts ingredient or dish images, the app runs `codex exec` locally with plugins disabled and low reasoning effort for the background image task. Codex triggers local imagegen, which writes under `$CODEX_HOME/generated_images/<threadId>/`; the app parses the CLI thread id, copies the generated PNG into `.tmp/local-codex-images/`, removes the `#ff00ff` chroma-key background, uploads successful images to Vercel Blob, and records safe image failure states when local image capability is unavailable.

## Vercel Deployment Notes

Image-capable API routes use the Node.js runtime with `maxDuration = 300`. The stored-image lifecycle aborts image generation after `270_000` ms, leaving roughly 30 seconds for cleanup before the Vercel function window closes.

This deployment profile assumes Vercel Fluid Compute is enabled. Fluid Compute is enabled by default for new Vercel projects and supports a 300-second Node.js function duration on Hobby, Pro, and Enterprise plans. If Fluid Compute is disabled, Hobby projects only support up to 60 seconds and must either re-enable Fluid Compute or reduce the image timeout and route `maxDuration` before deployment.

## Database Migrations

This branch includes the initial migration at `what-to-eat/drizzle/0000_smart_madame_masque.sql`.

Point `DATABASE_URL` at an isolated Neon development branch, then apply the committed migration:

```bash
cd what-to-eat
corepack pnpm db:migrate
```

Run `corepack pnpm db:generate` only after changing `src/db/schema.ts`, then review the generated SQL before applying it to a shared database.

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

## Verification

Local checks:

```bash
cd what-to-eat
corepack pnpm test
corepack pnpm lint
corepack pnpm build
corepack pnpm test:e2e
```

Release checks also require a real Neon development branch, Clerk application, OpenAI developer key, and Vercel Blob token so the database migration and authenticated business workflows can be verified end to end.

## License

This project is licensed under the MIT License.
