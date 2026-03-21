import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAddTimeslot, useRemoveTimeslot, useSubscribeTimeslot, useUnsubscribeTimeslot } from '@/hooks/useGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle, Circle } from 'lucide-react';
import type { GroupTimeslot, TimeslotSubscription } from '@/types/group';
import { DAY_LABELS, MAX_TIMESLOTS_PER_GROUP } from '@/types/group';

interface TimeslotManagerProps {
  groupId: string;
  timeslots: GroupTimeslot[];
  subscriptions: TimeslotSubscription[];
  isOwner: boolean;
  profiles: any[];
}

export function TimeslotManager({ groupId, timeslots, subscriptions, isOwner, profiles }: TimeslotManagerProps) {
  const { user } = useAuth();
  const addTimeslot = useAddTimeslot();
  const removeTimeslot = useRemoveTimeslot();
  const subscribe = useSubscribeTimeslot();
  const unsubscribe = useUnsubscribeTimeslot();

  const [showAdd, setShowAdd] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [label, setLabel] = useState('');

  const handleAdd = () => {
    addTimeslot.mutate(
      { groupId, dayOfWeek: parseInt(dayOfWeek), startTime, endTime, label: label.trim() || undefined },
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
                    {Object.entries(DAY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
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

      <div className="space-y-2">
        {timeslots.map((slot) => {
          const subscribed = isSubscribed(slot.id);
          const count = subscriberCount(slot.id);
          const names = subscriberNames(slot.id);

          return (
            <Card key={slot.id} className={subscribed ? 'border-primary/50 bg-primary/5' : ''}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{DAY_LABELS[slot.day_of_week]}</span>
                    <span className="text-sm text-muted-foreground">
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    </span>
                    {slot.label && <Badge variant="secondary" className="text-xs">{slot.label}</Badge>}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">{count} subscribed</span>
                    {names.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        — {names.slice(0, 3).join(', ')}{names.length > 3 ? ` +${names.length - 3}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeTimeslot.mutate({ timeslotId: slot.id, groupId })}
                    >
                      <Trash2 className="h-4 w-4" />
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
