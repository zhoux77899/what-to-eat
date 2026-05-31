# What-to-Eat Application Development Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a Vercel-hosted, authenticated, internationalized meal recommendation application that uses user-owned OpenAI API keys in deployed environments and an opt-in Local Codex Mode for local text and image validation.

**Architecture:** Keep the existing Next.js App Router application and server-side Route Handler boundary. Deployed environments call fixed OpenAI GPT text and image models with encrypted user-owned OpenAI API keys. Local development may explicitly enable a server-only `@openai/codex-sdk` adapter that invokes the locally authenticated Codex CLI while preserving the same validated application result contracts.

**Tech Stack:** Next.js 16, TypeScript, Clerk, Neon Postgres, Drizzle ORM, next-intl, Zod, Vitest, Playwright, Vercel

---

## Purpose

This is the master development plan for the current application. It records completed foundation work and the remaining implementation sequence.

Each unchecked task is intentionally bounded so it can receive a focused implementation plan before code changes begin. The deployable milestone is an OpenAI-backed MVP. Local Codex Mode is a development convenience for validating structured text and meal image flows, not a deployed provider or fallback.

## Status Rules

- `[x]` means the capability exists in the repository and its available local verification passed on 2026-05-31.
- `[ ]` means the capability is required but is not yet implemented end to end.
- A route or page shell does not count as a completed feature until it persists or retrieves real user-scoped data.

## Verified Baseline

- [x] Current application commit is `5f6609b` (`Add app framework and auth-ready recommendation shell (#2)`).
- [x] `main`, `origin/main`, and the current `feature/recommendation` branch point to the same commit.
- [x] `corepack pnpm test` passes with 13 test files and 34 tests.
- [x] `corepack pnpm lint` passes.
- [x] `corepack pnpm build` passes with Next.js 16.2.6 and reports `Proxy (Middleware)`.
- [x] `corepack pnpm test:e2e` passes with 4 Playwright smoke tests.

## Completed Foundation

### Task 1: Establish the Next.js Application Scaffold

**Status:** Completed

**Files:**
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `tailwind.config.ts`
- `eslint.config.mjs`
- `vitest.config.ts`
- `playwright.config.ts`
- `scripts/run-e2e.mjs`

- [x] Configure Next.js App Router, TypeScript, Tailwind CSS, ESLint, Vitest, and Playwright.
- [x] Add `dev`, `build`, `lint`, `test`, `test:e2e`, `db:generate`, and `db:migrate` scripts.
- [x] Keep the application deployable as one Vercel project from the nested `what-to-eat/` directory.

### Task 2: Add Locale Routing and Translation Resources

**Status:** Completed

**Files:**
- `src/i18n/routing.ts`
- `src/i18n/request.ts`
- `src/app/[locale]/layout.tsx`
- `messages/zh.json`
- `messages/en.json`

- [x] Use Chinese as the default locale.
- [x] Support `/zh` and `/en` locale routes.
- [x] Store user-facing UI copy and business-error messages in translation resources.
- [x] Keep structured JSON field names stable in English while allowing user-visible values to follow the active locale.

### Task 3: Add the Clerk Authentication Shell

**Status:** Completed

**Files:**
- `src/proxy.ts`
- `src/server/request-proxy.ts`
- `src/lib/clerk-config.ts`
- `src/lib/auth-return.ts`
- `src/components/auth/auth-runtime-provider.tsx`
- `src/components/auth/auth-modal-provider.tsx`
- `src/components/auth/auth-modal.tsx`
- `src/components/auth/protected-link.tsx`
- `src/app/[locale]/sso-callback/page.tsx`

- [x] Protect app, settings, preferences, and history routes.
- [x] Provide Google and GitHub OAuth entry points through Clerk.
- [x] Prevent unsafe cross-origin and cross-locale authentication return targets.
- [x] Include the Clerk CAPTCHA container on the OAuth callback page.
- [x] Provide a localized local-development fallback when Clerk credentials are absent.
- [x] Use the Next.js 16 `src/proxy.ts` convention and preserve local `config` export analysis.

### Task 4: Add the Authenticated Application Shell

**Status:** Completed

**Files:**
- `src/components/app-shell.tsx`
- `src/app/[locale]/page.tsx`
- `src/app/[locale]/app/page.tsx`
- `src/app/[locale]/settings/openai-key/page.tsx`
- `src/app/[locale]/preferences/page.tsx`
- `src/app/[locale]/history/page.tsx`
- `src/app/globals.css`

