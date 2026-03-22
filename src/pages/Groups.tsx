import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyGroups } from '@/hooks/useGroups';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { GroupCard } from '@/components/GroupCard';
import { CreateGroupDialog } from '@/components/CreateGroupDialog';
import { JoinGroupDialog } from '@/components/JoinGroupDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { MAX_GROUPS_PER_USER } from '@/types/group';

export default function Groups() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: groups, isLoading } = useMyGroups();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  const ownedCount = groups?.filter((g) => g.myRole === 'owner').length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-6 pb-20 md:pb-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Groups</h1>
            <p className="text-sm text-muted-foreground">Weekly 1:1 matching within your groups</p>
          </div>
          <div className="flex gap-2">
            <JoinGroupDialog />
            {ownedCount < MAX_GROUPS_PER_USER && <CreateGroupDialog />}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : groups && groups.length > 0 ? (
          <div className="space-y-4">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Users className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create a group to schedule weekly 1:1s with your peers, or join one with an invite code.
            </p>
            <div className="flex gap-2">
              <JoinGroupDialog />
              <CreateGroupDialog />
            </div>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
