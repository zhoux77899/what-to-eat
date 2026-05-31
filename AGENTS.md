# AGENTS.md

## Agent Operating Rules

- Check the current repository state before changing code or documentation, and do not overwrite user changes.
- When a requirement has an important unresolved fork, call out the fork, provide a recommended answer, and ask only one key question at a time.
- The project has been scaffolded, so implementation advice must preserve the confirmed product boundaries and deployment target while building on the existing application.
- All project documentation, source code, code comments, identifiers, commit messages, test names, and developer-facing strings must be written in English.
- User-facing UI copy must be implemented through i18n resources instead of hard-coded strings.

## Project Purpose

Project name: `what-to-eat`

Goal: build a full-stack web application deployed on Vercel that helps users generate food recommendations and optional meal images with GPT models based on their preferences and recommendation history.

Confirmed product boundaries:

- The application requires user authentication.
- The first version supports both Google login and GitHub login.
- The deployed application integrates only with the OpenAI API.
- OpenAI developer API keys are provided by users.
- The deployed platform does not provide, embed, proxy with, or pay for platform-owned OpenAI API keys.
- The application supports fixed GPT text and image models instead of arbitrary providers, base URLs, or model ids.
- The database stores user configuration, model key metadata, preferences, and recommendation history.
- Recommendation results use structured JSON as the primary data format, not plain natural language text.
- The application stores long-term user food preferences and allows per-request temporary overrides.
- Model calls using user-owned OpenAI API keys still need lightweight rate limiting to prevent accidental loops, repeated clicks, and proxy abuse.
- The first version does not support streaming output. The server waits for the complete structured JSON response, validates it, saves it, and then returns it.
- The first version supports i18n. The default language is Chinese, and the first supported languages are Chinese and English.
- The deployed application does not support using ChatGPT Plus/Pro, Codex subscriptions, or similar product subscriptions as OpenAI API quota.
- Local development may opt into Local Codex Mode to validate structured GPT text and meal image generation through locally authenticated Codex access.

## Recommended Stack

Preferred stack:

- Framework: Next.js + TypeScript
- Deployment: Vercel
- Authentication: Clerk
- Database: Neon Postgres
- ORM: Drizzle
- Model calls: Next.js Route Handlers that call the OpenAI API on the server; local development may opt into a server-only Codex SDK adapter
- i18n: next-intl or an equivalent Next.js i18n solution

Why this stack:

- The project needs authentication state, database access, server-side OpenAI key decryption, OpenAI API calls, protected routes, and i18n. Next.js fits this Vercel-hosted full-stack shape better than a Vite SPA.
- Clerk is a strong fit for quickly implementing Google and GitHub OAuth login.
- Neon Postgres fits Vercel's serverless execution model.
- Drizzle is lightweight and keeps the database schema explicit.
- i18n must be included from the first version across routes, translation resources, error-code mapping, and model output language control.

Vite + Node.js is not forbidden, but it is not the preferred architecture for this project. Prefer it only if the product explicitly becomes a mostly-client-side SPA with very few backend responsibilities.

## Authentication

First version:

- Support Google login.
- Support GitHub login.
- Block unauthenticated users from recommendation generation, model key settings, preferences, and recommendation history.

Implementation requirements:

- Use Clerk for third-party authentication.
- Server-side APIs must authorize requests with the Clerk user id.
- Business user records in the database must map to the Clerk user id.
- Never trust a user id submitted from the client.

## Model Strategy

The deployed application supports OpenAI only and does not expose a provider picker, arbitrary base URLs, or arbitrary model ids.

Fixed version-one models:

- Structured meal recommendation text: `gpt-5.5`
- Optional meal image generation: `gpt-image-2`

Production requirements:

- The deployed application may call only fixed OpenAI models defined in a server-side allowlist.
- The browser must not select arbitrary model ids or submit arbitrary base URLs.
- Production and Vercel Preview must use user-owned OpenAI developer API keys.
- Product copy must clearly state that deployed generation uses OpenAI developer API keys, not consumer subscription quota.

Local development exception:

- Local Codex Mode may be enabled only in a local development process.
- The server-side adapter uses `@openai/codex-sdk`, which invokes the locally authenticated Codex CLI.
- Local Codex Mode may generate structured recommendation text and meal images for end-to-end validation.
- Local Codex Mode must validate the same application result schemas and return safe business errors when local capabilities are unavailable.
- Local Codex Mode must refuse activation in Vercel Preview, Vercel Production, and any non-development process.
- Direct CLI use is reserved for troubleshooting the application adapter.

## User API Key Management

The deployed project uses an OpenAI-only BYOK model: Bring Your Own Key.

Security requirements:

- User OpenAI API keys may only be submitted to the server.
- The browser must not call OpenAI directly.
- The database must never store plaintext API keys.
- The server must encrypt API keys with `MASTER_ENCRYPTION_KEY` before storing them.
- Prefer an authenticated encryption scheme such as AES-256-GCM.
- Each stored key must use an independent IV or nonce.
- The client may only display a key hint, such as `...abcd`.
- Full API keys must never be returned to the client.
- Logs must never include API keys, request headers, full upstream error objects, or sensitive payloads.
- Users must be able to delete, replace, and re-validate their own keys.
- Even though production model costs are paid through user-owned OpenAI keys, the platform must still rate-limit recommendation calls.

Default data flow:

```text
User logs in
  -> User submits their own OpenAI API key
  -> Server validates the key
  -> Server encrypts and stores the key
  -> Recommendation API decrypts the key
  -> Server calls the fixed OpenAI text model
  -> Server optionally calls the fixed OpenAI image model
  -> Server validates and normalizes the structured JSON result
  -> Server saves the recommendation result
  -> Server returns the result to the client
```

