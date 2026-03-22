import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateMatchStatus } from '@/hooks/useGroups';
import { useSubmitFeedback } from '@/hooks/useMatchHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Video, CheckCircle, XCircle, Calendar, Star, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GroupMatch } from '@/types/group';
import { DAY_LABELS } from '@/types/group';

interface MatchesListProps {
  groupId: string;
  matches: GroupMatch[];
  timeslots: any[];
  profiles: any[];
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5 rounded hover:scale-110 transition-transform"
        >
          <Star
            className={cn(
              'h-5 w-5 transition-colors',
              star <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20 hover:text-amber-300'
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function MatchesList({ groupId, matches, timeslots, profiles }: MatchesListProps) {
  const { user } = useAuth();
  const updateStatus = useUpdateMatchStatus();
  const submitFeedback = useSubmitFeedback();
  const [feedbackOpen, setFeedbackOpen] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');

  const myMatches = matches.filter(
    (m) => m.user_a_id === user?.id || m.user_b_id === user?.id
  );

  if (myMatches.length === 0) return null;

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPartnerProfile = (match: GroupMatch) => {
    const partnerId = match.user_a_id === user?.id ? match.user_b_id : match.user_a_id;
    return profiles.find((p: any) => p.user_id === partnerId);
  };

  const getTimeslot = (timeslotId: string) =>
    timeslots.find((t: any) => t.id === timeslotId);

  const handleSubmitFeedback = (matchId: string) => {
    if (rating === 0) return;
    submitFeedback.mutate(
      { matchId, rating, note },
      {
        onSuccess: () => {
          setFeedbackOpen(null);
          setRating(0);
          setNote('');
        },
      }
    );
  };

  const statusConfig = {
    scheduled: { label: 'Upcoming', className: 'bg-amber-500/15 text-amber-600 border-amber-300' },
    completed: { label: 'Completed', className: 'bg-green-500/15 text-green-600 border-green-300' },
    skipped: { label: 'Skipped', className: 'bg-muted text-muted-foreground border-border' },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Your Matches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {myMatches.map((match) => {
          const partner = getPartnerProfile(match);
          const slot = getTimeslot(match.timeslot_id);
          const showFeedbackForm = feedbackOpen === match.id;
          const config = statusConfig[match.status];

          return (
            <div
              key={match.id}
              className={cn(
                'rounded-lg border p-4 transition-all',
                match.status === 'scheduled' && 'border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5',
                match.status === 'completed' && 'border-green-200 bg-green-50/30',
                match.status === 'skipped' && 'opacity-60'
              )}
            >
              {/* Partner + status */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-11 w-11 ring-2 ring-background shadow-sm">
                  <AvatarImage src={partner?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
                    {getInitials(partner?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{partner?.full_name ?? getInitials(partner?.full_name)}</p>
                  {partner?.headline && (
                    <p className="text-xs text-muted-foreground truncate">{partner.headline}</p>
                  )}
                </div>
                <Badge className={cn('text-[11px] hover:bg-transparent', config.className)}>
                  {config.label}
                </Badge>
              </div>

              {/* Timeslot + reason */}
              <div className="space-y-1.5 mb-3">
                {slot && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{DAY_LABELS[slot.day_of_week]} {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</span>
                    <span className="text-muted-foreground/50">|</span>
                    <span>Week of {match.week_of}</span>
                  </div>
                )}
                {match.match_reason && (
                  <p className="text-xs text-muted-foreground/80 italic leading-relaxed pl-0.5">
                    "{match.match_reason}"
                  </p>
                )}
              </div>

              {/* Actions */}
              {match.status === 'scheduled' && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  {match.video_call_url && (
                    <Button
                      size="sm"
                      className="gap-1.5 h-8 text-xs gradient-primary text-white hover:opacity-90"
                      onClick={() => window.open(match.video_call_url!, '_blank')}
                    >
                      <Video className="h-3.5 w-3.5" />
                      Join Call
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 text-xs text-green-600 border-green-300 hover:bg-green-50"
                    onClick={() => updateStatus.mutate({ matchId: match.id, status: 'completed', groupId })}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Done
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 h-8 text-xs text-muted-foreground"
                    onClick={() => updateStatus.mutate({ matchId: match.id, status: 'skipped', groupId })}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Skip
                  </Button>
                </div>
              )}

              {/* Feedback */}
              {match.status === 'completed' && (
                <>
                  {showFeedbackForm ? (
                    <div className="space-y-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-medium text-foreground">How was the conversation?</p>
                      <StarRating value={rating} onChange={setRating} />
                      <Textarea
                        placeholder="Optional note..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="text-sm h-16 resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleSubmitFeedback(match.id)}
                          disabled={rating === 0 || submitFeedback.isPending}
                        >
                          Submit Feedback
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => { setFeedbackOpen(null); setRating(0); setNote(''); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => setFeedbackOpen(match.id)}
                      >
                        <MessageSquare className="h-3 w-3" />
                        Leave feedback
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
