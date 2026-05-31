# What-to-Eat Context

This context defines the language for generating meal recommendations and optional meal images while keeping production and local-development generation boundaries explicit.

## Language

**User**:
A person authenticated through Clerk who owns all application data created under their Clerk user id.

**OpenAI API Key**:
A user-owned OpenAI developer API key used by the deployed application for OpenAI model requests.
_Avoid_: ChatGPT subscription, Codex subscription, consumer quota

**Meal Recommendation**:
A structured JSON result describing what a user could eat based on their effective food preferences and active locale.

**Meal Image**:
An optional image generated for a meal recommendation.

**Long-Term Preferences**:
The user's saved food preferences that persist across recommendation requests.

**Temporary Overrides**:
Per-request preference changes that influence only the current meal recommendation.

**Recommendation History**:
The user's saved record of generated meal recommendations and their generation context.

**Production OpenAI Mode**:
The deployed generation mode that uses a user's OpenAI API key for GPT text and image requests.

**Local Codex Mode**:
A development-only generation mode that uses a developer's locally authenticated Codex access for GPT text and image validation.
_Avoid_: Production fallback, deployed Codex provider

## Relationships

- A **User** owns at most one **OpenAI API Key**.
- A **User** owns at most one **Long-Term Preferences** record and zero or more **Recommendation History** records.
- **Temporary Overrides** affect exactly one **Meal Recommendation** and do not modify **Long-Term Preferences** automatically.
- A **Meal Recommendation** may have one **Meal Image**.
- **Production OpenAI Mode** uses an **OpenAI API Key**.
- **Local Codex Mode** is available only during local development and never supplies deployed application quota.

## Example dialogue

> **Dev:** "Can a deployed user select Codex instead of entering an OpenAI API key?"
> **Domain expert:** "No. Deployed requests use **Production OpenAI Mode**. **Local Codex Mode** exists only for local development validation."

## Flagged ambiguities

- "subscription support" was used to mean both deployed product quota and local development access. Resolved: consumer subscriptions never supply deployed quota, while locally authenticated Codex access may be used only by **Local Codex Mode**.
- "provider" was used to imply a user-selectable multi-provider product. Resolved: version one is OpenAI-only in production and exposes no provider picker.
