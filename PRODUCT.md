# What to Eat

## Register

`product`

## Product

What to Eat is an authenticated refrigerator recommendation application deployed on Vercel. It helps home cooks turn the ingredients they already have into a small set of practical dishes, then safely updates refrigerator quantities after the user confirms consumption.

## Users

- Home cooks who want a quick answer to "what can I cook now?"
- Chinese- and English-speaking users managing a lightweight household inventory
- Users who bring their own OpenAI developer API key and expect it to remain private

## Purpose

Make the path from refrigerator inventory to a cooked meal feel clear, friendly, and reversible: review ingredients, ask for one to five dishes, compare them, confirm one dish, and update inventory atomically.

## Product Boundaries

- Clerk authentication with Google and GitHub login
- OpenAI-only BYOK; never use a platform-owned key
- Fixed text model `gpt-5.5` and image model `gpt-image-2`
- Chinese and English locale routes, with Chinese as the default
- Vercel Blob for generated images and Postgres for safe references and statuses
- Lightweight history without refrigerator, preference, requirement, or consumption snapshots
- Local Codex Mode remains opt-in, server-only, local-development-only, and fail-closed elsewhere

## Brand Personality

Playful, cute, hand-drawn, appetizing, and reassuring. The interface should feel like a lively kitchen notebook built for real repeated work, not a decorative recipe poster. A small cook character appears only when a state benefits from warmth: onboarding, empty, loading, and success states.

## Anti-References

- Generic SaaS dashboards, glassmorphism, neon gradients, and floating decorative blobs
- Endless cream paper cards, ribbons, stickers, and textures competing for attention
- AI-generated "cute kitchen" visual noise with inconsistent illustration styles
- Sketchy SVG decoration, oversized marketing typography, and nested cards
- Hidden system status, ambiguous destructive actions, and motion without state meaning

## Design Principles

1. Task first: inventory, recommendation, comparison, and confirmation remain visually dominant.
2. Draw with discipline: use one outline, shadow, radius, spacing, and illustration grammar.
3. Make state visible: loading, empty, success, failure, retry, dirty, and busy states must never be inferred.
4. Keep risk reversible: destructive actions require clear intent and protected confirmation.
5. Preserve language and access: all UI copy lives in i18n resources and meets WCAG 2.2 AA.

## Accessibility

Target WCAG 2.2 AA. Body and placeholder text meet 4.5:1 contrast, large text meets 3:1, keyboard focus is always visible, mobile targets are at least 44px, dialogs trap and restore focus, and meaningful motion respects `prefers-reduced-motion`.
