import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Linkedin, Heart, Loader2 } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signInWithLinkedIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg">
            <Heart className="h-8 w-8 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Spark</h1>
          <p className="text-muted-foreground text-center">
            Find meaningful professional connections
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              Sign in with your LinkedIn account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
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

            <p className="mt-4 text-xs text-center text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
