import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, startAfter, DocumentSnapshot, QueryConstraint } from 'firebase/firestore';

// Firebase config - these are publishable keys (safe to expose in client code)
const firebaseConfig = {
  apiKey: "AIzaSyDMr6VvCKfaC-n7QhQfFIH2pxwI8mPjC5w",
  authDomain: "buildlink-566a8.firebaseapp.com",
  projectId: "buildlink-566a8",
  storageBucket: "buildlink-566a8.firebasestorage.app",
  messagingSenderId: "1090069908680",
  appId: "1:1090069908680:web:a2e8f57a08dfe2f8a14e95",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection references
export const profilesCollection = collection(db, 'profiles');

// Helper to get profile document reference
export const getProfileRef = (profileId: string) => doc(db, 'profiles', profileId);

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
  type DocumentSnapshot,
  type QueryConstraint
};