- [x] Add a localized landing page.
- [x] Add protected navigation for recommendation generation, model-key settings, preferences, and history.
- [x] Add the minimal recommendation surface and generate action.
- [x] Add workbench page shells for model-key settings, preferences, and history.
- [x] Avoid the signed-in recommendation page viewport overflow regression.

### Task 5: Add Security and Validation Primitives

**Status:** Completed as foundation code

**Files:**
- `src/server/crypto.ts`
- `src/lib/key-redaction.ts`
- `src/server/request.ts`
- `src/server/validation.ts`
- `src/server/api-response.ts`
- `src/lib/errors.ts`
- `src/lib/preferences.ts`
- `src/lib/rate-limit.ts`
- `src/server/openai/models.ts`

- [x] Encrypt secrets with AES-256-GCM and independent random IVs.
- [x] Expose only short API-key suffix hints.
- [x] Parse request JSON through Zod schemas.
- [x] Return stable business error codes mapped to localized message keys.
- [x] Keep long-term preferences separate from per-request temporary overrides.
- [x] Define the five-per-minute and 100-per-day recommendation thresholds.
- [x] Restrict the current OpenAI shell to a server-side model allowlist.

### Task 6: Add the Initial Drizzle Schema

**Status:** Completed as a pre-migration draft

**Files:**
- `src/db/schema.ts`
- `src/db/index.ts`
- `drizzle.config.ts`

- [x] Define draft tables for users, encrypted OpenAI keys, preferences, recommendations, and recommendation rate limits.
- [x] Cache the default Neon-backed Drizzle instance on `globalThis`.
- [x] Keep explicit database URL overrides isolated for tests.
- [x] Configure Drizzle migration generation.

### Task 7: Add Foundation Regression Tests

**Status:** Completed

**Files:**
- `tests/unit/auth-modal.test.tsx`
- `tests/unit/auth-return.test.ts`
- `tests/unit/clerk-config.test.ts`
- `tests/unit/db.test.ts`
- `tests/unit/errors.test.ts`
- `tests/unit/key-redaction.test.ts`
- `tests/unit/openai-models.test.ts`
- `tests/unit/preferences.test.ts`
- `tests/unit/proxy-entry.test.ts`
- `tests/unit/rate-limit.test.ts`
- `tests/unit/recommend-page-design.test.ts`
- `tests/unit/recommend-route-source.test.ts`
- `tests/unit/sso-callback.test.tsx`
- `tests/e2e/smoke.spec.ts`

- [x] Cover Clerk configuration, OAuth launch behavior, auth redirects, and callback CAPTCHA rendering.
- [x] Cover key redaction, error mappings, preferences merging, rate-limit thresholds, DB instance reuse, and OpenAI allowlisting.
- [x] Cover locale rendering and protected-route behavior through Playwright smoke tests.

## Remaining Work

## Milestone 1: Persist the OpenAI-Only Data Model

### Task 8: Generate and Apply the Initial Database Migration

**Status:** Draft schema exists; no migration has been generated

**Files:**
- Verify: `src/db/schema.ts`
- Generate: `drizzle/`
- Verify: `package.json`

- [ ] Confirm the schema remains OpenAI-only with `user_openai_keys`.
- [ ] Generate the first Drizzle migration.
- [ ] Commit the generated SQL files and Drizzle metadata without renaming generated artifacts.
- [ ] Use the existing `db:migrate` script to apply migrations against `DATABASE_URL`.
- [ ] Apply the migration to the development database.
- [ ] Confirm all tables, foreign keys, and unique indexes exist in Neon.

**Verification:**

```bash
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm build
```

### Task 9: Add User-Scoped Data Access Services

**Status:** Not started

**Files:**
- Create: `src/server/data/users.ts`
- Create: `src/server/data/openai-keys.ts`
- Create: `src/server/data/preferences.ts`
- Create: `src/server/data/recommendations.ts`
- Create: `src/server/data/recommendation-rate-limits.ts`
- Create: `tests/unit/data-services.test.ts`

- [ ] Create or load the business user record from the authenticated Clerk user id.
- [ ] Read, upsert, delete, and mark OpenAI keys by business user id.
- [ ] Read and upsert long-term preferences by business user id.
- [ ] Insert recommendation attempts and list recommendation history by business user id.
- [ ] Never accept a business user id or Clerk user id from request JSON.
- [ ] Keep data access behind focused server-only service modules.

**Verification:**

```bash
corepack pnpm test -- tests/unit/data-services.test.ts
corepack pnpm lint
```

### Task 10: Complete the OpenAI Key API and Settings UI

**Status:** Shell exists; persistence and validation are not connected

