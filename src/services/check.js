import { db } from "./firebase.js";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dateArg = args.find((arg) => arg.startsWith("--date="));
const fallbackDate = dateArg ? dateArg.split("=")[1] : new Date().toISOString().slice(0, 10);

if (!isValidDate(fallbackDate)) {
  console.error("Invalid --date value. Use format YYYY-MM-DD.");
  process.exit(1);
}

async function migrateMissingDates() {
  const [routesSnap, shipmentsSnap, bookingsSnap] = await Promise.all([
    getDocs(collection(db, "routes")),
    getDocs(collection(db, "shipments")),
    getDocs(collection(db, "bookings"))
  ]);

  const routeUpdates = [];
  const shipmentUpdates = [];
  const bookingUpdates = [];

  routesSnap.docs.forEach((d) => {
    if (!d.data()?.date) routeUpdates.push(d.id);
  });

  shipmentsSnap.docs.forEach((d) => {
    if (!d.data()?.date) shipmentUpdates.push(d.id);
  });

  bookingsSnap.docs.forEach((d) => {
    if (!d.data()?.tripDate) bookingUpdates.push(d.id);
  });

  console.log("Date migration plan");
  console.log(`- Fallback date: ${fallbackDate}`);
  console.log(`- Routes to update: ${routeUpdates.length}`);
  console.log(`- Shipments to update: ${shipmentUpdates.length}`);
  console.log(`- Bookings to update: ${bookingUpdates.length}`);
  console.log(`- Mode: ${dryRun ? "DRY RUN (no writes)" : "WRITE"}`);

  if (dryRun) {
    process.exit(0);
  }

  await Promise.all([
    ...routeUpdates.map((id) => updateDoc(doc(db, "routes", id), { date: fallbackDate })),
    ...shipmentUpdates.map((id) => updateDoc(doc(db, "shipments", id), { date: fallbackDate })),
    ...bookingUpdates.map((id) => updateDoc(doc(db, "bookings", id), { tripDate: fallbackDate }))
  ]);

  console.log("Migration complete.");
  process.exit(0);
}

migrateMissingDates().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
