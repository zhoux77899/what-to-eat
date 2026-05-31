# what-to-eat

`what-to-eat` is a Vercel-ready Next.js application for generating structured meal recommendations from a user's food preferences and recommendation history.

The deployed first version uses an OpenAI-only BYOK model: each user supplies their own OpenAI developer API key. The server is responsible for encrypting stored keys, validating requests, calling fixed OpenAI models, saving recommendation history, and returning structured JSON results. Local development may opt into a separate Local Codex Mode to validate the same application flow with locally authenticated Codex access.

## Product boundary

Version-one scope includes:

- Google and GitHub sign-in through Clerk.
- Chinese and English locale routes under `/zh` and `/en`.
- Long-term food preferences with per-request temporary overrides.
- Structured meal recommendations using the fixed text model `gpt-5.5`.
- Optional meal image generation using the fixed image model `gpt-image-2`.
- Server-side API key encryption and lightweight recommendation rate limiting.
- An opt-in Local Codex Mode for local end-to-end text and image validation through `@openai/codex-sdk` and the locally authenticated Codex CLI.

Version one does not support:

- ChatGPT Plus, ChatGPT Pro, Codex subscriptions, or other consumer subscription quota as deployed application quota.
- Platform-owned OpenAI API keys.
- Custom provider URLs.
- DeepSeek, Anthropic, or arbitrary model providers.
- Streaming model output.
- Local Codex Mode in Vercel Preview or Production.

## Current status

The repository is an application skeleton under active development. The product boundary is defined, but the full recommendation loop is not connected end to end yet.

| Area | Status | Notes |
| --- | --- | --- |
| Locale-aware UI | Implemented foundation | Chinese and English routes, translation resources, and localized UI copy are present. |
| Authentication UI | Implemented foundation | Clerk Google and GitHub OAuth redirect flow, callback handling, configuration checks, and local fallback behavior are present. |
| Data model | Implemented foundation | Drizzle schema covers users, encrypted OpenAI keys, preferences, recommendations, and rate-limit records. |
| API key security | Partially implemented | AES-256-GCM encryption, independent IV generation, and key hints are implemented. Database persistence and upstream key validation are not connected yet. |
| Preferences | Scaffolded | Validation and merge helpers are present. The API currently returns defaults or validated request data without database persistence. |
| Recommendation history | Scaffolded | Schema and page shell are present. The API currently returns an empty list. |
| Recommendation generation | Scaffolded | Request validation, preference merging, stable error codes, and rate-limit constants are present. OpenAI calls, database-backed limits, result validation, and history writes are not connected yet. |
| Meal images | Planned within version one | The fixed `gpt-image-2` model id is defined, but image generation is not connected yet. |
| Local Codex Mode | Planned for local development | The local server adapter will use `@openai/codex-sdk` and the locally authenticated Codex CLI to validate structured text and meal image flows without changing the deployed BYOK boundary. |

## Stack

- Next.js App Router and TypeScript
- Clerk authentication
- Neon Postgres with Drizzle
- next-intl with `/zh` and `/en` locale routes
- Tailwind CSS with local shadcn-style primitives
- Vitest unit tests and Playwright smoke tests
- `@openai/codex-sdk` for the planned opt-in local-development adapter

## Local development

The Next.js application lives in the nested `what-to-eat/` directory.

```bash
cd what-to-eat
corepack pnpm install
cp .env.example .env.local
corepack pnpm dev
```

Open `http://127.0.0.1:3000/zh` for the default Chinese route or `http://127.0.0.1:3000/en` for English.

### Local generation modes

Use the production-equivalent path when validating OpenAI API key storage, validation, and deployed behavior. This path requires a user-owned OpenAI developer API key.

Local development may instead opt into Local Codex Mode. The Next.js server adapter invokes `@openai/codex-sdk`, which starts the locally authenticated Codex CLI, to generate structured recommendation text and request meal images through the local Codex toolchain. The adapter must validate the same application schemas and return safe business errors when local capabilities are unavailable.

Authenticate the local Codex CLI through an eligible ChatGPT plan before enabling the adapter. Local Codex Mode is a development convenience, not a deployable provider or a replacement for OpenAI API key validation.

References:

- [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
- [Codex SDK](https://github.com/openai/codex/blob/main/sdk/typescript/README.md)

## Environment variables

Copy `what-to-eat/.env.example` to `what-to-eat/.env.local` and configure:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `MASTER_ENCRYPTION_KEY`

Local Codex Mode adds one optional local-only environment variable:

- `LOCAL_CODEX_ENABLED=true`

Do not configure `LOCAL_CODEX_ENABLED` in Vercel. The adapter must also refuse activation outside a local development process.

`MASTER_ENCRYPTION_KEY` must be a base64-encoded 32-byte key. Generate one in PowerShell:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Use separate environment values for local development, Vercel Preview, and Vercel Production.

## Clerk OAuth setup

Create a Clerk application and enable Google and GitHub as sign-in providers.

Add locale-aware callback URLs for each local or deployed origin. For local development:

- `http://127.0.0.1:3000/zh/sso-callback`
- `http://127.0.0.1:3000/en/sso-callback`

When Clerk keys are missing or unusable, the local UI uses a fallback path that keeps public pages renderable and reports that authentication configuration is incomplete. Protected pages and authenticated APIs still require a working Clerk configuration.

## Database migrations

Configure `DATABASE_URL`, then generate the first Drizzle migration and apply it:

```bash
cd what-to-eat
corepack pnpm db:generate
corepack pnpm db:migrate
```

Generated migration files are not currently committed. Review generated SQL before applying it to a shared database.

## API status

All API routes are intended to require the current Clerk user id. The browser must never submit or control a business user id.

| Route | Method | Current behavior |
| --- | --- | --- |
| `/api/openai-key` | `GET` | Returns a safe `not_configured` placeholder for an authenticated user. |
| `/api/openai-key` | `POST` | Validates the submitted key, encrypts it in memory, and returns a key hint plus an encryption-length preview. It does not persist the key yet. |
| `/api/openai-key` | `DELETE` | Returns a placeholder deletion result. |
| `/api/openai-key/validate` | `POST` | Returns `validation_required`; upstream OpenAI validation is not connected yet. |
| `/api/preferences` | `GET` | Returns default preferences. |
| `/api/preferences` | `PUT` | Validates and returns submitted preferences without database persistence. |
| `/api/recommend` | `POST` | Validates auth, request shape, preference overrides, and rate-limit helpers, then returns `MISSING_OPENAI_KEY`. Real generation is not connected yet. |
| `/api/recommendations` | `GET` | Returns an empty recommendation list. |

## Vercel deployment preparation

Before deploying:

1. Create a Neon Postgres database and configure `DATABASE_URL`.
2. Generate and review the initial Drizzle migration.
3. Configure Clerk Google and GitHub OAuth providers.
4. Add `/zh/sso-callback` and `/en/sso-callback` URLs for each deployed domain in Clerk.
5. Configure the four required environment variables separately for Vercel Development, Preview, and Production.
6. Run lint, unit tests, smoke tests, and a production build locally.
7. Complete the unconnected runtime flows listed in the status tables before treating the application as production-ready.

The deployed project does not rely on a persistent local filesystem, does not configure platform-owned OpenAI API keys, and must not enable Local Codex Mode.

## Verification

```bash
cd what-to-eat
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

## License

This project is licensed under the MIT License.
