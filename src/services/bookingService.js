import { db } from "./firebase";
import { addDoc, collection, getDocs, doc, updateDoc, query, where, setDoc } from "firebase/firestore";

export const createBooking = async (data) => {
  const hasUniqueFields = data?.routeId && data?.shipmentId && data?.businessUid;
  if (!hasUniqueFields) {
    await addDoc(collection(db, "bookings"), data);
    return;
  }

  const bookingId = `${data.routeId}_${data.shipmentId}_${data.businessUid}`;
  await setDoc(doc(db, "bookings", bookingId), data, { merge: true });
};

export const getBookings = async () => {
  const snapshot = await getDocs(collection(db, "bookings"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getUserBookings = async (uid, role) => {
  const field = role === "driver" ? "driverUid" : "businessUid";
  const q = query(collection(db, "bookings"), where(field, "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateBookingStatus = async (id, status) => {
  const bookingRef = doc(db, "bookings", id);
  await updateDoc(bookingRef, { status });
};

export const updateBookingStops = async (id, completedStops) => {
  const bookingRef = doc(db, "bookings", id);
  await updateDoc(bookingRef, { completedStops });
};

export const updateBookingDeliveryReached = async (id, deliveryReached) => {
  const bookingRef = doc(db, "bookings", id);
  await updateDoc(bookingRef, { deliveryReached });
};