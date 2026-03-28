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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle, Circle, CalendarCheck, Clock, Zap, Users } from 'lucide-react';
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
        return profile?.full_name?.split(' ')[0] ?? 'Unknown';
      });

  const getWeekOfForSlot = (dayOfWeek: number) => {
    const next = getNextOccurrence(dayOfWeek);
    return getWeekOf(next);
  };

  const isConfirmed = (timeslotId: string, weekOf: string) =>
    confirmations.some((c) => c.timeslot_id === timeslotId && c.user_id === user?.id && c.week_of === weekOf);

  const confirmedCount = (timeslotId: string, weekOf: string) =>
    confirmations.filter((c) => c.timeslot_id === timeslotId && c.week_of === weekOf).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Timeslots
          </CardTitle>
          {isOwner && timeslots.length < MAX_TIMESLOTS_PER_GROUP && (
            <Button variant="outline" size="sm" className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          )}
        </div>
        {isOwner && timeslots.length >= MAX_TIMESLOTS_PER_GROUP && (
          <p className="text-xs text-muted-foreground">Maximum {MAX_TIMESLOTS_PER_GROUP} timeslots reached</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {showAdd && isOwner && (
          <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Day</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DAY_LABELS).map(([val, lbl]) => (
                      <SelectItem key={val} value={val}>{lbl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Label (optional)</Label>
                <Input
                  placeholder="e.g. Morning sync"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 48 }, (_, i) => {
                    const h = String(Math.floor(i / 2)).padStart(2, '0');
                    const m = i % 2 === 0 ? '00' : '30';
                    return (
                      <SelectItem key={`${h}:${m}`} value={`${h}:${m}`}>
                        {`${h}:${m}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleAdd} disabled={addTimeslot.isPending}>
                {addTimeslot.isPending ? 'Adding...' : 'Add Timeslot'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {timeslots.length === 0 && (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {isOwner ? 'Add your first timeslot for members to subscribe to.' : 'No timeslots yet. The group owner will add them.'}
            </p>
          </div>
        )}

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

          return (
            <div
              key={slot.id}
              className={`relative rounded-lg border p-3 transition-all ${
                subscribed
                  ? 'border-primary/40 bg-gradient-to-r from-primary/5 to-accent/5 shadow-sm'
                  : 'hover:border-border/80'
              }`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{DAY_LABELS[slot.day_of_week]}</span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                  </span>
                  {slot.label && (
                    <Badge variant="secondary" className="text-[11px] font-normal">{slot.label}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {windowOpen ? (
                    <Badge className="gap-1 text-[11px] bg-amber-500/15 text-amber-600 border-amber-300 hover:bg-amber-500/15">
                      <CalendarCheck className="h-3 w-3" />
                      Confirm by {days - 1}d
                    </Badge>
                  ) : windowClosed ? (
                    <Badge className="gap-1 text-[11px] bg-green-500/15 text-green-600 border-green-300 hover:bg-green-500/15">
                      <Zap className="h-3 w-3" />
                      {days === 1 ? 'Today' : 'Tomorrow'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-[11px]">
                      <Clock className="h-3 w-3" />
                      {days}d
                    </Badge>
                  )}
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeTimeslot.mutate({ timeslotId: slot.id, groupId })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Subscriber row */}
              <div className="flex items-center gap-1.5 mb-2.5 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{count} subscribed</span>
                {names.length > 0 && (
                  <span className="truncate">
                    — {names.slice(0, 3).join(', ')}{names.length > 3 ? ` +${names.length - 3}` : ''}
                  </span>
                )}
                {numConfirmed > 0 && (
                  <Badge className="ml-auto text-[10px] h-4 bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/10">
                    {numConfirmed} confirmed
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={subscribed ? 'default' : 'outline'}
                  size="sm"
                  className={`gap-1.5 h-8 text-xs ${subscribed ? '' : 'text-primary border-primary/30 hover:bg-primary/5'}`}
                  onClick={() => {
                    if (subscribed) {
                      unsubscribe.mutate({ timeslotId: slot.id, groupId });
                    } else {
                      subscribe.mutate({ timeslotId: slot.id, groupId });
                    }
                  }}
                  disabled={subscribe.isPending || unsubscribe.isPending}
                >
                  {subscribed ? <CheckCircle className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                  {subscribed ? 'Subscribed' : 'Subscribe'}
                </Button>

                {subscribed && windowOpen && (
                  <Button
                    variant={confirmed ? 'default' : 'outline'}
                    size="sm"
                    className={`gap-1.5 h-8 text-xs ${confirmed ? 'bg-green-600 hover:bg-green-700' : 'border-amber-400 text-amber-600 hover:bg-amber-50'}`}
                    onClick={() => {
                      if (confirmed) {
                        unconfirm.mutate({ timeslotId: slot.id, groupId, weekOf });
                      } else {
                        confirm.mutate({ timeslotId: slot.id, groupId, weekOf });
                      }
                    }}
                    disabled={confirm.isPending || unconfirm.isPending}
                  >
                    <CalendarCheck className="h-3.5 w-3.5" />
                    {confirmed ? 'Confirmed' : 'Confirm this week'}
                  </Button>
                )}

                {subscribed && windowClosed && confirmed && (
                  <Badge className="text-[11px] bg-green-500/15 text-green-600 border-green-300 hover:bg-green-500/15">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Confirmed
                  </Badge>
                )}

                {isOwner && windowClosed && numConfirmed >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 text-xs ml-auto border-accent text-accent hover:bg-accent/10"
                    onClick={() => triggerMatching.mutate({ timeslotId: slot.id, groupId })}
                    disabled={triggerMatching.isPending}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {triggerMatching.isPending ? 'Matching...' : 'Run Matching'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
