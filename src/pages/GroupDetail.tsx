import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  useGroupDetail,
  useLeaveGroup,
  useDeleteGroup,
  useUpdateGroup,
  useApproveJoinRequest,
  useRejectJoinRequest,
} from '@/hooks/useGroups';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { TimeslotManager } from '@/components/TimeslotManager';
import { MatchesList } from '@/components/MatchesList';
import { GroupAnalytics } from '@/components/GroupAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Check, Clock, Copy, Crown, Globe, Linkedin, Lock, LogOut, Pencil, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGroupDetail(groupId);
  const leaveGroup = useLeaveGroup();
  const deleteGroup = useDeleteGroup();
  const updateGroup = useUpdateGroup();
  const approveRequest = useApproveJoinRequest();
  const rejectRequest = useRejectJoinRequest();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-6 max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full rounded-xl" />
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

  const { group, members, profiles, timeslots, subscriptions, confirmations, matches, joinRequests, requestProfiles, isOwner } = data;

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.invite_code);
    toast.success('Invite code copied!');
  };

  const ownerMember = members.find((m) => m.role === 'owner');
  const ownerProfile = profiles.find((p: any) => p.user_id === ownerMember?.user_id);

  const openEditDialog = () => {
    setDescriptionDraft(group.description ?? '');
    setEditDialogOpen(true);
  };

  const saveDescription = () => {
    updateGroup.mutate(
      { groupId: group.id, description: descriptionDraft.trim() },
      { onSuccess: () => setEditDialogOpen(false) }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-6 pb-20 md:pb-6 max-w-2xl mx-auto space-y-4">
        {/* Navigation */}
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => navigate('/groups')}>
          <ArrowLeft className="h-4 w-4" />
          Groups
        </Button>

        {/* Hero card */}
        <div className="relative overflow-hidden rounded-xl border bg-card">
          <div className="h-1.5 w-full gradient-primary" />
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold truncate">{group.name}</h1>
                  {isOwner && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground" onClick={openEditDialog}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {group.description ? (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{group.description}</p>
                ) : isOwner ? (
                  <button onClick={openEditDialog} className="text-sm text-muted-foreground/60 italic hover:text-muted-foreground mb-3 block">
                    Add a description...
                  </button>
                ) : null}

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    {group.visibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {group.visibility === 'public' ? 'Public' : 'Private'}
                  </Badge>
                  <Badge className="gap-1 text-[11px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                    <Users className="h-3 w-3" />
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="secondary" className="gap-1 text-[11px]">
                    <Clock className="h-3 w-3" />
                    {group.timezone?.replace(/_/g, ' ') ?? 'UTC'}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="shrink-0">
                {isOwner ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this group?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently deletes the group, all timeslots, and removes all members. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteGroup.mutate(group.id, { onSuccess: () => navigate('/groups') })}
                        >
                          Delete Group
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground"
                    onClick={() => leaveGroup.mutate(group.id, { onSuccess: () => navigate('/groups') })}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Leave
                  </Button>
                )}
              </div>
            </div>

            {/* Owner + invite code inline */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
              {ownerProfile && (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Avatar className="h-7 w-7 ring-1 ring-border">
                    <AvatarImage src={ownerProfile.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                      {getInitials(ownerProfile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-medium truncate">{ownerProfile.full_name}</span>
                    <Badge className="text-[9px] h-4 bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/10">
                      <Crown className="h-2.5 w-2.5 mr-0.5" />
                      Owner
                    </Badge>
                  </div>
                  {ownerProfile.linkedin_url && (
                    <button className="text-[#0A66C2] hover:opacity-80 shrink-0" onClick={() => window.open(ownerProfile.linkedin_url, '_blank')}>
                      <Linkedin className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
              <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0" onClick={copyInviteCode}>
                <Copy className="h-3 w-3" />
                <span className="font-mono">{group.invite_code}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Edit Description Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Description</DialogTitle>
              <DialogDescription>
                Visible to all members{group.visibility === 'public' ? ' and anyone browsing' : ''}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                placeholder="What's this group about? Who should join?"
                rows={8}
                className="resize-y min-h-[200px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {descriptionDraft.length}/500
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveDescription} disabled={updateGroup.isPending}>
                {updateGroup.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pending Join Requests */}
        {isOwner && joinRequests.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                Join Requests
                <Badge className="bg-amber-500/15 text-amber-600 border-amber-300 hover:bg-amber-500/15 text-[11px]">
                  {joinRequests.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {joinRequests.map((req) => {
                const profile = requestProfiles.find((p: any) => p.user_id === req.user_id);
                return (
                  <div key={req.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{profile?.full_name ?? 'Unknown'}</p>
                      {profile?.headline && (
                        <p className="text-xs text-muted-foreground truncate">{profile.headline}</p>
                      )}
                    </div>
                    {profile?.linkedin_url && (
                      <button className="text-[#0A66C2] hover:opacity-80 shrink-0" onClick={() => window.open(profile.linkedin_url, '_blank')}>
                        <Linkedin className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        className="gap-1 h-7 text-xs"
                        onClick={() => approveRequest.mutate({ requestId: req.id, groupId: group.id, userId: req.user_id })}
                        disabled={approveRequest.isPending}
                      >
                        <Check className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 h-7 text-xs text-destructive"
                        onClick={() => rejectRequest.mutate({ requestId: req.id, groupId: group.id })}
                        disabled={rejectRequest.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

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

        {/* Analytics */}
        {isOwner && (
          <GroupAnalytics groupId={group.id} profiles={profiles} />
        )}

        {/* Members */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {members.map((member) => {
              const profile = profiles.find((p: any) => p.user_id === member.user_id);
              return (
                <div key={member.id} className="flex items-center gap-3 py-1.5 px-1 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{profile?.full_name ?? 'Unknown'}</p>
                    {profile?.headline && (
                      <p className="text-xs text-muted-foreground truncate">{profile.headline}</p>
                    )}
                  </div>
                  {isOwner && profile?.linkedin_url && (
                    <button className="text-[#0A66C2] hover:opacity-80 shrink-0" onClick={() => window.open(profile.linkedin_url, '_blank')}>
                      <Linkedin className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {member.role === 'owner' && (
                    <Badge className="text-[9px] h-4 bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/10 shrink-0">
                      <Crown className="h-2.5 w-2.5 mr-0.5" />
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
