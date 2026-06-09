# AGENTS.md

## Agent Operating Rules

- Check the current repository state before changing code or documentation, and do not overwrite user changes.
- When a requirement has an important unresolved fork, call out the fork, provide a recommended answer, and ask only one key question at a time.
- Preserve the confirmed product boundaries and Vercel deployment target while building on the existing Next.js application.
- All project documentation, source code, code comments, identifiers, commit messages, test names, and developer-facing strings must be written in English.
- User-facing UI copy must be implemented through i18n resources instead of hard-coded strings.

## Product Boundary

`what-to-eat` is an authenticated refrigerator recommendation application deployed on Vercel.

- Use Clerk with Google and GitHub login.
- Deploy an OpenAI-only BYOK product. Each user supplies their own OpenAI developer API key.
- Never provide, embed, proxy with, or pay for a platform-owned OpenAI API key.
- Use the fixed text model `gpt-5.5` and fixed image model `gpt-image-2`.
- Do not expose provider pickers, arbitrary model ids, arbitrary base URLs, streaming output, teams, billing, or shared keys in version one.
- Support Chinese and English locale routes. Chinese is the default.
- Store generated ingredient and dish images in public Vercel Blob storage. Store only Blob references and safe statuses in Postgres.
- Keep Local Codex Mode opt-in, server-only, local-development-only, and fail-closed outside local development.
- Use Local Codex Mode for structured recommendation text validation and local image attempts through a constrained Codex file-output bridge. Local image failures must preserve text recommendations and remain safely retryable.

## Refrigerator Recommendation MVP

- Store fridge items as natural-language names with a positive numeric quantity and free-text unit.
- Merge fridge items only when normalized names and normalized units match.
- Generate ingredient images to represent ingredient types only. Quantity or unit changes must not regenerate images; name changes must.
- Store long-term food preferences as one natural-language `preference_text`.
- Accept one optional temporary natural-language requirement per recommendation request. Never persist it.
- Generate one to five structured dish candidates per request.
- Attempt one `gpt-image-2` image for every generated dish. Image failures must preserve text dishes and remain retryable from history.
- Return editable fridge consumption suggestions to the browser. Do not persist them.
- Apply confirmed consumption for one selected dish atomically. Validate user ownership, fridge-item version, unit, and remaining quantity. Delete exhausted items and roll back every decrement on any conflict.
- Keep history intentionally lightweight: recommendation headers, dish rows, and image references only. Do not save fridge snapshots, preference snapshots, temporary requirements, or consumption suggestions.
- Support deleting whole recommendation history records and individual historical dishes. Historical dish deletion removes the dish's current dish image record and best-effort deletes its uploaded Blob.

## Database Model

Start with:

```text
users
user_openai_keys
preferences
generated_images
fridge_items
recommendations
recommended_dishes
generation_rate_limit_buckets
```

Every business record must belong to the authenticated user. Never trust a user id submitted from the browser.

## API Boundaries

```text
GET    /api/openai-key
POST   /api/openai-key
DELETE /api/openai-key
POST   /api/openai-key/validate
GET    /api/preferences
PUT    /api/preferences
GET    /api/fridge-items
POST   /api/fridge-items
PATCH  /api/fridge-items/:itemId
DELETE /api/fridge-items/:itemId
POST   /api/fridge-items/:itemId/retry-image
POST   /api/fridge-items/apply-consumption
POST   /api/recommend
GET    /api/recommendations
DELETE /api/recommendations/:recommendationId
DELETE /api/recommendations/dishes/:dishId
POST   /api/recommendations/:dishId/retry-image
```

All APIs require authentication. Filter every query by the current Clerk user id or its mapped business user id.

## Security And Deployment

- Encrypt user OpenAI keys with AES-256-GCM and an independent IV before database writes.
- Return key hints only. Never return plaintext keys.
- Rate-limit recommendation, ingredient-image, and dish-image-retry actions by Clerk user id before model calls.
- Validate complete structured JSON responses before writing recommendation history.
- Map upstream failures to stable localized business errors without exposing full payloads or sensitive values.
- Required deployed environment variables:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
DATABASE_URL
MASTER_ENCRYPTION_KEY
BLOB_READ_WRITE_TOKEN
```

Do not configure `LOCAL_CODEX_ENABLED` in Vercel.
