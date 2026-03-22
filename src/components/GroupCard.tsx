import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Lock, Globe, Crown } from 'lucide-react';
import type { Group } from '@/types/group';

interface GroupCardProps {
  group: Group & { myRole: 'owner' | 'member' };
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link to={`/groups/${group.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{group.name}</CardTitle>
            <div className="flex items-center gap-2">
              {group.myRole === 'owner' && (
                <Badge variant="secondary" className="gap-1">
                  <Crown className="h-3 w-3" />
                  Owner
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                {group.visibility === 'public' ? (
                  <Globe className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                {group.visibility === 'public' ? 'Public' : 'Private'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {group.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{group.description}</p>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>Weekly 1:1 matching</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
