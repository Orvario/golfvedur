# Design System — Golfveður

<!-- impeccable:design-schema 1 -->

## World

Dark glass weather cockpit for Icelandic golfers. Deep night navy ground with luminous blue weather plates. Soft radii, metric rows, and glowing active hours — matching the approved reference mock.

## Palette

| Role | Value | Use |
|------|-------|-----|
| Ground | `#0B0C1E` | App background |
| Elevated | `#12132A` | Nested panels |
| Card | `rgba(255,255,255,0.06)` | List rows, glass chips |
| Border | `rgba(255,255,255,0.1)` | Hairlines |
| Text | `#FFFFFF` | Primary |
| Muted | `rgba(255,255,255,0.55)` | Secondary |
| Blue top | `#47BBE1` | Hero gradient start |
| Blue bot | `#0575E6` | Hero gradient end |
| Glow | `#00D2FF` | Active hour, accents |

Hero plates use `linear-gradient(165deg, #47BBE1 → #2B8FE8 → #0575E6)`, tuned per weather category via `getWeatherGradient`.

## Typography

- Face: **Manrope** (400–800)
- Display temp: ~72px / 800 / tracking −3
- Course titles: 15–16px / 700
- Metrics & data: tabular nums

## Shape & elevation

- Radius XL 36 · LG 28 · MD 18 · SM 12 · pill
- Hero shadow: soft blue-tinted drop (`0 18px 48px rgba(5,117,230,0.35)`)
- Active hour: blue border glow

## Components

- **Course list:** dark sticky header, glass search, translucent course rows with SVG weather glyph + temp + wind
- **Now hero:** rounded blue weather plate (icon, temp, condition, date, wind/humidity/rain), then “Í dag” hourly pills
- **Forecast:** tomorrow summary glass card + day rows + expandable hourly list/graph
- **Chrome:** frosted top bar, circular back/share, bottom tabs with glow indicator

## Iconography

Authored SVG weather glyphs (`WeatherGlyph`) with soft gradients and drop-shadow — not emoji for primary UI. Emoji retained only in share text fallbacks.

## Motion

- `gv-fade-up` on hero mount
- `gv-icon-float` on large weather glyph
- Respects `prefers-reduced-motion`

## Layout

Mobile-first, max content width ~430px centered. Safe-area aware bottom tabs.
