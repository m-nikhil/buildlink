import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyGroups, usePublicGroups, useJoinGroup } from '@/hooks/useGroups';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { GroupCard } from '@/components/GroupCard';
import { CreateGroupDialog } from '@/components/CreateGroupDialog';
import { JoinGroupDialog } from '@/components/JoinGroupDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Globe, Lock, Loader2 } from 'lucide-react';
import { MAX_GROUPS_PER_USER } from '@/types/group';

export default function Groups() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: groups, isLoading } = useMyGroups();
  const { data: publicGroups, isLoading: publicLoading } = usePublicGroups();
  const joinGroup = useJoinGroup();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  const ownedCount = groups?.filter((g) => g.myRole === 'owner').length ?? 0;

  // Filter browse to only show groups user is NOT already in
  const browsableGroups = publicGroups?.filter((g) => !g.isMember) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-6 pb-20 md:pb-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Groups</h1>
            <p className="text-sm text-muted-foreground">Weekly 1:1 matching within your groups</p>
          </div>
          <div className="flex gap-2">
            <JoinGroupDialog />
            {ownedCount < MAX_GROUPS_PER_USER && <CreateGroupDialog />}
          </div>
        </div>

        <Tabs defaultValue="my-groups">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="my-groups" className="flex-1">My Groups</TabsTrigger>
            <TabsTrigger value="browse" className="flex-1">
              Browse
              {browsableGroups.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-xs">
                  {browsableGroups.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-groups">
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
          </TabsContent>

          <TabsContent value="browse">
            {publicLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : browsableGroups.length > 0 ? (
              <div className="space-y-4">
                {browsableGroups.map((group) => (
                  <Card key={group.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <Badge variant="outline" className="gap-1">
                          <Globe className="h-3 w-3" />
                          Public
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {group.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{group.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => joinGroup.mutate(group.invite_code)}
                          disabled={joinGroup.isPending}
                        >
                          {joinGroup.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Join'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Globe className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No public groups available</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  All public groups have been joined, or none exist yet. Create one to get started!
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <MobileNav />
    </div>
  );
}
