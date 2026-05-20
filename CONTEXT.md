# Context Glossary

## User

A person authenticated through Clerk who owns all application data created under their Clerk user id.

## OpenAI API Key

A user-owned OpenAI developer API key submitted to the server for encrypted storage and later use in model requests. Consumer subscriptions are not OpenAI API keys.

## Meal Recommendation

A structured JSON result describing what a user could eat based on their effective food preferences and active locale.

## Meal Image

An optional image generated for a meal recommendation. The image uses metadata in recommendation history; raw image bytes are not part of the core history record.

## Long-Term Preferences

The user's saved food preferences that persist across recommendation requests.

## Temporary Overrides

Per-request preference changes that influence only the current meal recommendation and are not written back into long-term preferences automatically.

## Recommendation History

The user's saved record of generated meal recommendations, including the model ids, locale, input snapshot, effective preferences, result JSON, optional image metadata, and any safe business error code.
