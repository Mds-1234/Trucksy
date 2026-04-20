import { db } from "./firebase";
import { addDoc, collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";

export const addRoute = async (route) => {
  await addDoc(collection(db, "routes"), route);
};

export const getRoutes = async () => {
  const snapshot = await getDocs(collection(db, "routes"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getUserRoutes = async (uid) => {
  const q = query(collection(db, "routes"), where("uid", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteRoute = async (id) => {
  await deleteDoc(doc(db, "routes", id));
};