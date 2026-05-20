# what-to-eat

`what-to-eat` is a Vercel-ready Next.js application skeleton for generating structured meal recommendations with a user-owned OpenAI developer API key.

## Stack

- Next.js App Router and TypeScript
- Clerk authentication
- Neon Postgres with Drizzle
- next-intl with `/zh` and `/en` locale routes
- Tailwind CSS with shadcn-style local primitives
- Vitest unit tests and Playwright smoke tests

## Product Boundary

Version one is OpenAI-only BYOK. The server uses fixed model ids:

- Structured meal recommendations: `gpt-5.5`
- Optional meal image generation: `gpt-image-2`

The app does not support ChatGPT Plus, ChatGPT Pro, Codex subscriptions, Claude subscriptions, custom provider URLs, DeepSeek, or Anthropic in version one.

## Setup

```bash
cd what-to-eat
corepack pnpm install
cp .env.example .env.local
corepack pnpm dev
```

Required environment variables:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
DATABASE_URL
MASTER_ENCRYPTION_KEY
```

In the Clerk dashboard, enable Google and GitHub as OAuth sign-in providers. Add callback URLs for each deployed domain and local development, for example:

```text
http://127.0.0.1:3000/zh/sso-callback
http://127.0.0.1:3000/en/sso-callback
```

`MASTER_ENCRYPTION_KEY` must be a base64-encoded 32-byte key.

## Verification

```bash
cd what-to-eat
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```
