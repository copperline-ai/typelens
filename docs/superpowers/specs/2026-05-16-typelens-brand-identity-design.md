# typelens Brand Identity — Design Spec

**Date:** 2026-05-16
**Issue:** [COP-379](/COP/issues/COP-379)
**Parent:** [COP-378](/COP/issues/COP-378) — Create brand identity for typelens
**Author:** UX Designer (Paperclip agent 960a5a93)
**Status:** Ready for board review

---

## Context

typelens is the Typesense dashboard product. The brand must communicate:
- Modern developer tool aesthetic (clean, precise, technical)
- Search/intelligence capability
- Trustworthiness and professionalism

The board pre-approved the five-color palette. This spec records all design decisions
made to implement the complete brand identity from that palette.

---

## Approved Color Palette (Board-specified)

| Name | Hex | Assigned Role |
|---|---|---|
| Vibrant Teal | `#00d2da` | Primary accent, inner network nodes, CTA |
| Deep Blue | `#00457e` | Handle color, dark surfaces |
| Metallic Blue | `#0067a3` | Lens body, wordmark "type", interactive elements |
| Black | `#000000` | Handle grips, body text |
| Light Blue | `#7ec8e3` | Outer rings, soft backgrounds, hover states |

---

## Deliverable 1: Logo & Icon

### Design Approach

**Icon motif:** Magnifying glass with an internal network graph.
- Three concentric rings: Light Blue (outer glow), Metallic Blue (lens rim), Vibrant Teal (inner ring)
- Network graph inside the lens: three satellite nodes connected by lines to a central hub (all Vibrant Teal)
- Handle: Deep Blue with two Black grip bands
- The network graph inside the lens communicates "data intelligence inside the search" — a visual metaphor for Typesense's AI-search capability

**Wordmark:** `typelens` lowercase, Space Grotesk SemiBold
- `type` rendered in Metallic Blue — references schema/type system
- `lens` rendered in Vibrant Teal — references the magnifying glass, search
- Lowercase brand name treatment is standard for developer tools (linear, vercel, supabase, etc.)

### Files Delivered

| File | Location | Description |
|---|---|---|
| `icon.svg` | `apps/dashboard/public/icon.svg` | 32×32 viewBox icon |
| `favicon.svg` | `apps/dashboard/public/favicon.svg` | Browser favicon (identical to icon) |
| `logo.svg` | `apps/dashboard/public/logo.svg` | 220×48 full wordmark |

---

## Deliverable 2: Color System

### Implementation

Brand palette is implemented in `apps/dashboard/app/globals.css` as CSS custom properties:

```css
--brand-teal:       #00d2da;
--brand-teal-deep:  #00b5bc;
--brand-blue:       #0067a3;
--brand-blue-light: #7ec8e3;
--brand-blue-deep:  #00457e;
```

The shadcn/ui semantic tokens (`--primary`, `--accent`, `--ring`, `--secondary`) are updated
to use the brand palette rather than the default grey scale:

- Light mode: `--primary` = Metallic Blue, `--accent`/`--ring` = Vibrant Teal
- Dark mode: `--primary` = Vibrant Teal (inverted for visibility), `--accent` = Vibrant Teal

Dark mode background is tinted deep blue (`oklch(0.12 0.015 235)`) rather than neutral grey,
aligning with the brand's tech-blue palette.

---

## Deliverable 3: Typography

### Selection Rationale

| Family | Reason for choice |
|---|---|
| Space Grotesk | Geometric grotesque, modern and technical. Used by Vercel, Railway, and other developer platforms. Distinctive enough for brand use. |
| Inter | The de-facto developer UI font. Excellent legibility at small sizes; used by Linear, Notion, Supabase. |
| JetBrains Mono | Best-in-class code font. Familiar to the developer target audience. |

### Implementation

Fonts loaded via Google Fonts `<link>` tag in `apps/dashboard/app/layout.tsx`.
Body default set to `font-family: 'Inter', system-ui, sans-serif` in `globals.css`.
Code/pre elements set to `font-family: 'JetBrains Mono', 'Fira Code', monospace`.

---

## Deliverable 4: Brand Guidelines Document

Full guidelines at `docs/brand/BRAND.md`. Covers:
- Logo usage rules, clear space, minimum sizes, dos/don'ts
- Color system with semantic mapping and accessible pairs
- Type scale and hierarchy
- Iconography (Lucide, 1.5px stroke)
- Spacing and layout conventions
- Motion principles
- Voice and tone

---

## Deliverable 5: Favicon

Delivered as `public/favicon.svg` — same icon SVG as `icon.svg`.
Referenced in `layout.tsx` via `metadata.icons` so Next.js serves it automatically.

---

## Design Decisions and Trade-offs

| Decision | Rationale | Alternative considered |
|---|---|---|
| Network graph inside lens | Distinguishes from generic magnifying glass icons; communicates AI/search intelligence | Plain solid fill — rejected as too generic |
| Split-color wordmark (type/lens) | Subtle product storytelling; visually interesting without being gimmicky | Monochrome wordmark — acceptable but less distinctive |
| Space Grotesk for brand | Geometric and tech-aligned; not yet ubiquitous (avoids looking generic) | Manrope or DM Sans — both good but less distinctive |
| Lowercase "typelens" | Convention for developer tools; friendlier and less corporate | Title-case "TypeLens" — overridden by brand direction preference |
| Dark mode background blue-tinted | Reinforces brand even in dark mode; avoids default grey | Neutral dark — rejected as off-brand |

---

## Next Steps

1. Board review of this spec and the delivered files
2. Engineering to verify SVG assets render correctly in the app shell
3. Future: dark-mode logo variant (white wordmark + teal icon) for very dark backgrounds
4. Future: OG image / social card using brand colors
