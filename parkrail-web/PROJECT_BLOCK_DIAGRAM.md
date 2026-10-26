# ParkNGo Project Block Diagram

This diagram reflects the current implementation in `src/App.tsx`, `src/firebase.ts`,
`firestore.rules`, and `scripts/seed-firestore.mjs`.

## System Block Diagram

```mermaid
flowchart LR
    Passenger[Passenger]
    Operator[Parking operator]

    subgraph Browser[Web browser]
        SPA[ParkNGo React SPA<br/>App.tsx]
        State[React state<br/>search, booking, auth, theme]
        Storage[localStorage<br/>last booking + theme]
        Map[Leaflet map<br/>parking markers + popups]
        QR[QR booking pass<br/>QRCodeCanvas]
    end

    subgraph Firebase[Firebase project: parkngo-f218c]
        Auth[Firebase Authentication<br/>Email/password]
        Rules[Firestore Security Rules]
        Firestore[(Cloud Firestore)]
        Lots[(parkingLots collection)]
        Reservations[(reservations collection)]
        Users[(users collection)]
        Firestore --> Lots
        Firestore --> Reservations
        Firestore --> Users
        Rules -. protects .-> Firestore
    end

    UPI[UPI payment app<br/>upi://pay deep link]
    Tiles[OpenStreetMap tile server]
    Seed[seed-firestore.mjs<br/>Firebase REST API]

    Passenger -->|search, select lot, enter vehicle| SPA
    Operator -->|operator portal| SPA
    SPA <--> State
    State <--> Storage
    SPA -->|sign in / sign up / sign out| Auth
    Auth -->|auth state| SPA
    SPA -->|read live parking lots| Rules
    SPA -->|read user reservations| Rules
    SPA -->|transactional booking| Rules
    SPA -->|operator reads + payment updates| Rules
    Rules --> Firestore
    SPA -->|launch payment| UPI
    SPA -->|render booking QR| QR
    SPA -->|render map tiles| Map
    Map --> Tiles
    Seed -->|seed or refresh lot records| Firestore
```

## Passenger Booking Flow

```mermaid
flowchart TD
    Start[Open ParkNGo]
    Search[Search by station and arrival/departure dates]
    Lots[Load live parking lots<br/>Firestore when configured<br/>local demo data otherwise]
    Select[Select parking lot]
    Details[Enter vehicle type, number, and make/model]
    Auth{Authenticated?}
    Login[Email/password sign in or sign up]
    Transaction[Firestore transaction]
    ReadLot[Read current parkingLots document]
    Check{Selected vehicle<br/>capacity available?}
    Reject[Show no-space error]
    Write[Atomically decrement selected vehicle capacity<br/>and total capacity]
    Reservation[Create pending reservation<br/>paymentStatus: initiated]
    UPI[Open UPI app with amount and reservation ID]
    Pass[Show confirmation and QR booking pass]
    MyBookings[My bookings dashboard]

    Start --> Search --> Lots --> Select --> Details --> Auth
    Auth -->|No| Login --> Auth
    Auth -->|Yes| Transaction --> ReadLot --> Check
    Check -->|No| Reject
    Check -->|Yes| Write --> Reservation --> UPI --> Pass --> MyBookings
```

## Operator Flow

```mermaid
flowchart TD
    Open[Open Operator portal]
    OperatorAuth{UID matches configured operator UID?}
    Deny[Require operator sign in or show access error]
    Dashboard[Operator dashboard]
    Load[Read operator-owned parkingLots and reservations]
    Overview[Overview<br/>occupancy, spaces, revenue, KPIs]
    Lots[Lots tab<br/>view lots and add paused draft lot]
    Reservations[Reservations tab<br/>search and inspect reservations]
    Pending{Payment pending?}
    Verify[Verify payment<br/>status: confirmed<br/>paymentStatus: paid]
    Fail[Mark payment failed<br/>status: payment_failed<br/>paymentStatus: failed]

    Open --> OperatorAuth
    OperatorAuth -->|No| Deny
    OperatorAuth -->|Yes| Dashboard --> Load
    Load --> Overview
    Load --> Lots
    Load --> Reservations --> Pending
    Pending -->|Yes| Verify
    Pending -->|Yes| Fail
```

## Firestore Data Blocks

```mermaid
erDiagram
    PARKING_LOT {
        string id
        string name
        string station
        string stationType
        number available
        number total
        number availableTwoWheeler
        number totalTwoWheeler
        number availableFourWheeler
        number totalFourWheeler
        string status
        string operatorId
    }

    RESERVATION {
        string id
        string userId
        string operatorId
        string lotId
        string arrival
        string departure
        string bookingType
        string vehicleType
        string vehicleNumber
        number total
        string paymentStatus
        string status
        string createdAt
    }

    USER {
        string id
        string profileData
    }

    PARKING_LOT ||--o{ RESERVATION : contains
    USER ||--o{ RESERVATION : creates
    USER ||--o{ PARKING_LOT : operates
```

## Runtime and Deployment Notes

- `src/main.tsx` mounts the React application.
- `src/firebase.ts` initializes Firebase only when all `VITE_FIREBASE_*` values exist.
- Without Firebase configuration, the application uses local demo parking data and local booking state.
- Firestore rules make live lots publicly readable, restrict reservations to their owner or the operator, and restrict lot/payment mutations.
- `scripts/seed-firestore.mjs` writes the six Hyderabad/Telangana parking lots through the Firebase REST API.
- Firebase Firestore is configured in `asia-south1` through `firebase.json`.
- Payment settlement is not verified automatically. The UPI app is launched externally and the operator confirms or fails the payment in the portal.
- Availability is currently per parking lot and vehicle type. It is not yet split into per-day availability documents.
