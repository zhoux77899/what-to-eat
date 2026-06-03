# Refrigerator Recommendation MVP Development Plan

**Goal:** Deliver an authenticated Vercel application that recommends dishes from user-owned refrigerator inventory, preserves lightweight dish history, and stores generated ingredient and dish images in public Vercel Blob storage.

**Architecture:** Keep the existing Next.js App Router boundary. Route Handlers authenticate with Clerk, map to user-scoped Neon records through Drizzle, call fixed OpenAI models with encrypted user-owned keys, and return stable localized business errors. Local Codex Mode remains local-development-only and fail-closed.

**Tech Stack:** Next.js 16, TypeScript, Clerk, Neon Postgres, Drizzle ORM, OpenAI JavaScript SDK, Vercel Blob, next-intl, Zod, Vitest, Playwright

## Current Implementation Snapshot

This branch implements the MVP application surface, API boundary, Drizzle schema, initial migration, generation adapters, image storage flow, localized workbench UI, and source-level unit coverage. The remaining work is release readiness: applying the generated migration to an isolated Neon branch, adding database-backed integration tests, running authenticated browser flows, and preparing a Vercel Preview with real Clerk/OpenAI/Blob configuration.

## Completed MVP Implementation

### Task 1: Replace the Draft Schema

- [x] Replace structured preference fields with `preferences.preference_text`.
- [x] Add `generated_images`, `fridge_items`, `recommended_dishes`, and `generation_rate_limit_buckets`.
- [x] Remove `effective_preferences_json`, `input_json`, `result_json`, `image_metadata_json`, and mixed recommendation rate-limit fields.
- [x] Add fridge quantity and recommendation candidate-count checks.
- [x] Add normalized fridge-item uniqueness and recommendation history indexes.

### Task 2: Implement Refrigerator Inventory

- [x] Add protected `/[locale]/fridge`.
- [x] Add user-scoped fridge CRUD APIs and UI.
- [x] Merge matching normalized names and units by incrementing quantity.
- [x] Preserve ingredient images when quantity or unit changes.
- [x] Request a new ingredient image when a name changes.
- [x] Keep fridge rows usable when image generation fails.

### Task 3: Implement Structured Recommendations

- [x] Accept `candidateCount` from one to five and one optional temporary requirement.
- [x] Generate structured dish candidates with fixed `gpt-5.5`.
- [x] Validate complete non-streaming output before writing history.
- [x] Persist recommendation headers and normalized dish rows only.
- [x] Keep temporary requirements, fridge snapshots, preference snapshots, and consumption suggestions out of Postgres.
- [x] Return versioned editable consumption suggestions to the browser.

### Task 4: Implement Atomic Consumption Confirmation

- [x] Accept fridge item id, expected version, unit, and edited consumed quantity.
- [x] Apply all decrements for one selected dish through one atomic SQL CTE.
- [x] Validate ownership, versions, units, positive quantities, and remaining inventory.
- [x] Delete exhausted fridge items.
- [x] Roll back every decrement on any conflict.

### Task 5: Implement Images And History

- [x] Attempt `gpt-image-2` ingredient and dish generation in Production OpenAI Mode.
- [x] Upload successful images to public Vercel Blob storage.
- [x] Save image references, status, mode, fixed model id, and safe error codes.
- [x] Preserve text dishes when image generation fails.
- [x] Add ingredient and historical dish image retry actions.
- [x] Render lightweight recommendation history.

### Task 6: Implement BYOK And Local Codex Mode

- [x] Persist AES-256-GCM encrypted user OpenAI keys with hints and statuses.
- [x] Validate keys through OpenAI without exposing plaintext.
- [x] Add database-backed generation action buckets.
- [x] Enable Local Codex Mode only for explicit non-Vercel development processes.
- [x] Generate local structured recommendation text through `@openai/codex-sdk`.
- [x] Fail local image attempts safely until a supported generated-image byte path exists.

## Remaining Release Work

### Task 7: Generate And Apply The Initial Migration

- [x] Generate and review the first Drizzle SQL migration.
- [x] Commit `what-to-eat/drizzle/0000_smart_madame_masque.sql` and Drizzle metadata.
- [x] Apply it to an isolated Neon development branch through `DATABASE_URL`.
- [x] Confirm tables, foreign keys, checks, and indexes in Neon.

### Task 8: Add Database-Backed Integration Tests

Existing source-level tests check that the data layer uses upserts, batched history writes, and row locking. The release still needs real Postgres behavior coverage.

- [x] Cover concurrent fridge merges against Postgres.
- [x] Cover atomic consumption rollback for stale versions and insufficient quantities.
- [x] Cover generation bucket contention.
- [x] Cover lightweight history writes and absence of transient fields.

### Task 9: Add Authenticated Browser E2E

Existing Playwright smoke tests cover public Chinese and English pages plus authentication gates. Authenticated business workflows remain pending.

- [ ] Cover key save, key validation, fridge CRUD, recommendation generation, consumption confirmation, and history.
- [ ] Cover failed image state and retry.
- [ ] Cover Chinese and English UI flows.
- [ ] Add opt-in Local Codex text smoke coverage.

### Task 10: Prepare Vercel Preview

- [ ] Configure Clerk, isolated Neon, `MASTER_ENCRYPTION_KEY`, and Vercel Blob separately for Preview and Production.
- [ ] Do not configure `LOCAL_CODEX_ENABLED` in Vercel.
- [ ] Run the full verification suite against Preview before promotion.

## Verification

Local branch verification:

```bash
cd what-to-eat
corepack pnpm test
corepack pnpm lint
corepack pnpm build
corepack pnpm test:e2e
```

Environment-backed release verification:

```bash
cd what-to-eat
corepack pnpm test:db
corepack pnpm db:generate
corepack pnpm db:migrate
```
