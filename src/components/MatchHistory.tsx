import { useState } from 'react';
import { useMatchHistory, useSubmitFeedback } from '@/hooks/useMatchHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { History, Star, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5"
        >
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

export function MatchHistory() {
  const { data: matches = [], isLoading } = useMatchHistory();
  const submitFeedback = useSubmitFeedback();
  const [feedbackOpen, setFeedbackOpen] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">Loading match history...</CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Match History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No matches yet. Join a group and confirm your timeslots to get matched!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Match History
          <Badge variant="secondary" className="ml-auto">{matches.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.map((match) => {
          const partner = match.partner_profile;
          const hasFeedback = !!match.my_feedback;
          const showFeedbackForm = feedbackOpen === match.id;

          return (
            <div key={match.id} className="border rounded-lg p-3 space-y-2">
              {/* Partner + status row */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={partner?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(partner?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{partner?.full_name ?? 'Unknown'}</p>
                  {partner?.headline && (
                    <p className="text-xs text-muted-foreground truncate">{partner.headline}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <Badge
                    variant={match.status === 'completed' ? 'default' : match.status === 'skipped' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {match.status}
                  </Badge>
                  {match.group_name && (
                    <p className="text-xs text-muted-foreground mt-1">{match.group_name}</p>
                  )}
                </div>
              </div>

              {/* Match reason + date */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {match.match_reason && <span className="italic">"{match.match_reason}"</span>}
                <span>{new Date(match.created_at).toLocaleDateString()}</span>
              </div>

              {/* Feedback */}
              {hasFeedback ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Your rating:</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          'h-3.5 w-3.5',
                          s <= (match.my_feedback?.rating ?? 0)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/20'
                        )}
                      />
                    ))}
                  </div>
                  {match.my_feedback?.note && (
                    <span className="text-muted-foreground italic ml-1">"{match.my_feedback.note}"</span>
                  )}
                </div>
              ) : match.status === 'completed' ? (
                <>
                  {showFeedbackForm ? (
                    <div className="space-y-2 pt-1 border-t">
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
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
