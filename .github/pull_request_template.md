## Summary

<!-- Briefly describe what this PR changes and why. -->

## Scope

- [ ] Application code
- [ ] Documentation
- [ ] Database schema or migrations
- [ ] Authentication or authorization
- [ ] Model provider integration
- [ ] i18n resources
- [ ] Deployment or environment configuration
- [ ] Other:

## Product Boundary Checklist

- [ ] This change preserves the BYOK model. The platform does not add or rely on platform-owned model API keys.
- [ ] User API keys are never exposed to the browser, logs, or client responses.
- [ ] User-owned model calls remain server-side and authenticated.
- [ ] User data queries are scoped to the authenticated user.
- [ ] Recommendation results remain structured JSON when recommendation behavior is affected.
- [ ] Long-term preferences and per-request overrides remain separate when preference behavior is affected.
- [ ] `/api/recommend` remains non-streaming for the first version.
- [ ] Lightweight rate limiting is preserved for recommendation calls.

## i18n Checklist

- [ ] User-facing copy is not hard-coded in components.
- [ ] New or changed UI strings are added to translation resources.
- [ ] New or changed business error codes are mapped to supported locales.
- [ ] Model prompt changes explicitly control the output locale when user-visible text is generated.
- [ ] Structured JSON field names remain stable English identifiers.

## Security Checklist

- [ ] No secrets, API keys, tokens, or credentials are committed.
- [ ] No sensitive payloads, request headers, API keys, or full upstream error objects are logged.
- [ ] New server endpoints authenticate and authorize requests.
- [ ] Provider IDs, model names, and base URLs are validated against server-side allowlists.
- [ ] Database writes cannot modify another user's records.

## Verification

<!-- List commands run and the results. If a check was not run, explain why. -->

- [ ] Build:
- [ ] Lint:
- [ ] Tests:
- [ ] Type check:
- [ ] Manual verification:

## Deployment Notes

<!-- Mention new environment variables, migrations, Vercel settings, or rollout steps. Write "None" if not applicable. -->

