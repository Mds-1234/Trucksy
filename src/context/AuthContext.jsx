import { createContext, useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";

export const AuthContext = createContext();

const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore request timed out. Make sure you clicked 'Create Database' in Firebase Console!")), ms))
  ]);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRoleAndSetUser = async (u) => {
    try {
      const q = query(collection(db, "users"), where("uid", "==", u.uid));
      const querySnapshot = await withTimeout(getDocs(q), 5000);
      let role = "driver";
      let name = "";
      let contact = "";
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        role = data.role || "driver";
        name = data.name || "";
        contact = data.contact || "";
      }
      setUser({ ...u, role, name, contact });
    } catch (error) {
      console.error("Failed to fetch user data", error);
      setUser({ ...u, role: "driver", name: "", contact: "" });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        if (!user || user.uid !== u.uid) {
          await fetchRoleAndSetUser(u);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const loginUser = async (email, password) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    await fetchRoleAndSetUser(res.user);
  };

  const signupUser = async (email, password, role, name, contact) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await withTimeout(addDoc(collection(db, "users"), {
        uid: res.user.uid,
        role: role,
        name: name,
        contact: contact
      }), 5000);
    } catch (err) {
      console.error("Failed to save user data to DB", err);
    }
    await fetchRoleAndSetUser(res.user);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loginUser, signupUser, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};