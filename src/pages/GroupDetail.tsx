import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGroupDetail, useLeaveGroup, useDeleteGroup } from '@/hooks/useGroups';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { TimeslotManager } from '@/components/TimeslotManager';
import { MatchesList } from '@/components/MatchesList';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Copy, Crown, Globe, Lock, LogOut, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGroupDetail(groupId);
  const leaveGroup = useLeaveGroup();
  const deleteGroup = useDeleteGroup();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-6 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-6 max-w-2xl mx-auto text-center">
          <p className="text-destructive mb-4">Group not found or you don't have access.</p>
          <Button variant="outline" onClick={() => navigate('/groups')}>Back to Groups</Button>
        </main>
        <MobileNav />
      </div>
    );
  }

  const { group, members, profiles, timeslots, subscriptions, confirmations, matches, isOwner } = data;

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.invite_code);
    toast.success('Invite code copied!');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-6 pb-20 md:pb-6 max-w-2xl mx-auto space-y-6">
        {/* Back + Header */}
        <div>
          <Button variant="ghost" size="sm" className="gap-1 mb-2 -ml-2" onClick={() => navigate('/groups')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{group.name}</h1>
              {group.description && (
                <p className="text-muted-foreground mt-1">{group.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="gap-1">
                  {group.visibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {group.visibility === 'public' ? 'Public' : 'Private'}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {isOwner ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this group?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the group, all timeslots, and remove all members. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                          deleteGroup.mutate(group.id, {
                            onSuccess: () => navigate('/groups'),
                          });
                        }}
                      >
                        Delete Group
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    leaveGroup.mutate(group.id, {
                      onSuccess: () => navigate('/groups'),
                    });
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Leave
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Invite Code */}
        <Card>
          <CardContent className="py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Invite Code</p>
              <p className="font-mono text-lg">{group.invite_code}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1" onClick={copyInviteCode}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </CardContent>
        </Card>

        {/* Matches */}
        <MatchesList
          groupId={group.id}
          matches={matches}
          timeslots={timeslots}
          profiles={profiles}
        />

        {/* Timeslots */}
        <TimeslotManager
          groupId={group.id}
          timeslots={timeslots}
          subscriptions={subscriptions}
          confirmations={confirmations}
          isOwner={isOwner}
          profiles={profiles}
        />

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => {
              const profile = profiles.find((p: any) => p.user_id === member.user_id);
              return (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{profile?.full_name ?? 'Unknown'}</p>
                    {profile?.headline && (
                      <p className="text-xs text-muted-foreground truncate">{profile.headline}</p>
                    )}
                  </div>
                  {member.role === 'owner' && (
                    <Badge variant="secondary" className="gap-1 shrink-0">
                      <Crown className="h-3 w-3" />
                      Owner
                    </Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
      <MobileNav />
    </div>
  );
}
