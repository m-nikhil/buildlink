import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Linkedin, Loader2, FlaskConical, Users } from 'lucide-react';
import { BuildLinkLogo } from '@/components/BuildLinkLogo';
import { supabase } from '@/integrations/supabase/client';

const SEED_ACCOUNTS = [
  { email: 'sarah.chen@buildlink.test', name: 'Sarah Chen' },
  { email: 'marcus.j@buildlink.test', name: 'Marcus Johnson' },
  { email: 'emily.r@buildlink.test', name: 'Emily Rodriguez' },
  { email: 'david.kim@buildlink.test', name: 'David Kim' },
  { email: 'priya.p@buildlink.test', name: 'Priya Patel' },
  { email: 'james.w@buildlink.test', name: 'James Wilson' },
  { email: 'lisa.t@buildlink.test', name: 'Lisa Thompson' },
  { email: 'alex.r@buildlink.test', name: 'Alex Rivera' },
  { email: 'nicole.z@buildlink.test', name: 'Nicole Zhang' },
  { email: 'michael.b@buildlink.test', name: 'Michael Brown' },
];

// Show test accounts in dev mode OR preview environments (not production)
const isDev = import.meta.env.DEV;


export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, signInWithLinkedIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSeed, setSelectedSeed] = useState<string>('');
  const [isSeedLoading, setIsSeedLoading] = useState(false);
  const [inviterName, setInviterName] = useState<string | null>(null);

  const referralCode = searchParams.get('ref');

  useEffect(() => {
    // Store referral code in sessionStorage for use after signup
    if (referralCode) {
      sessionStorage.setItem('referral_code', referralCode);
      
      // Fetch inviter's name
      const fetchInviter = async () => {
        try {
          // Use uppercase to match stored format
          const normalizedCode = referralCode.toUpperCase();
          console.log('Fetching inviter for code:', normalizedCode);
          
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, initials, referral_code')
            .eq('referral_code', normalizedCode)
            .maybeSingle();
          
          console.log('Inviter lookup result:', { normalizedCode, data, error });
          
          if (data && (data.full_name || data.initials)) {
            setInviterName(data.full_name || data.initials);
          }
        } catch (err) {
          console.error('Inviter lookup failed:', err);
        }
      };
      fetchInviter();
    }
  }, [referralCode]);

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleLinkedInLogin = async () => {
    setIsSubmitting(true);
    try {
      await signInWithLinkedIn();
    } catch (error) {
      toast.error('Failed to sign in with LinkedIn');
      setIsSubmitting(false);
    }
  };

  const handleSeedLogin = async () => {
    if (!selectedSeed) {
      toast.error('Please select a test account');
      return;
    }
    
    setIsSeedLoading(true);
    try {
      // Call edge function to get magic link token
      const { data, error } = await supabase.functions.invoke('dev-login', {
        body: { email: selectedSeed },
      });
      
      if (error || data.error) {
        toast.error(data?.error || error?.message || 'Login failed');
        return;
      }

      // Verify the OTP token
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      });
      
      if (verifyError) {
        toast.error(`Verification failed: ${verifyError.message}`);
      }
    } catch (error) {
      toast.error('Failed to sign in with test account');
    } finally {
      setIsSeedLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardContent className="space-y-6 pt-8 pb-8">
            {/* Logo and branding */}
            <div className="flex flex-col items-center gap-3">
              <BuildLinkLogo size="lg" />
              <h1 className="text-3xl font-bold tracking-tight">BuildLink</h1>
              <p className="text-muted-foreground text-center max-w-xs">
                Sometimes the best opportunities come from unexpected connections
              </p>
            </div>

            <Button
              onClick={handleLinkedInLogin}
              className="w-full gap-2 h-12 text-base"
              style={{ backgroundColor: 'hsl(201, 100%, 35%)' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Linkedin className="h-5 w-5" />
              )}
              Continue with LinkedIn
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>

        {/* Referral Banner - shown below login */}
        {referralCode && (
          <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">
              {inviterName 
                ? `You were invited by ${inviterName}!` 
                : 'You were invited by a friend!'}
            </span>
          </div>
        )}

        {/* Dev-only test account login */}
        {isDev && (
          <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                <FlaskConical className="h-4 w-4" />
                Dev Mode: Test Accounts
              </CardTitle>
              <CardDescription className="text-xs">
                Login as a seed account for testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedSeed} onValueChange={setSelectedSeed}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a test account..." />
                </SelectTrigger>
                <SelectContent>
                  {SEED_ACCOUNTS.map((account) => (
                    <SelectItem key={account.email} value={account.email}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSeedLogin}
                variant="outline"
                className="w-full gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                disabled={isSeedLoading || !selectedSeed}
              >
                {isSeedLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FlaskConical className="h-4 w-4" />
                )}
                Login as Test User
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
