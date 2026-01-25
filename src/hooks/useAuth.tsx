import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { signInToFirebase, signOutFromFirebase, auth, onAuthStateChanged, doc, db, setDoc, type FirebaseUser } from '@/integrations/firebase/client';
import { debug } from '@/lib/debug';

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
      debug.log('[useAuth] Updated last_active');
    } catch (e) {
      debug.error('[useAuth] Failed to update last_active:', e);
    }
  };

  // Helper to ensure Firebase is authenticated
  const ensureFirebaseAuth = async (currentSession: Session) => {
    debug.log('[useAuth] ensureFirebaseAuth called, currentUser:', auth.currentUser?.uid || 'null');
    
    if (auth.currentUser) {
      debug.log('[useAuth] Firebase already authenticated:', auth.currentUser.uid);
      updateLastActive(currentSession.user.id);
      return;
    }

    try {
      debug.log('[useAuth] Requesting Firebase token from edge function...');
      const { data, error } = await supabase.functions.invoke('firebase-token');
      
      if (error) {
        debug.error('[useAuth] Failed to get Firebase token:', error);
        return;
      }

      debug.log('[useAuth] Got Firebase token response:', { hasToken: !!data?.firebaseToken });

      if (data?.firebaseToken) {
        debug.log('[useAuth] Signing in to Firebase with custom token...');
        const userCred = await signInToFirebase(data.firebaseToken);
        debug.log('[useAuth] Firebase signed in successfully:', userCred.user.uid);
        updateLastActive(currentSession.user.id);
      } else {
        debug.error('[useAuth] No firebaseToken in response:', data);
      }
    } catch (e) {
      debug.error('[useAuth] Firebase auth error:', e);
    }
  };

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      debug.log('[useAuth] Firebase user state changed:', fbUser?.uid || 'null');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    debug.log('[useAuth] Setting up auth listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        debug.log('[useAuth] Auth state changed:', event, session?.user?.id || 'no user');
        setSession(session);
        setUser(session?.user ?? null);
        
        // Ensure Firebase auth on sign-in or token refresh
        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          setTimeout(() => ensureFirebaseAuth(session), 0);
        }
        
        if (!session && event === 'SIGNED_OUT') {
          try {
            await signOutFromFirebase();
            debug.log('[useAuth] Signed out from Firebase');
          } catch (e) {
            debug.error('[useAuth] Firebase sign out error:', e);
          }
        }
        
        setLoading(false);
      }
    );

    debug.log('[useAuth] Checking for existing session...');
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      debug.log('[useAuth] getSession result:', session?.user?.id || 'no session', error || 'no error');
      setSession(session);
      setUser(session?.user ?? null);
      
      // Ensure Firebase auth for existing session
      if (session) {
        ensureFirebaseAuth(session);
      }
      
      setLoading(false);
    }).catch(err => {
      debug.error('[useAuth] getSession error:', err);
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

    if (data.firebaseToken) {
      try {
        await signInToFirebase(data.firebaseToken);
        debug.log('[useAuth] Signed in to Firebase successfully');
      } catch (firebaseError) {
        debug.error('[useAuth] Firebase sign-in failed:', firebaseError);
      }
    }

    // Clean up session storage
    sessionStorage.removeItem('linkedin_oauth_state');
    sessionStorage.removeItem('linkedin_redirect_uri');
  };

  const signOut = async () => {
    try {
      await signOutFromFirebase();
    } catch (e) {
      debug.error('[useAuth] Firebase sign out error:', e);
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
