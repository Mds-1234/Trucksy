import { db } from "./firebase";
import { addDoc, collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";

export const addShipment = async (shipment) => {
  await addDoc(collection(db, "shipments"), shipment);
};

export const getShipments = async () => {
  const snapshot = await getDocs(collection(db, "shipments"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getUserShipments = async (uid) => {
  const q = query(collection(db, "shipments"), where("uid", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteShipment = async (id) => {
  await deleteDoc(doc(db, "shipments", id));
};