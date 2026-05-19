# Cockpit E2E smoke tests

Playwright tests that validate the ikigai-trade-os cockpit against UTP.

## One-time setup

Install Playwright as a dev dependency and download the Chromium binary:

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

Add the test script to `package.json` (manual edit; not committed automatically to avoid conflicting with pre-existing in-progress changes):

```json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

## Run

```bash
npm run test:e2e            # headless, CI-style
npm run test:e2e:ui         # interactive Playwright UI mode
BASE_URL=https://ikigaitradeos.netlify.app npm run test:e2e   # hit prod
```

## What's covered

- `engines-golden-path.spec.ts` -- loads `/engines`, checks the traffic-light
  banner renders one of the four states, asserts either engine rows are
  visible OR the "UTP unreachable" error UI is shown. Pass condition is
  graceful behavior in BOTH the UTP-up and UTP-down case so the test
  catches frontend regressions independently of backend health.

## Not yet covered (add when needed)

- Auth flow (Manus OAuth -> JWT exchange) -- gated on Phase A.4 deciding the auth contract
- HELIOS-specific tab (Phase 2 of HELIOS)
- WAGS allocation widget, position risk panel, premarket checklist (Phase B of consolidation)
