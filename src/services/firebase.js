import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCKbugHRoXuEKud2jdwtUomcRfRO15f-B0",
  authDomain: "trucksy-4fd18.firebaseapp.com",
  projectId: "trucksy-4fd18",
  storageBucket: "trucksy-4fd18.firebasestorage.app",
  messagingSenderId: "386197933659",
  appId: "1:386197933659:web:60b7163535bc4f9a1a797e"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);