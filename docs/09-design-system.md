### Design System Audit (Phase 2 – Week 8, Day 1)

Scope: Standardize tokens and usage across shadcn/ui + Tailwind without breaking existing UI.

Key Tokens
- Colors (CSS variables; align with shadcn):
  - Primary: var(--primary) / var(--primary-foreground)
  - Secondary: var(--secondary) / var(--secondary-foreground)
  - Accent: var(--accent) / var(--accent-foreground)
  - Muted: var(--muted) / var(--muted-foreground)
  - Destructive: var(--destructive) / var(--destructive-foreground)
- Radius: var(--radius) with sizes sm/md/lg (2px/6px/10px)
- Spacing: 4px grid; use Tailwind scale (1 = 4px) and avoid arbitrary spacing where possible
- Typography scale (Tailwind defaults): text-xs/sm/base/lg/xl/2xl/3xl

Usage Guidelines
- Prefer shadcn/ui primitives for consistency; compose rather than restyle from scratch
- Avoid inline colors; prefer CSS variables or Tailwind token classes
- Keep SSR-safe boundaries; client-only interactive components should include `'use client'`

Scoreboard Theming Hooks
- Optional props on `Scoreboard`:
  - `homeColor`, `awayColor`, `homeLogoUrl`, `awayLogoUrl`
- Layouts (Stadium/TV/Mobile) pass through these props and compose `MatchTimer`

Accessibility (preview for next task)
- `aria-live="polite"` applied to timer; maintain focus order and contrast (≥ 4.5:1)

Non‑breaking Changes
- Tokens documented and available; existing components remain unchanged
- New optional props are additive and default safely


