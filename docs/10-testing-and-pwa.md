### E2E & PWA Notes

E2E (Playwright)
- Minimal smoke test added in `tests/e2e/scoreboard.spec.ts` to ensure the app loads
- Extend once a route renders the optional scoreboard layouts

PWA (Optional)
- `public/manifest.json` and `public/sw.js` added
- Registration guarded by `NEXT_PUBLIC_ENABLE_PWA` in `src/app/layout.tsx`
- Default is inert; set `NEXT_PUBLIC_ENABLE_PWA=true` to enable


