import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  useAddTimeslot,
  useRemoveTimeslot,
  useSubscribeTimeslot,
  useUnsubscribeTimeslot,
  useConfirmTimeslot,
  useUnconfirmTimeslot,
  useTriggerMatching,
} from '@/hooks/useGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle, Circle, CalendarCheck, Clock, Zap } from 'lucide-react';
import type { GroupTimeslot, TimeslotSubscription, TimeslotConfirmation } from '@/types/group';
import {
  DAY_LABELS,
  MAX_TIMESLOTS_PER_GROUP,
  isConfirmWindowOpen,
  isConfirmWindowClosed,
  daysUntilTimeslot,
  getWeekOf,
  getNextOccurrence,
} from '@/types/group';

interface TimeslotManagerProps {
  groupId: string;
  timeslots: GroupTimeslot[];
  subscriptions: TimeslotSubscription[];
  confirmations: TimeslotConfirmation[];
  isOwner: boolean;
  profiles: any[];
}

export function TimeslotManager({ groupId, timeslots, subscriptions, confirmations, isOwner, profiles }: TimeslotManagerProps) {
  const { user } = useAuth();
  const addTimeslot = useAddTimeslot();
  const removeTimeslot = useRemoveTimeslot();
  const subscribe = useSubscribeTimeslot();
  const unsubscribe = useUnsubscribeTimeslot();
  const confirm = useConfirmTimeslot();
  const unconfirm = useUnconfirmTimeslot();
  const triggerMatching = useTriggerMatching();

  const [showAdd, setShowAdd] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [startTime, setStartTime] = useState('09:00');
  const [label, setLabel] = useState('');

  const handleAdd = () => {
    addTimeslot.mutate(
      { groupId, dayOfWeek: parseInt(dayOfWeek), startTime, label: label.trim() || undefined },
      { onSuccess: () => { setShowAdd(false); setLabel(''); } }
    );
  };

  const isSubscribed = (timeslotId: string) =>
    subscriptions.some((s) => s.timeslot_id === timeslotId && s.user_id === user?.id);

  const subscriberCount = (timeslotId: string) =>
    subscriptions.filter((s) => s.timeslot_id === timeslotId).length;

  const subscriberNames = (timeslotId: string) =>
    subscriptions
      .filter((s) => s.timeslot_id === timeslotId)
      .map((s) => {
        const profile = profiles.find((p: any) => p.user_id === s.user_id);
        return profile?.full_name ?? 'Unknown';
      });

  // Confirmation helpers for a specific timeslot
  const getWeekOfForSlot = (dayOfWeek: number) => {
    const next = getNextOccurrence(dayOfWeek);
    return getWeekOf(next);
  };

  const isConfirmed = (timeslotId: string, weekOf: string) =>
    confirmations.some((c) => c.timeslot_id === timeslotId && c.user_id === user?.id && c.week_of === weekOf);

  const confirmedCount = (timeslotId: string, weekOf: string) =>
    confirmations.filter((c) => c.timeslot_id === timeslotId && c.week_of === weekOf).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Timeslots</h3>
        {isOwner && timeslots.length < MAX_TIMESLOTS_PER_GROUP && (
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4" />
            Add Timeslot
          </Button>
        )}
      </div>

      {isOwner && timeslots.length >= MAX_TIMESLOTS_PER_GROUP && (
        <p className="text-sm text-muted-foreground">Maximum {MAX_TIMESLOTS_PER_GROUP} timeslots reached.</p>
      )}

      {showAdd && isOwner && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Day</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DAY_LABELS).map(([val, lbl]) => (
                      <SelectItem key={val} value={val}>{lbl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Label (optional)</Label>
                <Input
                  placeholder="e.g. Morning sync"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Start Time (30-min slot)</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={addTimeslot.isPending}>
                {addTimeslot.isPending ? 'Adding...' : 'Add'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {timeslots.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {isOwner ? 'Add timeslots for members to subscribe to.' : 'No timeslots yet. The group owner will add them.'}
        </p>
      )}

      <div className="space-y-3">
        {timeslots.map((slot) => {
          const subscribed = isSubscribed(slot.id);
          const count = subscriberCount(slot.id);
          const names = subscriberNames(slot.id);
          const days = daysUntilTimeslot(slot.day_of_week);
          const windowOpen = isConfirmWindowOpen(slot.day_of_week);
          const windowClosed = isConfirmWindowClosed(slot.day_of_week);
          const weekOf = getWeekOfForSlot(slot.day_of_week);
          const confirmed = isConfirmed(slot.id, weekOf);
          const numConfirmed = confirmedCount(slot.id, weekOf);

          // Status label
          let statusBadge = null;
          if (windowOpen) {
            statusBadge = (
              <Badge variant="default" className="gap-1 text-xs bg-amber-500 hover:bg-amber-500">
                <CalendarCheck className="h-3 w-3" />
                Confirm by {days - 1}d
              </Badge>
            );
          } else if (windowClosed) {
            statusBadge = (
              <Badge variant="default" className="gap-1 text-xs bg-green-600 hover:bg-green-600">
                <Clock className="h-3 w-3" />
                Matching {days === 1 ? 'today' : 'tomorrow'}
              </Badge>
            );
          } else {
            statusBadge = (
              <Badge variant="outline" className="gap-1 text-xs">
                <Clock className="h-3 w-3" />
                In {days} days
              </Badge>
            );
          }

          return (
            <Card key={slot.id} className={subscribed ? 'border-primary/50 bg-primary/5' : ''}>
              <CardContent className="py-3 space-y-2">
                {/* Top row: day, time, badges */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{DAY_LABELS[slot.day_of_week]}</span>
                    <span className="text-sm text-muted-foreground">
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    </span>
                    {slot.label && <Badge variant="secondary" className="text-xs">{slot.label}</Badge>}
                    {statusBadge}
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() => removeTimeslot.mutate({ timeslotId: slot.id, groupId })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Subscriber info */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{count} subscribed</span>
                  {names.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      — {names.slice(0, 3).join(', ')}{names.length > 3 ? ` +${names.length - 3}` : ''}
                    </span>
                  )}
                  {numConfirmed > 0 && (
                    <span className="text-xs text-green-600 ml-2">
                      {numConfirmed} confirmed this week
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Subscribe/unsubscribe */}
                  <Button
                    variant={subscribed ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      if (subscribed) {
                        unsubscribe.mutate({ timeslotId: slot.id, groupId });
                      } else {
                        subscribe.mutate({ timeslotId: slot.id, groupId });
                      }
                    }}
                    disabled={subscribe.isPending || unsubscribe.isPending}
                  >
                    {subscribed ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    {subscribed ? 'Subscribed' : 'Subscribe'}
                  </Button>

                  {/* Confirm/unconfirm (only if subscribed and window is open) */}
                  {subscribed && windowOpen && (
                    <Button
                      variant={confirmed ? 'default' : 'outline'}
                      size="sm"
                      className={`gap-1 ${confirmed ? 'bg-green-600 hover:bg-green-700' : 'border-amber-500 text-amber-600 hover:bg-amber-50'}`}
                      onClick={() => {
                        if (confirmed) {
                          unconfirm.mutate({ timeslotId: slot.id, groupId, weekOf });
                        } else {
                          confirm.mutate({ timeslotId: slot.id, groupId, weekOf });
                        }
                      }}
                      disabled={confirm.isPending || unconfirm.isPending}
                    >
                      <CalendarCheck className="h-4 w-4" />
                      {confirmed ? 'Confirmed' : 'Confirm this week'}
                    </Button>
                  )}

                  {/* Already confirmed but window closed */}
                  {subscribed && windowClosed && confirmed && (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Confirmed
                    </Badge>
                  )}

                  {/* Owner: trigger matching */}
                  {isOwner && windowClosed && numConfirmed >= 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 border-primary text-primary"
                      onClick={() => triggerMatching.mutate({ timeslotId: slot.id, groupId })}
                      disabled={triggerMatching.isPending}
                    >
                      <Zap className="h-4 w-4" />
                      {triggerMatching.isPending ? 'Matching...' : 'Run Matching'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
