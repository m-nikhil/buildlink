import { useState } from 'react';
import { useCreateGroup } from '@/hooks/useGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { COMMON_TIMEZONES } from '@/types/group';

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [timezone, setTimezone] = useState(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return COMMON_TIMEZONES.includes(local) ? local : 'UTC';
  });
  const createGroup = useCreateGroup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createGroup.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        visibility: isPublic ? 'public' : 'private',
        approvalRequired: isPublic ? approvalRequired : false,
        timezone,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setDescription('');
          setIsPublic(false);
          setApprovalRequired(true);
          setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a Group</DialogTitle>
            <DialogDescription>
              Create a group for weekly 1:1 matching. You can create up to 5 groups.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                placeholder="e.g. Frontend Engineers Coffee Chat"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What's this group about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <p className="text-xs text-muted-foreground">
                Timeslot times will be in this timezone
              </p>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="public">Public Group</Label>
                <p className="text-sm text-muted-foreground">
                  {isPublic ? 'Anyone can discover this group' : 'Invite-only via invite code'}
                </p>
              </div>
              <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            {isPublic && (
              <div className="flex items-center justify-between pl-4 border-l-2">
                <div>
                  <Label htmlFor="approval">Require Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    {approvalRequired ? 'You review each request before they join' : 'Anyone can join instantly'}
                  </p>
                </div>
                <Switch id="approval" checked={approvalRequired} onCheckedChange={setApprovalRequired} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createGroup.isPending}>
              {createGroup.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
