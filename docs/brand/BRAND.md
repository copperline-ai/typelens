# typelens Brand Guidelines

> Version 1.0 — 2026-05-16

typelens is the Typesense dashboard product from Copperline AI. The brand communicates
precision, intelligence, and search capability — a modern developer tool that is clean,
approachable, and technically credible.

---

## 1. Logo

### Logomark

The typelens icon is a magnifying glass with a network visualization inside the lens.
The lens contains three concentric rings and a three-node network graph, representing
data intelligence and search. The handle has two grip bands.

**Files**

| File | Use |
|---|---|
| `public/logo.svg` | Full wordmark (icon + text). Primary logo. |
| `public/icon.svg` | Icon only. Navigation, app headers, social avatars. |
| `public/favicon.svg` | Browser favicon. |

### Wordmark

The wordmark is set in **Space Grotesk SemiBold (600)**, lowercase:

- `type` — Metallic Blue `#0067a3`
- `lens` — Vibrant Teal `#00d2da`

The split-color treatment reinforces the product name's two concepts: *type* (data/schema)
and *lens* (magnifying search).

### Clear Space

Always maintain a minimum clear space equal to the height of the lowercase "t" around all
sides of the logo. Do not place other elements within this zone.

### Minimum Sizes

| Context | Min width |
|---|---|
| Full wordmark | 120px |
| Icon only | 20px |
| Favicon | 16px |

### Logo on Dark Backgrounds

The logo renders correctly on dark backgrounds without modification — the teal and blue
palette has sufficient luminance contrast. On backgrounds darker than `#001a2e`, increase
opacity of the outer light-blue ring to 100% for visibility.

### Dos and Don'ts

**Do:**
- Use the approved SVG files at all times
- Maintain the two-color wordmark split at `type` / `lens`
- Use on white, very light grey, or deep navy backgrounds

**Don't:**
- Recolor the wordmark or icon
- Rotate, skew, or distort any element
- Use a drop shadow on the logo
- Place the full wordmark below 120px wide
- Recreate the logo in a different font

---

## 2. Color System

### Brand Palette

| Name | Hex | Role |
|---|---|---|
| Vibrant Teal | `#00d2da` | Primary accent, inner network, CTA highlights |
| Metallic Blue | `#0067a3` | Main lens body, wordmark "type", interactive elements |
| Deep Blue | `#00457e` | Handle, dark surface brand color, sidebar bg |
| Light Blue | `#7ec8e3` | Outer rings, hover states, subtle backgrounds |
| Black | `#000000` | Handle grips, text on light backgrounds |

### Semantic Tokens (CSS custom properties)

```css
--brand-teal:       #00d2da;   /* primary accent */
--brand-teal-deep:  #00b5bc;   /* hover/pressed state of teal */
--brand-blue:       #0067a3;   /* interactive blue */
--brand-blue-light: #7ec8e3;   /* soft accents */
--brand-blue-deep:  #00457e;   /* deep brand blue */
```

Access in Tailwind via `bg-brand-teal`, `text-brand-blue`, etc. (mapped in `@theme inline`
in `globals.css`).

### shadcn/ui Semantic Mapping

| Token | Light | Dark |
|---|---|---|
| `--primary` | Metallic Blue (#0067a3) | Vibrant Teal (#00d2da) |
| `--accent` | Vibrant Teal (#00d2da) | Vibrant Teal (#00d2da) |
| `--ring` | Vibrant Teal (#00d2da) | Vibrant Teal (#00d2da) |
| `--secondary` | Light Blue tint | Deep Blue tint |

### Color Usage Rules

1. **Vibrant Teal** is reserved for interactive focus states, active indicators, primary CTAs,
   and data highlights. Use sparingly — it carries visual weight.
2. **Metallic Blue** is the workhorse blue. Use for buttons, links, and interactive chrome.
3. **Deep Blue** works as a dark surface (sidebar, nav, dark mode background).
4. **Light Blue** is for background fills, hover states, and subtle UI chrome.
5. **Black** is for body text on light backgrounds only. Never use pure black on teal.

### Accessible Pairs

| Foreground | Background | WCAG Ratio | Level |
|---|---|---|---|
| `#ffffff` | `#0067a3` | 5.2:1 | AA |
| `#ffffff` | `#00457e` | 8.1:1 | AAA |
| `#000000` | `#7ec8e3` | 5.8:1 | AA |
| `#000000` | `#00d2da` | 4.5:1 | AA |

**Do not** place white text on `#7ec8e3` (Light Blue) — contrast ratio is below AA.

---

## 3. Typography

### Typefaces

| Role | Family | Weights |
|---|---|---|
| Brand / Display | Space Grotesk | 600 (SemiBold), 700 (Bold) |
| UI Body | Inter | 400 (Regular), 500 (Medium), 600 (SemiBold) |
| Code / Data | JetBrains Mono | 400, 500 |

All three are loaded via Google Fonts in `apps/dashboard/app/layout.tsx`.

### Type Scale

| Label | Size | Weight | Family | Use |
|---|---|---|---|---|
| Display | 32–48px | 700 | Space Grotesk | Hero headlines, marketing |
| Heading 1 | 28px | 600 | Space Grotesk | Page titles |
| Heading 2 | 22px | 600 | Space Grotesk | Section titles |
| Heading 3 | 18px | 600 | Inter | Sub-section labels |
| Body | 15px | 400 | Inter | General UI text |
| Small | 13px | 400 | Inter | Secondary labels, captions |
| Mono | 13–14px | 400 | JetBrains Mono | Code, JSON, query results |

### Letter Spacing

- Display and headings: `letter-spacing: -0.02em` (tight, geometric feel)
- Body: `letter-spacing: 0` (default)
- Mono: `letter-spacing: 0` (default)

### Line Heights

- Headings: `1.15`
- Body: `1.6`
- Code: `1.5`

---

## 4. Iconography

Use the **Lucide** icon set (already a project dependency via shadcn/ui). Lucide's clean
stroke style aligns with the typelens aesthetic.

- Stroke width: `1.5px`
- Size: `16px` (inline), `20px` (buttons), `24px` (feature icons)
- Color: inherit from text or use `--brand-teal` for interactive icons

---

## 5. Spacing and Layout

- Base unit: `4px`
- Use Tailwind spacing scale (`p-2` = 8px, `p-4` = 16px, etc.)
- Corner radius: `--radius: 0.5rem` (8px) for cards and inputs; `--radius-sm: 0.25rem` for
  tight elements like badges
- Prefer clean whitespace — developer tools feel cluttered when information density is too high

---

## 6. Motion

- Transitions: `150ms ease-out` for hover states
- Page transitions: `200ms ease-in-out`
- Avoid decorative animations. Motion should communicate state change, not style.

---

## 7. Voice and Tone

typelens communicates like a senior developer who is helpful but direct:

- **Concise.** No unnecessary words.
- **Technical.** Uses correct terminology (collection, schema, document, facet).
- **Non-patronizing.** Users are developers — no "Are you sure?" for reversible actions.
- **Lowercase product name.** Always `typelens`, never `TypeLens` or `TYPELENS`.
