# Agent Instructions

## Repository Layout

- The application lives in `parkrail-web`; run all npm commands from that directory. Single Vite React app, not a monorepo; no CI, formatter, pre-commit, or codegen.
- Nearly all UI, state, booking, auth, and operator logic is in `parkrail-web/src/App.tsx` (~2.5k lines, includes `AuthModal` and `AdminPortal`). Styling is the single `src/App.css`. There are no component folders or route files.
- Navigation is React state (`viewMode`, `showDashboard`), not react-router, even though `react-router-dom` is a dependency. Don't assume URLs or links map to routes.
- `src/firebase.ts` exports `auth`, `db`, `isFirebaseConfigured`. Firebase is optional: the app must keep working with `auth`/`db` null using the hardcoded demo `lots` array in `App.tsx`.
- `parkrail-web/PROJECT_BLOCK_DIAGRAM.md` documents the same flows and is kept as the architecture reference.

## Commands

Run these from `parkrail-web`:

```bash
npm install
npm run dev        # Vite on port 5173 (tests hit 127.0.0.1:5173)
npm run lint       # oxlint via .oxlintrc.json, not eslint
npm run build      # tsc -b && vite build
npm run test:e2e   # playwright test
```

- `npm run build` typechecks first through project references (`tsconfig.app.json`, `tsconfig.node.json`). `noUnusedLocals`, `noUnusedParameters`, and `erasableSyntaxOnly` are enabled, so unused vars/params fail the build and enums, namespaces, and constructor parameter properties are not allowed.
- Single spec/filter: `npx playwright test tests/booking.spec.cjs -g "theme toggle"`.
- There is no unit test runner and no `npm test`; the Playwright specs in `tests/` are the only automated tests.
- There is no `playwright.config.*`. `tests/booking.spec.cjs` hardcodes `http://127.0.0.1:5173` and nothing starts the server, so run `npm run dev` first and keep it on port 5173.
- Install browsers once with `npx playwright install chromium`; without them every test fails with "Executable doesn't exist".
- The package sets `"type": "module"`, which is why the existing spec is `.cjs`; account for that when adding specs or a Playwright config.
- E2E specs assume a signed-out passenger using demo data; they never sign in or seed Firestore, and one asserts the persisted `data-theme` on `<html>` and the footer Discord/radio/assistant controls. Keep those labels and `localStorage` (`parkn-go:theme`, `parkn-go:last-booking`) intact or update the specs.

## Firebase

- Firebase is enabled only when all six `VITE_FIREBASE_*` variables are present; otherwise the app uses local demo parking data and local booking state. `VITE_UPI_MERCHANT_VPA` lives in the same file.
- `parkrail-web/.env` holds the live Firebase web config and is now gitignored along with `test-results/`; `.env.example` stays tracked. Never commit `.env`. Vite reads env at start/build, so restart `npm run dev` after changes, and set the same `VITE_*` values in the Vercel project for deployed builds.
- Project `parkngo-f218c` is configured in `.firebaserc` and `firebase.json` for Firestore only (rules + empty index file, no hosting/functions).
- Firestore collections are `parkingLots`, `reservations`, and `users`; app queries, rules, and seed data must use the same names and field shapes.
- Deploy rules with `npx firebase-tools@latest deploy --only firestore:rules --project parkngo-f218c`.
- `scripts/seed-firestore.mjs` needs a prior `firebase login` (it reads the CLI configstore token) and PATCHes fixed document IDs, so re-running it resets lot availability counters to seed values.

## Deployment

- Public site: `https://parkn-go-web.vercel.app` — Vercel project `parkn-go-web`, team `tanishs-projects-77dfa876`; the local link lives in `.vercel/project.json` (gitignored).
- Source: `https://github.com/PadalaTanish30/parkngo` on branch `main`; push with `git push`. The Vercel project was created from the CLI rather than imported from GitHub, so pushes do not trigger deployments.
- Deploy with `vercel deploy --prod --yes` from `parkrail-web`. `vercel.json` pins the Vite preset, `npm run build`, and `dist`.
- Vercel builds from uploaded source and reads `VITE_*` from the project's environment variables, not from `.env`. After changing `.env`, re-add each var with `vercel env add NAME production --value "$value" --force` and redeploy.
- `.vercelignore` must keep excluding `.env`, `.env.local`, `dist`, `test-results`, and `.vercel`: the CLI did not apply `.gitignore` to those uploads.
- Never put spaces around `=` in `.env`. Vite preserves leading spaces, and a space in `authDomain`/the API key silently breaks Firebase while the app still looks "configured".
- Email/password sign-in works from the Vercel domain; adding it under Firebase Auth authorized domains is only needed for OAuth or email-link sign-in.

## Booking Constraints

- The operator is a hardcoded UID repeated in `src/App.tsx` (`OPERATOR_UID`), `firestore.rules` (`isOperator`, `validParkingLot`, `validReservation`), and `scripts/seed-firestore.mjs` (`operatorId`). Change all three together; the operator portal renders nothing for any other account.
- Authenticated booking must stay a single `runTransaction`: read the lot, decrement the selected vehicle type, and create the reservation atomically. Reservations are created with `status: "pending"`, `paymentStatus: "initiated"`, and a 15-minute `paymentExpiresAt`; rules reject any other create values.
- Keep `available`/`availableTwoWheeler`/`availableFourWheeler` consistent with their totals; `firestore.rules` validates the sums and allows non-operator updates only when `available` drops by exactly 1. So passengers cannot restore capacity: cancelling a reservation changes only `status` and leaves capacity decremented, while the operator "payment failed" transaction restores it. Changing that flow requires a matching rule change.
- UPI is only a `upi://pay` deep link. Settlement is not verified automatically; operators update pending payments in the operator portal.
- Update related code together when changing reservation fields, payment states, parking-lot fields, or authorization: `src/App.tsx`, `firestore.rules`, and `scripts/seed-firestore.mjs`.

## Verification

- After application changes, run `npm run lint` and `npm run build` (both pass today; expect only Vite chunk-size warnings), then the relevant Playwright specs with the dev server already running.
- After Firestore rule changes, deploy the rules, confirm compilation succeeds, and exercise the affected flow before relying on the change.
- Playwright writes to `test-results/`, which is gitignored: don't commit those artifacts.