**Files:**
- Modify: `src/app/api/openai-key/route.ts`
- Modify: `src/app/api/openai-key/validate/route.ts`
- Create: `src/server/openai/adapter.ts`
- Create: `src/components/openai-key/openai-key-form.tsx`
- Modify: `src/app/[locale]/settings/openai-key/page.tsx`
- Modify: `messages/zh.json`
- Modify: `messages/en.json`
- Create: `tests/unit/openai-key-routes.test.ts`

- [ ] Submit OpenAI keys only to server-side Route Handlers.
- [ ] Encrypt OpenAI keys before database writes.
- [ ] Return only the key hint, validation status, and validation timestamps.
- [ ] Delete and replace only the current user's own key.
- [ ] Validate keys through the OpenAI adapter and store the resulting status.
- [ ] Map upstream validation failures to safe OpenAI business errors.
- [ ] Remove `storagePreview` and every other development-only response field.
- [ ] Connect the settings page save, re-validate, replace, and delete actions.

**Verification:**

```bash
corepack pnpm test -- tests/unit/openai-key-routes.test.ts tests/unit/key-redaction.test.ts
corepack pnpm lint
```

## Milestone 2: Deliver the OpenAI-Backed Product Loop

### Task 11: Persist Long-Term Preferences

**Status:** API and page shells exist; database reads and writes are not connected

**Files:**
- Modify: `src/app/api/preferences/route.ts`
- Create: `src/components/preferences/preferences-form.tsx`
- Modify: `src/app/[locale]/preferences/page.tsx`
- Modify: `messages/zh.json`
- Modify: `messages/en.json`
- Create: `tests/unit/preferences-route.test.ts`

- [ ] Load the current user's persisted preferences.
- [ ] Create defaults when the current user has no preferences record.
- [ ] Save locale, dietary restrictions, disliked foods, budget level, and location hint.
- [ ] Keep per-request temporary overrides out of the persisted preferences record.
- [ ] Add localized validation and success feedback to the preferences form.

**Verification:**

```bash
corepack pnpm test -- tests/unit/preferences.test.ts tests/unit/preferences-route.test.ts
corepack pnpm lint
```

### Task 12: Enforce Atomic Database-Backed Recommendation Rate Limits

**Status:** Threshold helpers and draft schema exist; the route currently uses zero counts

**Files:**
- Modify: `src/server/data/recommendation-rate-limits.ts`
- Modify: `src/app/api/recommend/route.ts`
- Modify: `src/lib/rate-limit.ts`
- Create: `tests/unit/recommendation-rate-limit-service.test.ts`

- [ ] Increment and evaluate the fixed-window counter atomically by Clerk user id.
- [ ] Increment and evaluate the daily soft-limit counter atomically by Clerk user id.
- [ ] Return `RATE_LIMITED` before decrypting an OpenAI key or invoking Local Codex Mode.
- [ ] Keep the default limits at five requests per minute and 100 requests per day.
- [ ] Cover concurrent increment behavior with a service-level regression test.

**Verification:**

```bash
corepack pnpm test -- tests/unit/rate-limit.test.ts tests/unit/recommendation-rate-limit-service.test.ts
corepack pnpm lint
```

### Task 13: Define Shared GPT Result Contracts and the Adapter Boundary

**Status:** Not started

**Files:**
- Create: `src/server/recommendations/schema.ts`
- Create: `src/server/recommendations/prompt.ts`
- Create: `src/server/recommendations/service.ts`
- Create: `src/server/recommendations/types.ts`
- Modify: `src/server/validation.ts`
- Create: `tests/unit/recommendation-schema.test.ts`
- Create: `tests/unit/recommendation-prompt.test.ts`

- [ ] Define one structured meal recommendation schema with stable English field names.
- [ ] Require locale-specific user-visible values.
- [ ] Define optional meal image metadata without making raw image bytes part of recommendation history.
- [ ] Keep generation mode selection server-only.
- [ ] Require both the OpenAI API adapter and Local Codex adapter to return the same normalized result contract.
- [ ] Preserve a successful text recommendation when optional image generation fails.

**Verification:**

```bash
corepack pnpm test -- tests/unit/recommendation-schema.test.ts tests/unit/recommendation-prompt.test.ts
corepack pnpm lint
```

### Task 14: Generate and Persist Structured OpenAI Recommendations

**Status:** Route skeleton exists; no OpenAI call is made

**Files:**
- Modify: `src/server/openai/adapter.ts`
- Modify: `src/server/recommendations/service.ts`
- Modify: `src/app/api/recommend/route.ts`
- Create: `tests/unit/recommend-route.test.ts`

