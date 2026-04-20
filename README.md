# Trucksy

Trucksy is a logistics coordination web app that connects drivers with businesses to match routes and shipments, manage bookings, and track trip progress.

## Problem Statement

Small and medium businesses often struggle to find reliable transport at the right time, while drivers frequently have unused capacity on planned routes. Trucksy solves this mismatch by:

- matching business shipment requests with existing driver routes,
- allowing businesses to book available driver capacity,
- giving both parties visibility into booking and trip status.

## Features

- Role-based access for `driver` and `business` users
- Route creation and management for drivers
- Shipment creation and management for businesses
- Intelligent route-shipment matching based on path and capacity
- Booking flow with statuses (`pending`, `accepted`, `rejected`, `completed`)
- Driver-side trip checklist for intermediate stops
- Business-side live trip visibility (current truck location and per-booking completion)
- History and active booking views

## Tech Stack

- Frontend: React + Vite
- Routing: React Router
- Database/Auth: Firebase (Firestore + Firebase Auth)
- Styling: Custom CSS
- Tooling: ESLint

## Setup Instructions

1. Clone the repository:

```bash
git clone https://github.com/Mds-1234/Trucksy.git
cd Trucksy/trucksy
```

2. Install dependencies:

```bash
npm install
```

3. Configure Firebase:

- Open `src/services/firebase.js`
- Add your Firebase project credentials/config values

4. Run the development server:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

6. Optional maintenance scripts:

```bash
npm run migrate:dates:dry
npm run migrate:dates
npm run cleanup:completed
```
