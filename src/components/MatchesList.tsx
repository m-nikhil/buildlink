import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateMatchStatus } from '@/hooks/useGroups';
import { useSubmitFeedback } from '@/hooks/useMatchHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Video, CheckCircle, XCircle, Calendar, Star, MessageSquare } from 'lucide-react';
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
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)} className="p-0.5">
          <Star
            className={cn(
              'h-5 w-5 transition-colors',
              star <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Your Matches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {myMatches.map((match) => {
          const partner = getPartnerProfile(match);
          const slot = getTimeslot(match.timeslot_id);
          const showFeedbackForm = feedbackOpen === match.id;

          return (
            <Card key={match.id} className="border-primary/20">
              <CardContent className="py-3 space-y-3">
                {/* Partner info - names hidden, initials only */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {getInitials(partner?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{getInitials(partner?.full_name)}</p>
                    {partner?.headline && (
                      <p className="text-sm text-muted-foreground truncate">{partner.headline}</p>
                    )}
                  </div>
                  <Badge
                    variant={match.status === 'completed' ? 'default' : match.status === 'skipped' ? 'secondary' : 'outline'}
                    className={match.status === 'scheduled' ? 'border-amber-400 text-amber-600' : ''}
                  >
                    {match.status === 'scheduled' ? 'Upcoming' : match.status === 'completed' ? 'Done' : 'Skipped'}
                  </Badge>
                </div>

                {/* Timeslot info */}
                {slot && (
                  <p className="text-sm text-muted-foreground">
                    {DAY_LABELS[slot.day_of_week]} {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    {' '}(week of {match.week_of})
                  </p>
                )}

                {/* Match reason */}
                {match.match_reason && (
                  <p className="text-sm italic text-muted-foreground">"{match.match_reason}"</p>
                )}

                {/* Actions for scheduled */}
                {match.status === 'scheduled' && (
                  <div className="flex items-center gap-2">
                    {match.video_call_url && (
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => window.open(match.video_call_url!, '_blank')}
                      >
                        <Video className="h-4 w-4" />
                        Join Call
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-green-600"
                      onClick={() => updateStatus.mutate({ matchId: match.id, status: 'completed', groupId })}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Done
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground"
                      onClick={() => updateStatus.mutate({ matchId: match.id, status: 'skipped', groupId })}
                      disabled={updateStatus.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                      Skip
                    </Button>
                  </div>
                )}

                {/* Feedback for completed */}
                {match.status === 'completed' && (
                  <>
                    {showFeedbackForm ? (
                      <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs font-medium">How was the conversation?</p>
                        <StarRating value={rating} onChange={setRating} />
                        <Textarea
                          placeholder="Optional note..."
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="text-sm h-16"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSubmitFeedback(match.id)}
                            disabled={rating === 0 || submitFeedback.isPending}
                          >
                            Submit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setFeedbackOpen(null);
                              setRating(0);
                              setNote('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setFeedbackOpen(match.id)}
                      >
                        <MessageSquare className="h-3 w-3" />
                        Leave feedback
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
