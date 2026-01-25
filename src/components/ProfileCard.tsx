import { Profile, EXPERIENCE_LABELS, GOAL_LABELS, INDUSTRY_LABELS } from '@/types/profile';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, UserPlus, Check, Clock, Linkedin } from 'lucide-react';
import { useSendConnectionRequest, useConnectionStatus } from '@/hooks/useConnections';

interface ProfileCardProps {
  profile: Profile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const sendRequest = useSendConnectionRequest();
  const connectionStatus = useConnectionStatus(profile.user_id);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleConnect = () => {
    sendRequest.mutate({ recipientId: profile.user_id });
  };

  const renderConnectionButton = () => {
    if (connectionStatus) {
      if (connectionStatus.status === 'accepted') {
        return (
          <Button variant="secondary" size="sm" disabled className="gap-2">
            <Check className="h-4 w-4" />
            Connected
          </Button>
        );
      }
      if (connectionStatus.status === 'pending') {
        return (
          <Button variant="outline" size="sm" disabled className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
          </Button>
        );
      }
    }

    return (
      <Button 
        onClick={handleConnect} 
        size="sm" 
        className="gap-2"
        disabled={sendRequest.isPending}
      >
        <UserPlus className="h-4 w-4" />
        Connect
      </Button>
    );
  };

  return (
    <Card className="card-hover overflow-hidden">
      <div className="h-20 gradient-primary" />
      <CardContent className="relative pt-0">
        <div className="flex flex-col items-center -mt-12">
          <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? 'User'} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>

          <div className="mt-4 text-center">
            <h3 className="text-lg font-semibold">{profile.full_name || 'Anonymous User'}</h3>
            {profile.headline && (
              <p className="text-sm text-muted-foreground mt-1">{profile.headline}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {profile.location}
              </span>
            )}
            {profile.industry && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {INDUSTRY_LABELS[profile.industry]}
              </span>
            )}
          </div>

          {profile.experience_level && (
            <Badge variant="secondary" className="mt-3">
              {EXPERIENCE_LABELS[profile.experience_level]}
            </Badge>
          )}

          {profile.looking_for && profile.looking_for.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {profile.looking_for.map((goal) => (
                <Badge key={goal} variant="outline" className="text-xs">
                  {GOAL_LABELS[goal]}
                </Badge>
              ))}
            </div>
          )}

          {profile.bio && (
            <p className="text-sm text-muted-foreground text-center mt-4 line-clamp-2">
              {profile.bio}
            </p>
          )}

          <div className="flex items-center gap-2 mt-4 w-full">
            {renderConnectionButton()}
            {profile.linkedin_url && (
              <Button 
                variant="outline" 
                size="sm" 
                asChild
                className="gap-2"
              >
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
