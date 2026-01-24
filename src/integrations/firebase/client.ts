import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, startAfter, DocumentSnapshot, QueryConstraint } from 'firebase/firestore';
import { getAuth, signInWithCustomToken, signOut as firebaseSignOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

// Firebase config - these are publishable keys (safe to expose in client code)
const firebaseConfig = {
  apiKey: "AIzaSyBZOBC-STxmST9r94c3HK_4ZaD9U7rfSsQ",
  authDomain: "buildlink-566a8.firebaseapp.com",
  projectId: "buildlink-566a8",
  storageBucket: "buildlink-566a8.firebasestorage.app",
  messagingSenderId: "1090069908680",
  appId: "1:1090069908680:web:a2e8f57a08dfe2f8a14e95",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Collection references
export const profilesCollection = collection(db, 'profiles');

// Helper to get profile document reference
export const getProfileRef = (profileId: string) => doc(db, 'profiles', profileId);

// Firebase Auth helpers
export const signInToFirebase = async (customToken: string) => {
  return signInWithCustomToken(auth, customToken);
};

export const signOutFromFirebase = async () => {
  return firebaseSignOut(auth);
};

export {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onAuthStateChanged,
  type DocumentSnapshot,
  type QueryConstraint,
  type FirebaseUser,
};
