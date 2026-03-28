// src/firebaseAuth.js
import { app } from "./firebaseConfig";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";

// Initialize Firebase Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// SIGN UP with email
export const signupWithEmail = async (email, password) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

// LOGIN with email
export const loginWithEmail = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

// LOGIN with Google
export const loginWithGoogle = async () => {
  return await signInWithPopup(auth, googleProvider);
};

// LOGOUT
export const logoutUser = async () => {
  return await signOut(auth);
};

// get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};
