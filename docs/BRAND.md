# typelens Brand Guide

## Overview

typelens is a high-tech, sleek dashboard for Typesense. The visual identity is anchored by a magnifying glass motif with a blue-teal technology palette — precision, clarity, and depth.

**Tagline:** See your search clearly.

---

## Color Palette

The colorway is composed of shades of blue and deep black, creating a high-tech and sleek appearance.

| Name | Hex | Usage |
|------|-----|-------|
| Vibrant Teal | `#00d2da` | Inner ring, central network highlights, focus rings, primary action (dark mode) |
| Metallic Blue | `#0067a3` | Main body of the magnifying glass, primary action (light mode) |
| Deep Blue | `#00457e` | Handle — strong structural color, secondary / dark backgrounds |
| Light Blue | `#7ec8e3` | Soft outer rings, network accents, muted highlights |
| Black | `#000000` | Grips on handle, background base |

### OKLCH equivalents (Tailwind v4)

```
Vibrant Teal  → oklch(0.762 0.127 195.8)
Metallic Blue → oklch(0.446 0.118 244.2)
Deep Blue     → oklch(0.312 0.098 248.3)
Light Blue    → oklch(0.789 0.070 212.7)
Black         → oklch(0 0 0)
```

### CSS Custom Properties

All brand colors are exposed as CSS custom properties:

```css
--brand-teal:       #00d2da;
--brand-blue:       #0067a3;
--brand-deep-blue:  #00457e;
--brand-light-blue: #7ec8e3;
--brand-black:      #000000;
```

---

## Semantic Color Tokens (Tailwind / shadcn)

The Tailwind theme maps brand colors into the shadcn semantic token system.

### Light Mode

| Token | Value | Brand Color |
|-------|-------|-------------|
| `--primary` | `#0067a3` | Metallic Blue |
| `--primary-foreground` | white | — |
| `--accent` | `#00d2da` | Vibrant Teal |
| `--accent-foreground` | `#000000` | Black |
| `--secondary` | `#e8f6fb` | Light Blue tint |
| `--secondary-foreground` | `#00457e` | Deep Blue |
| `--ring` | `#00d2da` | Vibrant Teal |
| `--background` | white | — |
| `--foreground` | `#000000` | Black |

### Dark Mode

| Token | Value | Brand Color |
|-------|-------|-------------|
| `--primary` | `#00d2da` | Vibrant Teal |
| `--primary-foreground` | `#000000` | Black |
| `--accent` | `#0067a3` | Metallic Blue |
| `--accent-foreground` | white | — |
| `--secondary` | `#00457e` | Deep Blue |
| `--secondary-foreground` | `#7ec8e3` | Light Blue |
| `--background` | `#05111e` | Near-black blue |
| `--foreground` | `#e8f5fb` | Light Blue tint |

---

## Typography

| Role | Font | Fallback |
|------|------|----------|
| UI / sans | System UI (`font-sans`) | ui-sans-serif, system-ui |
| Monospace | System mono (`font-mono`) | ui-monospace, monospace |

Preferred display font for marketing contexts: **Space Grotesk** (not yet installed in app).

---

## Logo Concept

The typelens logo depicts a magnifying glass with concentric rings and a central network node pattern.

- Outer rings: Light Blue `#7ec8e3`
- Body / lens frame: Metallic Blue `#0067a3`
- Inner ring / highlight: Vibrant Teal `#00d2da`
- Handle: Deep Blue `#00457e`
- Handle grips / dark accents: Black `#000000`

---

## Brand Voice

- **Precise** — direct, no fluff
- **Technical** — speaks to developers and data teams
- **Clear** — surfaces complexity without adding to it

---

## Usage Rules

1. Never use the teal on a light blue background — contrast is too low.
2. Primary call-to-action buttons use `--primary` with `--primary-foreground` text.
3. Destructive actions remain red (inherited `--destructive`) — do not override with brand colors.
4. Dark mode is the recommended default presentation for typelens.
