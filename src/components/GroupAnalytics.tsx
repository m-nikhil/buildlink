import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BarChart3, Users, CheckCircle, XCircle, Calendar, Star } from 'lucide-react';

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
      const { data: matches } = await supabase
        .from('group_matches')
        .select('*')
        .eq('group_id', groupId)
        .order('week_of', { ascending: false });

      const { data: members } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

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

  const totalMatches = matches.length;
  const completed = matches.filter((m: any) => m.status === 'completed').length;
  const completionRate = totalMatches > 0 ? Math.round((completed / totalMatches) * 100) : 0;

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((sum: number, f: any) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : null;

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
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { value: members.length, label: 'Members', color: 'from-primary/10 to-primary/5' },
            { value: totalMatches, label: 'Matches', color: 'from-accent/10 to-accent/5' },
            { value: `${completionRate}%`, label: 'Complete', color: 'from-green-500/10 to-green-500/5' },
            { value: avgRating ?? '—', label: 'Avg Rating', color: 'from-amber-500/10 to-amber-500/5', icon: true },
          ].map((stat) => (
            <div key={stat.label} className={`text-center p-3 rounded-lg bg-gradient-to-br ${stat.color} border border-border/50`}>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                {stat.icon && <Star className="h-2.5 w-2.5" />}
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Weekly History */}
        {weeks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2.5 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Weekly History
            </h4>
            <div className="space-y-2">
              {weeks.map((w) => (
                <div key={w.weekOf} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-20 shrink-0 font-mono">
                    {w.weekOf}
                  </span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div
                        className="h-full bg-green-500 first:rounded-l-full"
                        style={{ width: `${w.totalMatches > 0 ? (w.completed / w.totalMatches) * 100 : 0}%` }}
                      />
                      {w.skipped > 0 && (
                        <div
                          className="h-full bg-muted-foreground/30"
                          style={{ width: `${(w.skipped / w.totalMatches) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] w-16 shrink-0 justify-end">
                    <span className="text-green-600">{w.completed}</span>
                    <span className="text-muted-foreground/50">/</span>
                    <span className="text-muted-foreground">{w.totalMatches}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Member Activity */}
        <div>
          <h4 className="text-sm font-semibold mb-2.5 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            Member Activity
          </h4>
          <div className="space-y-1.5">
            {members.map((member: any) => {
              const profile = profiles.find((p: any) => p.user_id === member.user_id);
              const stats = userPairCount.get(member.user_id);
              return (
                <div key={member.id} className="flex items-center gap-2 py-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">{profile?.full_name ?? 'Unknown'}</span>
                  {stats ? (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground">{stats.paired} paired</span>
                      <span className="text-green-600 font-medium">{stats.completed} done</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
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
