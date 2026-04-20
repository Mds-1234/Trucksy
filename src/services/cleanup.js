import { db } from "./firebase.js";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

async function cleanup() {
  const bookingsSnapshot = await getDocs(collection(db, "bookings"));
  const bookings = bookingsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  let count = 0;
  for (const booking of bookings) {
    if (booking.status === "completed") {
      if (booking.routeId) {
        console.log("Deleting route:", booking.routeId);
        await deleteDoc(doc(db, "routes", booking.routeId)).catch((e) => console.error(e));
      }
      if (booking.shipmentId) {
        console.log("Deleting shipment:", booking.shipmentId);
        await deleteDoc(doc(db, "shipments", booking.shipmentId)).catch((e) => console.error(e));
      }
      count += 1;
    }
  }

  console.log(`Cleaned up ${count} completed bookings.`);
  process.exit(0);
}

cleanup().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});
