import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleLinkedInCallback, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (processedRef.current) return;
    
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || errorParam);
      setProcessing(false);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      setProcessing(false);
      return;
    }

    // Verify state for CSRF protection
    const storedState = sessionStorage.getItem('linkedin_oauth_state');
    if (state !== storedState) {
      setError('Invalid state parameter. Please try again.');
      setProcessing(false);
      return;
    }

    // Mark as processed to prevent double execution
    processedRef.current = true;

    // Process the callback
    handleLinkedInCallback(code)
      .then(() => {
        navigate('/');
      })
      .catch((err) => {
        console.error('LinkedIn callback error:', err);
        setError(err.message || 'Authentication failed');
        setProcessing(false);
      });
  }, [searchParams, handleLinkedInCallback, navigate]);

  // If user is already logged in, redirect
  useEffect(() => {
    if (user && !processing) {
      navigate('/');
    }
  }, [user, processing, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Authentication Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
          <CardTitle>Signing you in...</CardTitle>
          <CardDescription>Please wait while we complete your LinkedIn authentication</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