- [ ] Require one validated OpenAI key in deployed environments.
- [ ] Merge long-term preferences with per-request temporary overrides.
- [ ] Pass the active locale and explicit language name to the prompt builder.
- [ ] Decrypt the user's OpenAI key only immediately before the OpenAI call.
- [ ] Update the stored key's last-used timestamp after OpenAI use begins.
- [ ] Parse and validate the complete non-streaming GPT response.
- [ ] Save text model, locale, effective preferences, input JSON, result JSON, and safe error code.
- [ ] Map malformed model output to `MODEL_RESPONSE_INVALID`.
- [ ] Map OpenAI failures to safe business errors without logging secrets or full upstream payloads.

**Verification:**

```bash
corepack pnpm test -- tests/unit/recommend-route.test.ts
corepack pnpm lint
corepack pnpm build
```

### Task 15: Connect the Recommendation UI

**Status:** Generate action shell exists; no request or result rendering is connected

**Files:**
- Create: `src/components/recommendations/recommendation-generator.tsx`
- Create: `src/components/recommendations/recommendation-result.tsx`
- Modify: `src/app/[locale]/app/page.tsx`
- Modify: `messages/zh.json`
- Modify: `messages/en.json`
- Create: `tests/unit/recommendation-generator.test.tsx`

- [ ] Submit temporary overrides to `/api/recommend`.
- [ ] Disable duplicate submissions while one request is in flight.
- [ ] Render the structured recommendation result.
- [ ] Map stable business errors to localized UI messages.
- [ ] Route missing-key errors to OpenAI key settings when Local Codex Mode is disabled.
- [ ] Keep temporary overrides local to the current recommendation request.

**Verification:**

```bash
corepack pnpm test -- tests/unit/recommendation-generator.test.tsx
corepack pnpm lint
corepack pnpm test:e2e
```

### Task 16: Connect Recommendation History

**Status:** API and page shells exist; no database query or rendering is connected

**Files:**
- Modify: `src/app/api/recommendations/route.ts`
- Create: `src/components/recommendations/recommendation-history.tsx`
- Modify: `src/app/[locale]/history/page.tsx`
- Modify: `messages/zh.json`
- Modify: `messages/en.json`
- Create: `tests/unit/recommendations-route.test.ts`

- [ ] List only the current user's recommendation records.
- [ ] Preserve text model, optional image model, generation locale, effective preferences, structured result, image metadata, and safe error state.
- [ ] Render successful and failed attempts without exposing sensitive input.
- [ ] Keep historical records readable after preferences, locale, or keys change.

**Verification:**

```bash
corepack pnpm test -- tests/unit/recommendations-route.test.ts
corepack pnpm lint
corepack pnpm test:e2e
```

## Milestone 3: Add Local Codex Mode for Development Validation

### Task 17: Add the Local Codex Text Adapter

**Status:** Not started

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Create: `src/server/local-codex/config.ts`
- Create: `src/server/local-codex/adapter.ts`
- Modify: `src/server/recommendations/service.ts`
- Modify: `src/lib/errors.ts`
- Modify: `messages/zh.json`
- Modify: `messages/en.json`
- Create: `tests/unit/local-codex-config.test.ts`
- Create: `tests/unit/local-codex-adapter.test.ts`

- [ ] Add `@openai/codex-sdk` as a server-only dependency.
- [ ] Enable Local Codex Mode only when `LOCAL_CODEX_ENABLED=true`.
- [ ] Refuse activation when `NODE_ENV` is not `development` or a Vercel environment marker is present.
- [ ] Invoke the locally authenticated Codex CLI through the SDK from the Next.js server.
- [ ] Generate structured recommendation text with the shared prompt and output schema.
- [ ] Return safe localized business errors when the CLI, login session, or required capability is unavailable.
- [ ] Keep direct CLI execution outside the normal application path and reserve it for troubleshooting.

**Verification:**

```bash
corepack pnpm test -- tests/unit/local-codex-config.test.ts tests/unit/local-codex-adapter.test.ts
corepack pnpm lint
corepack pnpm build
```

### Task 18: Add Local Codex Meal Image Validation

**Status:** Not started

**Files:**
- Create: `src/server/local-codex/image-service.ts`
- Create: `src/app/api/local-codex-images/[id]/route.ts`
- Modify: `src/server/local-codex/adapter.ts`
- Modify: `.gitignore`
- Modify: `messages/zh.json`
- Modify: `messages/en.json`
- Create: `tests/unit/local-codex-image-service.test.ts`

