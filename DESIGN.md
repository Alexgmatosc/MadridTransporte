---
name: MadridTransporte
description: Clean, high-contrast transit system designed for iOS PWA and iPhone 14.
colors:
  # Transit Brand Anchors
  metro-red: "oklch(55% 0.22 28)"           # Metro de Madrid primary
  metro-red-dark: "oklch(45% 0.20 28)"      # Metro pressed state
  emt-blue: "oklch(48% 0.18 250)"           # EMT Madrid primary
  emt-blue-dark: "oklch(40% 0.16 250)"      # EMT pressed state

  # iOS Semantic Surfaces (Light)
  system-bg-light: "oklch(96% 0.005 260)"   # iOS secondary system background
  card-bg-light: "oklch(100% 0 0)"          # Pure white card surface
  separator-light: "oklch(90% 0.005 260)"   # Hairline divider
  text-primary-light: "oklch(15% 0.01 260)" # Deep black text
  text-muted-light: "oklch(50% 0.01 260)"   # Secondary label

  # iOS Semantic Surfaces (Dark)
  system-bg-dark: "oklch(10% 0.01 260)"     # Pure deep dark ground
  card-bg-dark: "oklch(16% 0.01 260)"       # Raised panel / cell surface
  separator-dark: "oklch(24% 0.01 260)"     # Subtle dark hairline
  text-primary-dark: "oklch(98% 0 0)"       # Crisp white text
  text-muted-dark: "oklch(68% 0.01 260)"    # Secondary light label

  # Live Arrival Status
  status-imminent: "oklch(62% 0.19 145)"    # Arrival < 3 min (Emerald)
  status-normal: "oklch(55% 0.15 250)"      # Arrival 3-10 min (Blue)
  status-delayed: "oklch(65% 0.16 75)"      # Warning / Wait > 15 min (Amber)

typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
  badge:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1

rounded:
  none: "0"
  xs: "4px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  sheet: "20px"
  pill: "9999px"

spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  "2xl": "24px"

components:
  search-bar:
    backgroundColor: "{colors.card-bg-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.md}"
    height: "44px"
  segmented-control:
    backgroundColor: "{colors.separator-light}"
    rounded: "{rounded.sm}"
    padding: "2px"
  arrival-row:
    rounded: "{rounded.none}"
    padding: "12px 16px"
---

# Design System: MadridTransporte (iOS HIG Edition)

## 1. Overview
A purpose-built, distraction-free transit interface designed specifically for one-handed operation on iPhone 14. Modeled after the highest standards of Apple Maps and native iOS system apps.

## 2. Colors
- **Metro de Madrid Red** (`oklch(55% 0.22 28)`): Primary brand accent for metro routes, train badges, and metro arrivals.
- **EMT Madrid Blue** (`oklch(48% 0.18 250)`): Primary brand accent for bus routes, stop headers, and EMT badges.
- **Strict Neutral Ground**: High-contrast, clean surfaces without artificial purple/cyan neon washes.

## 3. Typography
- Standard system stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui`.
- **Tabular Numerals**: Arrival times and stop IDs must use `tabular-nums` (`font-variant-numeric: tabular-nums`) so numbers do not jump or jitter during live refreshes.
- **Input Floor**: All search inputs must use `font-size: 16px` (`1rem`) to prevent iOS Safari auto-zoom.

## 4. Layout & Grouped Inset Lists
- Replaces nested cards with Apple-style **Grouped Inset Lists**: rounded rectangle panel (`rounded-xl` or `16px`) with grouped items separated by 1px hairlines indented to match the text leading edge.
- Safe Area Insets: `pt-safe` and `pb-safe` using `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.

## 5. Elevation & Depth
- **Hairline First**: 1px subtle borders (`oklch(90% 0.005 260)` in light, `oklch(24% 0.01 260)` in dark) replace heavy card drop-shadows.
- **Materials**: Native iOS blur for headers, navigation bars, and bottom sheets (`backdrop-filter: blur(20px)` with 80% opacity ground).

## 6. Shapes & Touch Ergonomics
- Minimum touch target: 44x44 pt.
- Sheet radius: 20px on top corners (`rounded-t-[20px]`).

## 7. Do's and Don'ts
### Do
- Do prioritize real-time countdown minutes as the most prominent element.
- Do keep the search bar anchored within immediate reach of the user's thumb.
- Do support smooth swipe-to-dismiss on bottom sheets.
- Do test in both iOS Light and Dark mode.

### Don't
- Do NOT use kicker/eyebrow chips above headings.
- Do NOT nest cards inside cards.
- Do NOT use `animate-bounce` or dated bouncy easings.
- Do NOT use purple-to-blue gradients or glowing neon shadows.
- Do NOT set input font sizes below 16px.
