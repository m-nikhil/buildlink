import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BarChart3, Users, CheckCircle, XCircle, Calendar, Star, TrendingUp } from 'lucide-react';
import { DAY_LABELS } from '@/types/group';

interface GroupAnalyticsProps {
  groupId: string;
  profiles: any[];
}

interface WeekStats {
  weekOf: string;
  totalMatches: number;
  completed: number;
  skipped: number;
  scheduled: number;
}

export function GroupAnalytics({ groupId, profiles }: GroupAnalyticsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['group-analytics', groupId],
    queryFn: async () => {
      // Fetch all matches for this group
      const { data: matches } = await supabase
        .from('group_matches')
        .select('*')
        .eq('group_id', groupId)
        .order('week_of', { ascending: false });

      // Fetch all members with join dates
      const { data: members } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      // Fetch feedback for this group's matches
      const matchIds = (matches ?? []).map((m: any) => m.id);
      const { data: feedbacks } = matchIds.length
        ? await supabase.from('match_feedback').select('*').in('match_id', matchIds)
        : { data: [] };

      return {
        matches: matches ?? [],
        members: members ?? [],
        feedbacks: feedbacks ?? [],
      };
    },
  });

  if (isLoading || !data) return null;

  const { matches, members, feedbacks } = data;

  if (matches.length === 0 && members.length <= 1) return null;

  // Aggregate stats
  const totalMatches = matches.length;
  const completed = matches.filter((m: any) => m.status === 'completed').length;
  const skipped = matches.filter((m: any) => m.status === 'skipped').length;
  const completionRate = totalMatches > 0 ? Math.round((completed / totalMatches) * 100) : 0;

  // Average feedback rating
  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((sum: number, f: any) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : null;

  // Per-week stats
  const weekMap = new Map<string, WeekStats>();
  matches.forEach((m: any) => {
    if (!weekMap.has(m.week_of)) {
      weekMap.set(m.week_of, { weekOf: m.week_of, totalMatches: 0, completed: 0, skipped: 0, scheduled: 0 });
    }
    const w = weekMap.get(m.week_of)!;
    w.totalMatches++;
    if (m.status === 'completed') w.completed++;
    else if (m.status === 'skipped') w.skipped++;
    else w.scheduled++;
  });
  const weeks = Array.from(weekMap.values()).slice(0, 8);

  // Per-user pairing stats
  const userPairCount = new Map<string, { paired: number; completed: number }>();
  matches.forEach((m: any) => {
    [m.user_a_id, m.user_b_id].forEach((uid: string) => {
      if (!userPairCount.has(uid)) userPairCount.set(uid, { paired: 0, completed: 0 });
      const u = userPairCount.get(uid)!;
      u.paired++;
      if (m.status === 'completed') u.completed++;
    });
  });

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Group Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{members.length}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{totalMatches}</p>
            <p className="text-xs text-muted-foreground">Total Matches</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">Completion Rate</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-amber-500">{avgRating ?? '—'}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Star className="h-3 w-3" /> Avg Rating
            </p>
          </div>
        </div>

        {/* Weekly History */}
        {weeks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Weekly History
            </h4>
            <div className="space-y-1.5">
              {weeks.map((w) => (
                <div key={w.weekOf} className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">
                    Week of {w.weekOf}
                  </span>
                  <div className="flex-1 flex items-center gap-1.5">
                    <span className="text-green-600 flex items-center gap-0.5">
                      <CheckCircle className="h-3 w-3" />{w.completed}
                    </span>
                    {w.skipped > 0 && (
                      <span className="text-muted-foreground flex items-center gap-0.5">
                        <XCircle className="h-3 w-3" />{w.skipped}
                      </span>
                    )}
                    {w.scheduled > 0 && (
                      <Badge variant="outline" className="text-xs h-5">
                        {w.scheduled} pending
                      </Badge>
                    )}
                  </div>
                  {/* Visual bar */}
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${w.totalMatches > 0 ? (w.completed / w.totalMatches) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Member Activity */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Users className="h-4 w-4" />
            Member Activity
          </h4>
          <div className="space-y-2">
            {members.map((member: any) => {
              const profile = profiles.find((p: any) => p.user_id === member.user_id);
              const stats = userPairCount.get(member.user_id);
              return (
                <div key={member.id} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">{profile?.full_name ?? 'Unknown'}</span>
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </span>
                  {stats ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span>{stats.paired} paired</span>
                      <span className="text-green-600">{stats.completed} done</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No matches yet</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
