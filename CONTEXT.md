# What-to-Eat Context

This context defines the refrigerator recommendation MVP and keeps production and local-development generation boundaries explicit.

## Language

**User**:
A person authenticated through Clerk who owns all application data created under their Clerk user id.

**OpenAI API Key**:
A user-owned OpenAI developer API key used by the deployed application for OpenAI model requests.
_Avoid_: ChatGPT subscription, Codex subscription, consumer quota

**Fridge Item**:
A user-owned ingredient inventory row stored as a natural-language name, positive numeric quantity, and free-text unit such as `2 tomatoes`, `one bunch of water spinach`, or `3 portions of rice`.

**Long-Term Preferences**:
The user's saved natural-language food preference text and default locale.

**Temporary Requirement**:
Per-request natural-language guidance that affects exactly one recommendation generation and is never persisted.

**Meal Recommendation**:
A lightweight history record for one generation event. It stores locale, fixed text model id, generation mode, candidate count, and generated dishes. It can be deleted by the owning user.

**Recommended Dish**:
A persisted dish candidate with a name, summary, instructions, estimated minutes, and an optional dish-image reference. It can be deleted from history by the owning user.

**Consumption Suggestion**:
An ephemeral, editable proposal for decrementing fridge items after the user selects a dish. It includes the fridge item id, current version, unit, and consumed quantity. It is never written to recommendation history.

**Generated Image**:
A user-owned image-generation record for an ingredient or dish. It stores the fixed model id, generation mode, status, public Vercel Blob URL when successful, and a safe error code when failed.

**Production OpenAI Mode**:
The deployed generation mode that uses a user's OpenAI developer API key for fixed OpenAI text and image requests.

**Local Codex Mode**:
A local-development-only generation mode that uses locally authenticated Codex access for structured text validation and local image attempts.
Image attempts use a constrained temporary PNG file-output bridge, then the application removes the chroma-key background before Blob upload.
_Avoid_: Production fallback, deployed Codex provider

## Relationships

- A **User** owns at most one **OpenAI API Key** and at most one **Long-Term Preferences** record.
- A **User** owns zero or more **Fridge Items**, **Meal Recommendations**, and **Generated Images**.
- Matching **Fridge Items** merge when their normalized names and normalized free-text units match.
- Renaming a **Fridge Item** requests a new ingredient image. Quantity or unit changes do not.
- A **Meal Recommendation** owns one to five **Recommended Dishes**.
- Each **Recommended Dish** may reference one **Generated Image**.
- Every generated dish immediately attempts dish-image generation. Image failure preserves the text dish and can be retried from history.
- Deleting a **Meal Recommendation** deletes its **Recommended Dishes** and their current dish **Generated Images**.
- Deleting a **Recommended Dish** deletes its current dish **Generated Image**. If it was the last dish in the **Meal Recommendation**, the parent history record is deleted too.
- A **Consumption Suggestion** is returned to the browser only. Confirming one dish applies all edited decrements atomically using fridge-item versions.
- **Temporary Requirements**, **Consumption Suggestions**, fridge snapshots, and preference snapshots are intentionally absent from history.
- **Production OpenAI Mode** uses an **OpenAI API Key**.
- **Local Codex Mode** is available only during local development and never supplies deployed application quota. Local image failures preserve text recommendations and become ordinary retryable image failures.

## Example Dialogue

> **Dev:** "Should recommendation history preserve the exact fridge snapshot and temporary request?"
> **Domain expert:** "No. History is intentionally lightweight. Persist generated dishes and image references only. Unconfirmed consumption suggestions disappear when the user leaves the page."

## Flagged Ambiguities

- "preferences" previously meant structured restrictions, dislikes, budget, and location fields. Resolved: the MVP stores one long-term natural-language `preference_text`.
- "recommendation history" previously implied request, preference, result, and image metadata snapshots. Resolved: the MVP stores recommendation headers plus normalized dish rows and image references only.
- "Local Codex image validation" previously implied generated image bytes were available directly from `@openai/codex-sdk`. Resolved: structured text works locally; image attempts use a temporary PNG file-output bridge and remain fail-safe when local image capability is unavailable.
