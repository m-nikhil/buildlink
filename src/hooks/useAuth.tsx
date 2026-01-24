import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { signInToFirebase, signOutFromFirebase, auth, onAuthStateChanged, doc, db, setDoc, type FirebaseUser } from '@/integrations/firebase/client';

const LINKEDIN_CLIENT_ID = '86jf34hvwupz2k';
const LINKEDIN_SCOPES = 'openid profile email';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithLinkedIn: () => void;
  handleLinkedInCallback: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to update last_active on login
  const updateLastActive = async (userId: string) => {
    try {
      const profileRef = doc(db, 'profiles', userId);
      await setDoc(profileRef, { 
        last_active: new Date().toISOString() 
      }, { merge: true });
      console.log('[useAuth] Updated last_active');
    } catch (e) {
      console.error('[useAuth] Failed to update last_active:', e);
    }
  };

  // Helper to ensure Firebase is authenticated
  const ensureFirebaseAuth = async (currentSession: Session) => {
    // Check if already authenticated with Firebase
    if (auth.currentUser) {
      console.log('[useAuth] Firebase already authenticated');
      // Still update last_active even if already authenticated
      updateLastActive(currentSession.user.id);
      return;
    }

    try {
      console.log('[useAuth] Requesting Firebase token...');
      const { data, error } = await supabase.functions.invoke('firebase-token');
      
      if (error) {
        console.error('[useAuth] Failed to get Firebase token:', error);
        return;
      }

      if (data?.firebaseToken) {
        await signInToFirebase(data.firebaseToken);
        console.log('[useAuth] Firebase re-authenticated successfully');
        // Update last_active after successful auth
        updateLastActive(currentSession.user.id);
      }
    } catch (e) {
      console.error('[useAuth] Firebase auth error:', e);
    }
  };

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      console.log('[useAuth] Firebase user state changed:', fbUser?.uid || 'null');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Ensure Firebase auth on sign-in or token refresh
        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          setTimeout(() => ensureFirebaseAuth(session), 0);
        }
        
        // Sign out from Firebase if Supabase session ends
        if (!session && event === 'SIGNED_OUT') {
          try {
            await signOutFromFirebase();
            console.log('[useAuth] Signed out from Firebase');
          } catch (e) {
            console.error('[useAuth] Firebase sign out error:', e);
          }
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Ensure Firebase auth for existing session
      if (session) {
        ensureFirebaseAuth(session);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithLinkedIn = () => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = crypto.randomUUID();
    
    // Store state for CSRF protection
    sessionStorage.setItem('linkedin_oauth_state', state);
    sessionStorage.setItem('linkedin_redirect_uri', redirectUri);
    
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', LINKEDIN_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', LINKEDIN_SCOPES);
    
    window.location.href = authUrl.toString();
  };

  const handleLinkedInCallback = async (code: string) => {
    const redirectUri = sessionStorage.getItem('linkedin_redirect_uri') || `${window.location.origin}/auth/callback`;
    
    // Call our edge function to exchange the code
    const { data, error } = await supabase.functions.invoke('linkedin-auth', {
      body: { code, redirectUri },
    });

    if (error) {
      throw new Error(error.message || 'Failed to authenticate with LinkedIn');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    // Verify the token with Supabase
    if (data.token && data.type) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token,
        type: data.type,
      });

      if (verifyError) {
        throw new Error(verifyError.message);
      }
    }

    // Sign in to Firebase with the custom token
    if (data.firebaseToken) {
      try {
        await signInToFirebase(data.firebaseToken);
        console.log('[useAuth] Signed in to Firebase successfully');
      } catch (firebaseError) {
        console.error('[useAuth] Firebase sign-in failed:', firebaseError);
        // Continue even if Firebase auth fails - Supabase auth is primary
      }
    }

    // Clean up session storage
    sessionStorage.removeItem('linkedin_oauth_state');
    sessionStorage.removeItem('linkedin_redirect_uri');
  };

  const signOut = async () => {
    // Sign out from both Supabase and Firebase
    try {
      await signOutFromFirebase();
    } catch (e) {
      console.error('[useAuth] Firebase sign out error:', e);
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, firebaseUser, loading, signInWithLinkedIn, handleLinkedInCallback, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