Local development data flow:

```text
Developer enables Local Codex Mode in a local process
  -> User submits a recommendation request through the application UI
  -> Recommendation API selects the local server adapter
  -> The adapter invokes @openai/codex-sdk
  -> The SDK starts the locally authenticated Codex CLI
  -> Codex generates structured recommendation text and an optional meal image
  -> Server validates and normalizes the same application result schemas
  -> Server returns or saves the result through the normal application flow
```

## Initial Database Model

Start with these tables:

```text
users
  id
  clerk_user_id
  created_at
  updated_at

user_openai_keys
  id
  user_id
  encrypted_api_key
  key_hint
  status
  last_validated_at
  last_used_at
  created_at
  updated_at

preferences
  id
  user_id
  locale
  dietary_restrictions
  disliked_foods
  budget_level
  location_hint
  created_at
  updated_at

recommendations
  id
  user_id
  text_model
  image_model
  locale
  effective_preferences_json
  input_json
  result_json
  image_metadata_json
  image_requested
  error_code
  created_at
```

Data modeling requirements:

- Every business record must belong to the current authenticated user.
- Long-term preferences and per-request temporary overrides must stay separate.
- Temporary overrides affect only the current recommendation and must not be written back to long-term preferences automatically.
- User preferences must store the default locale.
- A single recommendation request may temporarily override the output locale.
- Recommendation history must preserve the text and image model ids used at generation time.
- Recommendation history must preserve the effective preference snapshot and locale used at generation time.
- OpenAI keys may become invalid, be replaced, or be deleted without breaking historical recommendation records.

## API Boundaries

Recommended endpoints:

```text
GET    /api/openai-key
POST   /api/openai-key
DELETE /api/openai-key
POST   /api/openai-key/validate
POST   /api/recommend
GET    /api/recommendations
GET    /api/preferences
PUT    /api/preferences
```

API requirements:

- All APIs require authentication by default unless they are explicitly public.
- Every user-data query must be filtered by the current authenticated user.
- `/api/recommend` must confirm that the current user has a valid configured OpenAI key before calling OpenAI in the deployed application.
- `/api/recommend` may use Local Codex Mode without an OpenAI key only when the server has confirmed it is running in an explicitly enabled local development process.
- `/api/recommend` must merge long-term user preferences with per-request temporary overrides and save the effective preference snapshot.
- `/api/recommend` must require structured JSON from the model and validate the result shape on the server.
- `/api/recommend` must include the current user locale or per-request locale in the prompt and require user-visible text fields to use that language.
- `/api/recommend` must not use streaming in the first version. It must parse the model response, validate the schema, and write recommendation history before returning.
- Missing OpenAI key errors must return a stable business error code that lets the client route the user to OpenAI key settings.
- Upstream OpenAI and Local Codex errors must be mapped to safe business errors.
- Do not expose full upstream responses to the client.
- If the model response cannot be parsed or does not match the schema, return a safe business error and allow the client to suggest retrying.

## Lightweight Rate Limiting

The first version must include lightweight rate limiting.

Default strategy:

- Rate-limit `/api/recommend` by Clerk user id.
- Default to at most 5 recommendation requests per user per minute.
- Consider a daily soft limit, such as 100 recommendation requests per user per day.
- Return a stable business error code such as `RATE_LIMITED` when the limit is hit.
- Rate-limited requests must not consume the user's OpenAI API key or invoke Local Codex Mode.

Implementation guidance:

- The first version may use database records, Vercel KV, or Upstash Redis.
- If database-backed rate limiting is used, handle concurrent requests atomically.
- Do not rely only on disabled client buttons. The server must enforce limits.
- If the product later supports teams or shared keys, revisit the rate-limit dimensions.

## i18n

The first version must support i18n.

Default language plan:

- Default language: Chinese.
- First supported languages: Chinese and English.
- Use locale routes or an equivalent mechanism, such as `/zh` and `/en`.
- UI copy, form validation, empty states, error messages, settings pages, and recommendation displays must all use translation resources.
- Server-side business errors must use stable error codes, and the client must map those codes to the active locale.
- Model responses are still structured JSON, but user-visible text fields inside the JSON must use the active locale.
- Recommendation history must store the generation locale so that old results remain understandable after the user changes languages.

Implementation requirements:

- Do not hard-code user-facing copy in components.
- Do not let the model freely choose its output language.
- The prompt builder must explicitly receive the locale and language name.
- JSON schema field names must remain stable English identifiers.
- User-visible JSON field values must follow the active locale.
- Every new page or error code must include matching translation resources.

## Vercel Deployment Preparation

Before deployment, confirm:

- The project has a complete `package.json`.
- `build`, `lint`, and test commands run locally.
- Environment variables are configured separately for Production, Preview, and Development in Vercel.
- Production does not rely on a persistent local filesystem.
- The database migration flow is clear.
- The production branch is clear. Prefer `main`.

Required environment variables:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
DATABASE_URL
MASTER_ENCRYPTION_KEY
```

Do not configure platform-owned OpenAI API keys. The deployed product uses user-owned OpenAI API keys only. Do not configure Local Codex Mode in Vercel.

## Implementation Principles

- Prioritize the smallest deployable loop: login, key configuration, recommendation generation, and history.
- Do not add additional production providers, complex plans, team workspaces, or billing systems in the first version.
- Do not scatter generation logic across API handlers. Use one production OpenAI adapter and one development-only Local Codex adapter.
- Do not expose key decryption details or full upstream error details to the client.
- Do not implement arbitrary custom base URLs unless the security boundary is re-evaluated.
- Keep Local Codex Mode opt-in, server-only, local-development-only, and fail-closed outside local development.
- All source code and code comments must be written in English.
