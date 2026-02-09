import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Linkedin, Loader2, FlaskConical, User, Mail, Briefcase, Check, ImageIcon, Users } from 'lucide-react';
import { BuildLinkLogo } from '@/components/BuildLinkLogo';
import { supabase } from '@/integrations/supabase/client';

const SEED_ACCOUNTS = [
  { email: 'sarah.chen@example.com', name: 'Sarah Chen' },
  { email: 'marcus.j@example.com', name: 'Marcus Johnson' },
  { email: 'emily.r@example.com', name: 'Emily Rodriguez' },
  { email: 'david.kim@example.com', name: 'David Kim' },
  { email: 'priya.p@example.com', name: 'Priya Patel' },
  { email: 'james.w@example.com', name: 'James Wilson' },
  { email: 'lisa.t@example.com', name: 'Lisa Thompson' },
  { email: 'alex.r@example.com', name: 'Alex Rivera' },
  { email: 'nicole.z@example.com', name: 'Nicole Zhang' },
  { email: 'michael.b@example.com', name: 'Michael Brown' },
];

// Show test accounts in dev mode OR preview environments (not production)
const isProduction = window.location.hostname === 'linkbuild.lovable.app';
const isDev = import.meta.env.DEV || !isProduction;

const LINKEDIN_PERMISSIONS = [
  { icon: User, label: 'Name', description: 'Your full name from your profile' },
  { icon: Mail, label: 'Email', description: 'Your primary email address' },
  { icon: Briefcase, label: 'Headline', description: 'Your professional headline' },
  { icon: ImageIcon, label: 'Photo', description: 'Your profile picture' },
];

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
      
      // Fetch inviter's name (case-insensitive match)
      const fetchInviter = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, initials')
          .ilike('referral_code', referralCode)
          .maybeSingle();
        
        if (data) {
          // Use full name or initials for privacy
          setInviterName(data.full_name || data.initials || null);
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
        {/* Referral Banner */}
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

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <BuildLinkLogo size="lg" />
          <h1 className="text-3xl font-bold tracking-tight">BuildLink</h1>
          <p className="text-muted-foreground text-center max-w-xs">
            Sometimes the best opportunities come from unexpected connections
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              Sign in with your LinkedIn account to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* LinkedIn Permissions Info */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">
                We'll import from your LinkedIn:
              </p>
              <div className="space-y-2">
                {LINKEDIN_PERMISSIONS.map((perm) => (
                  <div key={perm.label} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <perm.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{perm.label}</p>
                      <p className="text-xs text-muted-foreground">{perm.description}</p>
                    </div>
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                ))}
              </div>
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

        {/* Dev-only test account login */}
        {isDev && (
          <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                <FlaskConical className="h-4 w-4" />
                Dev Mode: Test Accounts
              </CardTitle>
              <CardDescription className="text-xs">
                Login as a seed account for testing (password: TestPassword123!)
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
