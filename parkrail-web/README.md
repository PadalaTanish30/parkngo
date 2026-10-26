# ParkNGo

ParkNGo is a Hyderabad and Telangana station-parking reservation platform with separate passenger and parking-operator experiences. It focuses on parking near Hyderabad Metro and railway stations, with UPI as the primary payment method.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Passengers can use **Search spots**, choose a parking lot, and confirm a demo booking. Open **Operator portal** in the navigation to review occupancy, lots, and reservations.

## Free Firebase setup

1. Create a Firebase project on the Spark plan.
2. Enable Email/Password Authentication and Cloud Firestore.
3. Create a web app in Project settings.
4. Copy `.env.example` to `.env.local`.
5. Fill in the Firebase web configuration values.
6. Run the app again with `npm run dev`.

The Firebase client boundary is in `src/firebase.ts`. It intentionally stays optional so the presentation demo still works if the project is offline or credentials have not been added yet.

## Current MVP

- Responsive landing page and navigation
- Hyderabad Metro and railway station, arrival, and departure search controls
- Parking-lot cards with availability, price, distance, and amenities
- Multi-day reservation total calculation
- Full-day (06:00–22:00) and overnight (18:00–09:00) pricing
- UPI payment-app redirect with pending payment records
- Real scannable QR booking pass with vehicle and station details
- Required 2-wheeler/4-wheeler, vehicle number, and make/model details
- Passenger booking and My bookings dashboard
- Operator overview with occupancy, revenue, and reservation KPIs
- Parking-lot management with draft lot creation
- Reservation search and status table
- Firebase-ready environment configuration
- Implementation block diagram in `PROJECT_BLOCK_DIAGRAM.md`

## Free-tier rules

This MVP intentionally does not use Stripe, Cloud Functions, SMS, paid maps, or any API that requires billing. UPI redirection launches the payment app but does not verify settlement; reservations therefore remain payment-pending until operator verification or a future payment gateway is added. Availability is persisted per parking lot and vehicle type with a Firestore transaction; per-day availability documents remain a future enhancement. Do not store Firebase credentials in source control.
