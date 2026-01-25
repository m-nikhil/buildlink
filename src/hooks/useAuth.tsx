import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debug } from '@/lib/debug';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to update last_active on login
  const updateLastActive = async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('user_id', userId);
      debug.log('[useAuth] Updated last_active');
    } catch (e) {
      debug.error('[useAuth] Failed to update last_active:', e);
    }
  };

  useEffect(() => {
    debug.log('[useAuth] Setting up auth listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        debug.log('[useAuth] Auth state changed:', event, session?.user?.id || 'no user');
        setSession(session);
        setUser(session?.user ?? null);
        
        // Update last_active on sign-in
        if (session && event === 'SIGNED_IN') {
          setTimeout(() => updateLastActive(session.user.id), 0);
        }
        
        setLoading(false);
      }
    );

    debug.log('[useAuth] Checking for existing session...');
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      debug.log('[useAuth] getSession result:', session?.user?.id || 'no session', error || 'no error');
      setSession(session);
      setUser(session?.user ?? null);
      
      // Update last_active for existing session
      if (session) {
        updateLastActive(session.user.id);
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
