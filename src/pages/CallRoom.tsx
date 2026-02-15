import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { VideoCall } from '@/components/VideoCall';
import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertCircle } from 'lucide-react';

export default function CallRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [introData, setIntroData] = useState<{
    remoteUserId: string;
    remoteInitials: string;
    remoteAvatar?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=/call/${roomId}`);
    }
  }, [user, authLoading, navigate, roomId]);

  useEffect(() => {
    if (!user || !roomId) return;

    async function loadIntro() {
      setLoading(true);
      // roomId is the weekly_intros.id
      const { data, error: fetchError } = await supabase
        .from('weekly_intros')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (fetchError || !data) {
        setError('Video room not found or you don\'t have access.');
        setLoading(false);
        return;
      }

      if (data.user_id !== user!.id && data.matched_user_id !== user!.id) {
        setError('You don\'t have access to this video room.');
        setLoading(false);
        return;
      }

      if (data.status !== 'accepted') {
        setError('This intro hasn\'t been accepted yet. Both users must accept before joining the call.');
        setLoading(false);
        return;
      }

      const remoteUserId = data.user_id === user!.id ? data.matched_user_id : data.user_id;

      // Fetch remote profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('initials, avatar_url')
        .eq('user_id', remoteUserId)
        .single();

      setIntroData({
        remoteUserId,
        remoteInitials: profile?.initials || '?',
        remoteAvatar: profile?.avatar_url || undefined,
      });
      setLoading(false);
    }

    loadIntro();
  }, [user, roomId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading video room...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="p-6 flex flex-col items-center gap-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-center text-muted-foreground">{error}</p>
                <Button onClick={() => navigate('/weekly-intro')}>Back to Weekly Intro</Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!introData || !roomId) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <VideoCall
            roomId={roomId}
            remoteUserId={introData.remoteUserId}
            remoteUserInitials={introData.remoteInitials}
            remoteUserAvatar={introData.remoteAvatar}
            onCallEnded={() => navigate('/weekly-intro')}
          />
        </div>
      </main>
    </div>
  );
}
