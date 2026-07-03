# UI Regression Repair Design

## Goal

Repair the twenty annotated UI regressions across the home, authentication, application shell, recommendation, refrigerator, history, preferences, and OpenAI key surfaces without changing product behavior or replacing the established kitchen-notebook design direction.

## Root Cause

The latest visual redesign moved the application styling from the former monolithic `globals.css` into `src/styles/redesign.css`. The new stylesheet preserved visual tokens but omitted several structural declarations that previously made shared controls behave correctly:

- paper buttons no longer establish an inline flex row;
- menu links and action rows no longer establish flex layout;
- the desktop More menu panel no longer leaves document flow;
- form-field labels no longer establish a vertical grid;
- account controls lost their intended layout;
- compact status badges lost padding and typographic sizing.

The repair must restore those shared structural contracts first, then apply page-specific changes only where the annotated behavior requires markup or state changes.

## Design Decisions

### Shared Controls

- Paper buttons render icon and label in one non-wrapping row with a consistent gap.
- Menu links render icon and label in one row.
- Action rows use flex layout with consistent spacing and wrapping when space is constrained.
- Form fields use a full-width vertical grid so labels and controls occupy separate rows.
- Compact status badges use a softer semantic border, compact typography, and balanced inline padding.
- Danger-button hover states retain dark danger text on a stronger soft-danger surface instead of switching to low-contrast white text.

### Home And Authentication

- The language switch and primary call-to-action retain their current placement and visual treatment while adopting the restored inline button contract.
- The Google and GitHub provider buttons restore the hand-drawn sticker SVGs from the pre-redesign repository history.
- The restored SVGs use the current design tokens and provider colors; no new illustration language is introduced.

### Application Shell

- The desktop More menu is positioned out of document flow and anchored to its trigger so opening it does not change header height.
- Desktop menu links use the shared horizontal link contract.
- The desktop More menu does not repeat the account control already shown at the right edge of the header.
- The mobile More menu keeps its account control because the header account action is hidden below the mobile breakpoint.
- The desktop account control becomes a compact chef nameplate: the username occupies its own text region and the Clerk avatar remains a clearly separated circular action.

### Recommendation Workspace

- Desktop layout mirrors the refrigerator workspace: recommendation results occupy the main left column and the request form occupies a 280–320 px right column.
- The request form follows normal page flow and is not sticky.
- The temporary-requirement textarea, candidate-count stepper, and Generate button each occupy one full-width row.
- Candidate count uses an accessible decrement/value/increment stepper constrained to the existing range of one to five dishes.
- The stepper buttons expose localized accessible names, and the current value remains visible as text.
- Tablet and mobile layouts collapse to one column with the request form before results.

### Refrigerator Workspace

- The form action row spans the form width. A single Add action fills the row; Edit and Cancel share the row when editing.
- Helper text gains explicit separation from the action row.
- Inventory rows gain horizontal padding so ingredient imagery does not touch the outer border.
- Image-status badges use the shared compact status treatment.
- Edit, retry, and delete controls use consistent borders and visible gaps.

### History Workspace

- Dish instructions use a quiet tinted disclosure row with a single one-pixel bottom divider instead of heavy two-pixel borders above and below.
- Timeline dots align to the vertical center of the generation-time summary row.
- Record deletion retains readable danger contrast in every interaction state.

### Preferences Workspace

- The workbench form fills the available content width.
- The description, preference label, textarea, and action area follow a vertical full-width layout.
- Initial loading renders the final form geometry immediately with its controls disabled and `aria-busy` state; no skeleton is rendered.
- Existing retry, save, success, and error behavior remains unchanged.

### OpenAI Key Workspace

- The form fills the available content width and uses consistent vertical gaps.
- Visible key-status and key-hint summaries are removed.
- Key status and key existence remain internal state because they determine whether Validate and Delete actions are enabled.
- Description, key field, actions, verification note, and error feedback remain visible and vertically separated.

## Accessibility And Localization

- All new user-facing accessible labels use the existing `next-intl` message resources in Chinese and English.
- Interactive controls retain a minimum 44 px target on mobile.
- Keyboard focus remains visible.
- Candidate count cannot move outside one to five.
- Loading forms prevent edits that could be overwritten by fetched data.
- Existing dialog focus restoration and destructive confirmations remain unchanged.

## Verification

- Add or update unit tests for restored shared layout contracts, the candidate-count stepper, preference loading without skeletons, desktop account de-duplication, and hidden OpenAI key summaries.
- Run `corepack pnpm lint`.
- Run `corepack pnpm test`.
- Run `corepack pnpm build`.
- Run `corepack pnpm test:e2e`.
- Run the Impeccable detector against the changed UI sources.
- Verify every annotated surface in the in-app browser at desktop and mobile widths in both Chinese and English where locale-dependent sizing matters.
- Confirm no horizontal overflow, header growth, unexpected layout shift, inaccessible hover state, or console error.

## Out Of Scope

- Product-domain changes, API changes, database changes, and authentication-flow changes.
- New visual themes, new raster assets, or replacement of the established brand artwork.
- Persistence of recommendation request data or candidate-count preferences.
