import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const LINKEDIN_CLIENT_ID = '86jf34hvwupz2k';
const LINKEDIN_SCOPES = 'openid profile email r_basicprofile';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithLinkedIn: (forceSync?: boolean) => void;
  handleLinkedInCallback: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithLinkedIn = (forceSync: boolean = false) => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = crypto.randomUUID();
    
    // Store state for CSRF protection
    sessionStorage.setItem('linkedin_oauth_state', state);
    sessionStorage.setItem('linkedin_redirect_uri', redirectUri);
    if (forceSync) {
      sessionStorage.setItem('linkedin_force_sync', 'true');
    }
    
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
    const forceSync = sessionStorage.getItem('linkedin_force_sync') === 'true';
    
    // Call our edge function to exchange the code
    const { data, error } = await supabase.functions.invoke('linkedin-auth', {
      body: { code, redirectUri, forceSync },
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
    sessionStorage.removeItem('linkedin_force_sync');
  };

  const signOut = async () => {
    // Always clear local state, even if server signOut fails (e.g., stale session)
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignore errors - session might already be invalid
      console.warn('Sign out error (ignored):', e);
    }
    // Force clear local state
    setUser(null);
    setSession(null);
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
