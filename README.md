# ParkNGo

Station parking reservations near Hyderabad Metro and railway stations, with UPI deep-link checkout.

- **Live app:** https://parkn-go-web.vercel.app
- **App docs:** [parkrail-web/README.md](parkrail-web/README.md)
- **Architecture:** [parkrail-web/PROJECT_BLOCK_DIAGRAM.md](parkrail-web/PROJECT_BLOCK_DIAGRAM.md)

## Stack

React 19 + Vite, TypeScript, Firebase Authentication and Cloud Firestore, Leaflet maps, UPI `upi://pay` handoff. Firebase is optional: without `VITE_FIREBASE_*` values the app runs in local demo mode.

## Run locally

```bash
cd parkrail-web
npm install
npm run dev
```

Copy `parkrail-web/.env.example` to `.env` and fill in the Firebase web config to enable accounts and persisted bookings.

## Verify

```bash
cd parkrail-web
npm run lint
npm run build
npm run test:e2e   # Playwright; start `npm run dev` first
```

## Deploy

```bash
cd parkrail-web
vercel deploy --prod --yes
```

The Vercel project is not connected to this GitHub repository, so pushes do not deploy automatically.
