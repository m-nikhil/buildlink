import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { InviteFriendsCard } from '@/components/InviteFriendsCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function Invite() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <div className="max-w-lg mx-auto">
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-6 md:py-8 pb-20 md:pb-8">
        <div className="max-w-lg mx-auto">
          <InviteFriendsCard />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
