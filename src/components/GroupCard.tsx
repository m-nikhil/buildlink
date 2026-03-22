import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Users, Lock, Globe, Crown, ChevronRight, Clock } from 'lucide-react';
import type { Group } from '@/types/group';

interface GroupCardProps {
  group: Group & { myRole: 'owner' | 'member' };
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link to={`/groups/${group.id}`} className="block group">
      <div className="relative overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5">
        {/* Top accent bar */}
        <div className="h-1 w-full gradient-primary" />

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-base truncate">{group.name}</h3>
                {group.myRole === 'owner' && (
                  <Badge className="gap-1 bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/10 shrink-0">
                    <Crown className="h-3 w-3" />
                    Owner
                  </Badge>
                )}
              </div>
              {group.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{group.description}</p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {group.visibility === 'public' ? (
                <Globe className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              <span>{group.visibility === 'public' ? 'Public' : 'Private'}</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Weekly 1:1</span>
            </div>
            {group.timezone && group.timezone !== 'UTC' && (
              <>
                <div className="h-3 w-px bg-border" />
                <span className="text-xs text-muted-foreground truncate">
                  {group.timezone.replace(/_/g, ' ').split('/').pop()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
