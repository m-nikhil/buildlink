import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  onSnapshot,
  DocumentSnapshot, 
  QueryConstraint,
  Unsubscribe
} from 'firebase/firestore';
import { getAuth, signInWithCustomToken, signOut as firebaseSignOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

// Firebase config - these are publishable keys (safe to expose in client code)
const firebaseConfig = {
  apiKey: "AIzaSyBZOBC-STxmST9r94c3HK_4ZaD9U7rfSsQ",
  authDomain: "buildlink-566a8.firebaseapp.com",
  projectId: "buildlink-566a8",
  storageBucket: "buildlink-566a8.firebasestorage.app",
  messagingSenderId: "238512275029",
  appId: "1:238512275029:web:d84fc7949af554b4761edc",
  measurementId: "G-XJC3QD9PTW",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Collection references
export const profilesCollection = collection(db, 'profiles');
export const connectionsCollection = collection(db, 'connections');
export const messagesCollection = collection(db, 'messages');
export const dailySwipesCollection = collection(db, 'daily_swipes');
export const dismissedProfilesCollection = collection(db, 'dismissed_profiles');

// Helper to get document references
export const getProfileRef = (profileId: string) => doc(db, 'profiles', profileId);
export const getConnectionRef = (connectionId: string) => doc(db, 'connections', connectionId);
export const getMessageRef = (messageId: string) => doc(db, 'messages', messageId);
export const getDailySwipeRef = (swipeId: string) => doc(db, 'daily_swipes', swipeId);
export const getDismissedProfileRef = (dismissId: string) => doc(db, 'dismissed_profiles', dismissId);

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
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  onAuthStateChanged,
  type DocumentSnapshot,
  type QueryConstraint,
  type FirebaseUser,
  type Unsubscribe,
};
