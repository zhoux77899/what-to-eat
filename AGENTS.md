# AGENTS.md

## Agent Operating Rules

- Check the current repository state before changing code or documentation, and do not overwrite user changes.
- When a requirement has an important unresolved fork, call out the fork, provide a recommended answer, and ask only one key question at a time.
- The project has not been scaffolded yet, so implementation advice must serve the confirmed product boundaries and deployment target first.
- All project documentation, source code, code comments, identifiers, commit messages, test names, and developer-facing strings must be written in English.
- User-facing UI copy must be implemented through i18n resources instead of hard-coded strings.

## Project Purpose

Project name: `what-to-eat`

Goal: build a full-stack web application deployed on Vercel that helps users generate food recommendations based on their preferences, recommendation history, and selected model provider.

Confirmed product boundaries:

- The application requires user authentication.
- The first version supports both Google login and GitHub login.
- The application integrates with model provider APIs.
- Model API keys are provided by users.
- The platform does not provide, embed, proxy with, or pay for platform-owned model API keys.
- The application supports a fixed set of model providers instead of arbitrary custom providers.
- The database stores user configuration, model key metadata, preferences, and recommendation history.
- Recommendation results use structured JSON as the primary data format, not plain natural language text.
- The application stores long-term user food preferences and allows per-request temporary overrides.
- Model calls using user-owned API keys still need lightweight rate limiting to prevent accidental loops, repeated clicks, and proxy abuse.
- The first version does not support streaming output. The server waits for the complete structured JSON response, validates it, saves it, and then returns it.
- The first version supports i18n. The default language is Chinese, and the first supported languages are Chinese and English.
- The application does not support using ChatGPT Plus/Pro, Codex subscriptions, Claude Pro/Max, Claude Code, or similar product subscriptions as model API quota.

## Recommended Stack

Preferred stack:

- Framework: Next.js + TypeScript
- Deployment: Vercel
- Authentication: Clerk
- Database: Neon Postgres
- ORM: Drizzle
- Model calls: Next.js Route Handlers that proxy provider API calls on the server
- i18n: next-intl or an equivalent Next.js i18n solution

Why this stack:

- The project needs authentication state, database access, server-side key decryption, model API proxying, protected routes, and i18n. Next.js fits this Vercel-hosted full-stack shape better than a Vite SPA.
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

## Model Provider Strategy

The application supports a fixed provider list and does not allow arbitrary custom base URLs.

First supported providers:

- OpenAI
- DeepSeek
- Anthropic

Design requirements:

- OpenAI and DeepSeek may share an OpenAI-compatible adapter, but provider ids, base URLs, and model lists must be defined in a server-side allowlist.
- Anthropic must use a separate adapter.
- The client may only select providers and models that the server allows.
- Do not let users submit arbitrary base URLs. This avoids SSRF risk, proxy abuse, and unclear provider boundaries.

Explicitly unsupported:

- ChatGPT Plus/Pro subscription quota
- Codex subscription or Codex product quota
- Claude Pro/Max subscription quota
- Claude Code subscription quota

Product copy must clearly state that the application only supports user-owned developer API keys, not consumer subscriptions or coding tool subscriptions.

## User API Key Management

The project uses a BYOK model: Bring Your Own Key.

Security requirements:

- User API keys may only be submitted to the server.
- The browser must not call model providers directly.
- The database must never store plaintext API keys.
- The server must encrypt API keys with `MASTER_ENCRYPTION_KEY` before storing them.
- Prefer an authenticated encryption scheme such as AES-256-GCM.
- Each stored key must use an independent IV or nonce.
- The client may only display a key hint, such as `...abcd`.
- Full API keys must never be returned to the client.
- Logs must never include API keys, request headers, full upstream error objects, or sensitive payloads.
- Users must be able to delete, replace, and re-validate their own keys.
- Even though model costs are paid through user-owned keys, the platform must still rate-limit recommendation calls.

Default data flow:

```text
User logs in
  -> User selects a model provider in settings
  -> User submits their own API key
  -> Server validates the key
  -> Server encrypts and stores the key
  -> Recommendation API decrypts the key
  -> Server calls the selected model provider
  -> Server validates and normalizes the structured JSON result
  -> Server saves the recommendation result
  -> Server returns the result to the client
```

## Initial Database Model

Start with these tables:

```text
users
  id
  clerk_user_id
  created_at
  updated_at

user_model_keys
  id
  user_id
  provider
  encrypted_api_key
  key_hint
  default_model
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
  provider
  model
  locale
  effective_preferences_json
  input_json
  result_json
  error_code
  created_at
```

Data modeling requirements:

- Every business record must belong to the current authenticated user.
- Long-term preferences and per-request temporary overrides must stay separate.
- Temporary overrides affect only the current recommendation and must not be written back to long-term preferences automatically.
- User preferences must store the default locale.
- A single recommendation request may temporarily override the output locale.
- Recommendation history must preserve the provider and model used at generation time.
- Recommendation history must preserve the effective preference snapshot and locale used at generation time.
- Model keys may become invalid, be replaced, or be deleted without breaking historical recommendation records.

## API Boundaries

Recommended endpoints:

```text
GET    /api/model-keys
POST   /api/model-keys
PATCH  /api/model-keys/:id
DELETE /api/model-keys/:id
POST   /api/model-keys/:id/validate
POST   /api/recommend
GET    /api/recommendations
GET    /api/preferences
PUT    /api/preferences
```

API requirements:

- All APIs require authentication by default unless they are explicitly public.
- Every user-data query must be filtered by the current authenticated user.
- `/api/recommend` must confirm that the current user has a valid configured key before calling a model provider.
- `/api/recommend` must merge long-term user preferences with per-request temporary overrides and save the effective preference snapshot.
- `/api/recommend` must require structured JSON from the model and validate the result shape on the server.
- `/api/recommend` must include the current user locale or per-request locale in the prompt and require user-visible text fields to use that language.
- `/api/recommend` must not use streaming in the first version. It must parse the model response, validate the schema, and write recommendation history before returning.
- Missing model key errors must return a stable business error code that lets the client route the user to model settings.
- Upstream provider errors must be mapped to safe business errors.
- Do not expose full upstream responses to the client.
- If the model response cannot be parsed or does not match the schema, return a safe business error and allow the client to suggest retrying.

## Lightweight Rate Limiting

The first version must include lightweight rate limiting.

Default strategy:

- Rate-limit `/api/recommend` by Clerk user id.
- Default to at most 5 recommendation requests per user per minute.
- Consider a daily soft limit, such as 100 recommendation requests per user per day.
- Return a stable business error code such as `RATE_LIMITED` when the limit is hit.
- Rate-limited requests must not consume the user's model API key.

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

If provider SDKs are used, do not configure platform-owned model API keys. This product uses user-owned API keys only.

## Implementation Principles

- Prioritize the smallest deployable loop: login, key configuration, recommendation generation, and history.
- Do not add too many providers, complex plans, team workspaces, or billing systems in the first version.
- Do not scatter provider call logic across API handlers. Use provider adapters.
- Do not expose key decryption details, provider base URLs, or full upstream error details to the client.
- Do not implement arbitrary custom base URLs unless the security boundary is re-evaluated.
- Every new provider must include model allowlists, validation logic, error mapping, and tests.
- All source code and code comments must be written in English.