- [ ] Request an optional meal image through the local Codex toolchain.
- [ ] Store local image artifacts only under the ignored `.local-codex/images/` development directory.
- [ ] Serve local artifacts only through a development-only route that refuses non-local activation.
- [ ] Return normalized image metadata to the recommendation service.
- [ ] Preserve a successful text recommendation when local image generation is unavailable or fails.
- [ ] Make local capability limits visible through safe localized errors.

**Verification:**

```bash
corepack pnpm test -- tests/unit/local-codex-image-service.test.ts
corepack pnpm lint
corepack pnpm build
```

## Milestone 4: Add Production Meal Images

### Task 19: Add OpenAI Meal Image Generation

**Status:** Draft schema fields and OpenAI image-model allowlist exist; no image call is made

**Files:**
- Create: `src/server/openai/image-adapter.ts`
- Create: `src/server/recommendations/image-service.ts`
- Modify: `src/server/recommendations/service.ts`
- Modify: `src/components/recommendations/recommendation-result.tsx`
- Modify: `messages/zh.json`
- Modify: `messages/en.json`
- Create: `tests/unit/recommendation-image-service.test.ts`

- [ ] Keep structured text recommendation generation as the primary result.
- [ ] Make meal-image generation opt-in per recommendation request.
- [ ] Call the fixed `gpt-image-2` model with the user's OpenAI API key.
- [ ] Store safe image metadata instead of full upstream payloads.
- [ ] Define a durable image storage strategy before enabling images in Vercel.
- [ ] Preserve a successful text recommendation when image generation fails.
- [ ] Communicate organization-verification requirements for `gpt-image-2`.

**Verification:**

```bash
corepack pnpm test -- tests/unit/recommendation-image-service.test.ts
corepack pnpm lint
corepack pnpm build
```

## Milestone 5: Verify Deployment Readiness

### Task 20: Add End-to-End Coverage for Both Generation Modes

**Status:** Anonymous smoke coverage exists; authenticated product-loop coverage is not connected

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`
- Create: `tests/e2e/openai-key-settings.spec.ts`
- Create: `tests/e2e/recommendation-flow.spec.ts`
- Create: `tests/e2e/preferences-and-history.spec.ts`
- Create: `tests/e2e/local-codex-flow.spec.ts`
- Modify: `scripts/run-e2e.mjs`

- [ ] Cover an authenticated user configuring and validating an OpenAI key.
- [ ] Cover preference persistence and per-request temporary overrides.
- [ ] Cover one structured recommendation appearing in history.
- [ ] Cover localized missing-key, invalid-key, rate-limit, malformed-model-response, and OpenAI-failure states.
- [ ] Cover Local Codex Mode activation guards without requiring it in the default test suite.
- [ ] Add an opt-in local smoke path for Codex text and image validation when the local CLI is authenticated.
- [ ] Keep test keys and model calls isolated from production credentials.

**Verification:**

```bash
corepack pnpm test
corepack pnpm lint
corepack pnpm build
corepack pnpm test:e2e
```

### Task 21: Prepare Vercel Environments and Release Checks

**Status:** Environment variable names exist; Vercel environment configuration and release checks are not fully documented

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Create: `docs/deployment/vercel.md`

- [ ] Document local setup, Neon migration flow, Clerk OAuth configuration, and verification commands.
- [ ] Document the optional local-only `LOCAL_CODEX_ENABLED=true` setting.
- [ ] Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`, and `MASTER_ENCRYPTION_KEY` separately for Vercel Development, Preview, and Production.
- [ ] Do not configure `LOCAL_CODEX_ENABLED` in Vercel.
- [ ] Add durable image-storage environment variables only when Task 19 is enabled.
- [ ] Confirm production uses `main`.
- [ ] Confirm production does not depend on a persistent local filesystem or locally authenticated Codex CLI.
- [ ] Run the full verification suite against Preview before promoting to Production.

**Verification:**

```bash
corepack pnpm test
corepack pnpm lint
corepack pnpm build
corepack pnpm test:e2e
```

## Explicitly Out of Scope

- Platform-owned, embedded, proxied, or platform-paid OpenAI API keys.
- Consumer subscription quota as deployed Vercel application quota.
- Local Codex Mode in Vercel Preview or Production.
- DeepSeek, Anthropic, arbitrary providers, arbitrary base URLs, or a provider picker.
- Streaming recommendation output in the first version.
- Team workspaces, shared keys, billing, and complex plans.

## Recommended Execution Order

1. Complete Tasks 8-10 to establish OpenAI-only persistence and key management.
2. Complete Tasks 11-16 to ship the deployable structured-text OpenAI loop.
3. Complete Tasks 17-18 to add local Codex text and image validation without changing production behavior.
4. Complete Task 19 to enable durable production meal images.
5. Complete Tasks 20-21 before production release.
