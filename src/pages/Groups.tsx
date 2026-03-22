import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyGroups, usePublicGroups, useJoinGroup, useRequestJoinGroup, useUserAvailability, useAddAvailability, useRemoveAvailability } from '@/hooks/useGroups';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Globe, Loader2, Clock, Crown, Linkedin, Plus, Trash2, Filter } from 'lucide-react';
import { MAX_GROUPS_PER_USER, DAY_LABELS, TIMESLOT_DURATION_MINUTES } from '@/types/group';

export default function Groups() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: groups, isLoading } = useMyGroups();
  const { data: publicGroups, isLoading: publicLoading } = usePublicGroups();
  const joinGroup = useJoinGroup();
  const requestJoin = useRequestJoinGroup();
  const { data: myAvailability } = useUserAvailability();
  const addAvailability = useAddAvailability();
  const removeAvailability = useRemoveAvailability();

  const [filterByAvailability, setFilterByAvailability] = useState(false);
  const [showAddAvailability, setShowAddAvailability] = useState(false);
  const [availDay, setAvailDay] = useState('1');
  const [availTime, setAvailTime] = useState('09:00');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  const ownedCount = groups?.filter((g) => g.myRole === 'owner').length ?? 0;

  // Filter browse to only show groups user is NOT already in
  let browsableGroups = publicGroups?.filter((g) => !g.isMember) ?? [];

  // Apply availability filter
  if (filterByAvailability && myAvailability && myAvailability.length > 0) {
    browsableGroups = browsableGroups.filter((g) => {
      if (!g.timeslots || g.timeslots.length === 0) return true; // show groups with no timeslots
      return g.timeslots.some((ts: any) =>
        myAvailability.some((a) =>
          a.day_of_week === ts.day_of_week &&
          a.start_time <= ts.start_time &&
          a.end_time >= ts.end_time
        )
      );
    });
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAddAvailability = () => {
    addAvailability.mutate(
      { dayOfWeek: parseInt(availDay), startTime: availTime },
      { onSuccess: () => setShowAddAvailability(false) }
    );
  };

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
            <TabsTrigger value="availability" className="flex-1">
              <Clock className="h-3.5 w-3.5 mr-1" />
              Availability
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
            {/* Availability filter toggle */}
            {myAvailability && myAvailability.length > 0 && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted/50">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1">Filter by my availability</span>
                <Switch checked={filterByAvailability} onCheckedChange={setFilterByAvailability} />
              </div>
            )}

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
                    <CardContent className="space-y-3">
                      {group.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                      )}

                      {/* Owner info */}
                      {group.ownerProfile && (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={group.ownerProfile.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(group.ownerProfile.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            by <span className="font-medium text-foreground">{group.ownerProfile.full_name}</span>
                          </span>
                          {group.ownerProfile.linkedin_url && (
                            <button
                              className="text-[#0A66C2] hover:opacity-80"
                              onClick={(e) => { e.stopPropagation(); window.open(group.ownerProfile.linkedin_url, '_blank'); }}
                            >
                              <Linkedin className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Timeslot previews */}
                      {group.timeslots.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {group.timeslots.slice(0, 3).map((ts: any, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs gap-1">
                              <Clock className="h-3 w-3" />
                              {DAY_LABELS[ts.day_of_week]?.slice(0, 3)} {ts.start_time.slice(0, 5)}
                            </Badge>
                          ))}
                          {group.timeslots.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{group.timeslots.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
                        </div>
                        {group.hasPendingRequest ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Request Pending
                          </Badge>
                        ) : group.approval_required ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => requestJoin.mutate(group.id)}
                            disabled={requestJoin.isPending}
                          >
                            {requestJoin.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Request to Join'
                            )}
                          </Button>
                        ) : (
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
                        )}
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
                  {filterByAvailability
                    ? 'No groups match your availability. Try turning off the filter.'
                    : 'All public groups have been joined, or none exist yet. Create one to get started!'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Availability Tab */}
          <TabsContent value="availability">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">My Availability</h3>
                  <p className="text-sm text-muted-foreground">Set when you're free for 30-min chats. Used to filter groups in Browse.</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAddAvailability(!showAddAvailability)}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>

              {showAddAvailability && (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Day</Label>
                        <Select value={availDay} onValueChange={setAvailDay}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(DAY_LABELS).map(([val, lbl]) => (
                              <SelectItem key={val} value={val}>{lbl}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Start Time</Label>
                        <Input type="time" value={availTime} onChange={(e) => setAvailTime(e.target.value)} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Duration is always 30 minutes.</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddAvailability} disabled={addAvailability.isPending}>
                        {addAvailability.isPending ? 'Adding...' : 'Add'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddAvailability(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!myAvailability || myAvailability.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No availability set yet.</p>
                  <p className="text-sm">Add your available times to help filter groups that match your schedule.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myAvailability.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{DAY_LABELS[slot.day_of_week]}</Badge>
                        <span className="text-sm">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeAvailability.mutate(slot.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <MobileNav />
    </div>
  );
}
