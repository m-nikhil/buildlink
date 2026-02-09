import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { UserProfile } from '@/components/UserProfile';
import { SwipeFeed } from '@/components/SwipeFeed';
import { Skeleton } from '@/components/ui/skeleton';
import { InviteBubble } from '@/components/InviteBubble';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 h-16 border-b bg-card/80 backdrop-blur-md">
          <div className="container flex h-full items-center px-4">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="ml-2 h-6 w-32" />
          </div>
        </div>
        <main className="container px-4 py-8">
          <Skeleton className="h-[500px] w-full max-w-sm mx-auto rounded-xl" />
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-4">
        <SwipeFeed />
      </main>
      <InviteBubble />
    </div>
  );
}
