import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { 
  profilesCollection, 
  getProfileRef,
  getDocs,
  setDoc,
  query, 
  where,
} from '@/integrations/firebase/client';
import { FirestoreProfile } from '@/integrations/firebase/types';

const LINKEDIN_CLIENT_ID = '86jf34hvwupz2k';
const LINKEDIN_SCOPES = 'openid profile email';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithLinkedIn: () => void;
  handleLinkedInCallback: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to ensure Firestore profile exists
async function ensureFirestoreProfile(user: User): Promise<void> {
  try {
    const q = query(profilesCollection, where('user_id', '==', user.id));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Create new profile in Firestore
      const profileId = user.id;
      const docRef = getProfileRef(profileId);
      
      const newProfile: FirestoreProfile = {
        id: profileId,
        user_id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        email: user.email || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        headline: null,
        bio: null,
        linkedin_url: null,
        experience_level: null,
        industry: null,
        looking_for: [],
        skills: [],
        location: null,
        age: null,
        preferred_experience_levels: [],
        preferred_industries: [],
        preferred_goals: [],
        age_min: 18,
        age_max: 99,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      await setDoc(docRef, newProfile);
      console.log('Created Firestore profile for user:', user.id);
    }
  } catch (error) {
    console.error('Error ensuring Firestore profile:', error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Auto-create Firestore profile on sign-in
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          // Use setTimeout to avoid blocking the auth flow
          setTimeout(() => {
            ensureFirestoreProfile(session.user);
          }, 0);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Also ensure profile exists on initial load
      if (session?.user) {
        ensureFirestoreProfile(session.user);
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

    // Clean up session storage
    sessionStorage.removeItem('linkedin_oauth_state');
    sessionStorage.removeItem('linkedin_redirect_uri');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithLinkedIn, handleLinkedInCallback, signOut }}>
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
