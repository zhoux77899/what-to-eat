# UI Redesign Render Evidence

This folder keeps reproducible visual evidence for the full-site UI redesign.

## Baseline

- `renders/baseline-home-desktop.png`: original Chinese home page at 1440 x 900, captured from the untouched application on port 3000.

## Final Public Surfaces

- `renders/final-home-desktop.png`: redesigned Chinese home page at 1440 x 900.
- `renders/final-home-tablet-1024.png`: redesigned Chinese home page at 1024 x 768.
- `renders/final-home-mobile-zh.png`: redesigned Chinese home page at 390 x 844.
- `renders/final-home-mobile-en.png`: redesigned English home page at 360 x 800.
- `renders/visual-companion-board.png`: desktop and mobile app shell, workbench, form, recommendation, and state samples rendered from the companion board.

Authenticated routes remain protected by Clerk. Their loading, empty, error, busy, image-failure, and long-copy contracts are represented in the companion board and covered by component and source-contract tests without weakening authentication. `tests/e2e/authenticated.spec.ts` exercises fridge editing and focus restoration, recommendation and consumption confirmation, history retry and deletion, preferences, and API key deletion across all four target viewports when `E2E_CLERK_STORAGE_STATE` points to a legitimate Clerk test-user storage state.
