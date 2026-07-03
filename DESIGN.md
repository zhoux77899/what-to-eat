# What to Eat Design System

## Direction

Strong hand-drawn product UI with a lively, cute tone and restrained character use. The hand-drawn language applies across every route, while task density and hierarchy remain appropriate for a repeat-use tool.

## Visual Grammar

- One dark ink outline, usually 1.5-2px
- Corner radii between 6px and 8px
- Small hard shadows offset by 2-3px; no wide soft shadows
- Irregularity comes from selected border and illustration details, not warped text or unstable layout
- Large surfaces are quiet; texture is reserved for the home scene and rare state illustrations
- Existing raster logo and kitchen artwork are the brand anchors
- The cook character appears only in onboarding, empty, loading, and success feedback

## Color Tokens

All authored colors use OKLCH semantic custom properties.

- `--color-kitchen`: light neutral kitchen background
- `--color-surface`: primary work surface
- `--color-paper`: warm secondary surface
- `--color-ink`: primary text and outline
- `--color-ink-muted`: secondary text that still meets contrast
- `--color-primary`: vegetable green for primary action and selection
- `--color-primary-strong`: pressed and high-contrast green
- `--color-danger`: tomato red for destructive action and errors
- `--color-warning`: yolk yellow for warnings and pending states
- `--color-info`: cool blue-green for informational feedback

The palette must not read as monochrome cream. Green, tomato, yolk, ink, and cool feedback colors each have a defined job.

## Typography

Use one system sans stack for Chinese and English UI. The raster logo carries display personality. Product headings are compact, bold, and letter-spaced at zero; hero-scale text is reserved for the home brand lockup.

## Layout

- Desktop: top navigation, constrained 1180px work area, scan-friendly rows and grids
- Mobile: compact header and fixed bottom navigation for Recommend, Fridge, History, and More
- More exposes Preferences, OpenAI Key, language, and account actions
- Fixed-format controls use stable dimensions so labels, icons, and status changes do not shift layout
- Mobile content reserves safe space for the bottom navigation

## Components

- Buttons: primary green, neutral secondary, quiet icon, and tomato danger variants
- Fields: visible labels, persistent help/error area, strong focus ring, 44px mobile height
- Panels: unframed page bands for sections; cards only for repeated dishes and modal tools
- Status: compact outlined badges and full-width feedback bars with icon, title, and action
- Images: fixed aspect ratio with pending, succeeded, failed, and retry states
- Steppers: labeled minus/input/plus controls with stable dimensions and accessible names
- Skeletons: quiet ink-tinted blocks that preserve final geometry

## Motion

Use 150-250ms transitions for hover, press, focus, disclosure, and state replacement. Avoid continuous floating, parallax, layout-shifting entrance motion, and decorative looping. Reduced-motion mode removes non-essential transitions.

## Prohibited Patterns

No gradients, glassmorphism, bokeh, decorative blobs, stacked soft shadows, repeated paper-card nesting, sketchy generated SVG art, negative letter spacing, or viewport-scaled typography.
