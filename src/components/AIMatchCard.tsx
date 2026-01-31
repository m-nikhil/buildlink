import { Profile, EXPERIENCE_LABELS, INDUSTRY_LABELS } from '@/types/profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, MapPin } from 'lucide-react';
import { useConnectionStatus, useSendConnectionRequest } from '@/hooks/useConnections';
import { useProfile } from '@/hooks/useProfile';

interface AIMatchCardProps {
  profile: Profile;
  score: number;
  reason: string;
}

export function AIMatchCard({ profile, score, reason }: AIMatchCardProps) {
  const connection = useConnectionStatus(profile.user_id);
  const { data: myProfile } = useProfile();
  const sendRequest = useSendConnectionRequest();

  // Use stored initials, fallback to computing from name
  const initials = profile.initials || (profile.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()) || '?';

  const handleConnect = () => {
    sendRequest.mutate({ recipientId: profile.user_id });
  };

  // Determine connection status
  const getConnectionState = () => {
    if (!connection) return 'none';
    if (connection.status === 'accepted') return 'connected';
    if (connection.status === 'pending') {
      if (connection.requester_id === myProfile?.user_id) return 'pending_sent';
      return 'pending_received';
    }
    return 'none';
  };

  const connectionState = getConnectionState();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow border-primary/20">
      <div className="h-16 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 relative">
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-primary">{score}% match</span>
        </div>
      </div>
      <CardContent className="pt-0">
        <div className="flex flex-col items-center -mt-10">
          <Avatar className="h-20 w-20 border-4 border-background shadow-md">
            <AvatarImage src={profile.avatar_url || undefined} alt={initials} />
            <AvatarFallback className="text-lg bg-primary/10">{initials}</AvatarFallback>
          </Avatar>
          <h3 className="mt-3 font-semibold text-lg">{initials}</h3>
          {profile.headline && (
            <p className="text-sm text-muted-foreground text-center line-clamp-2 mt-1">
              {profile.headline}
            </p>
          )}
          {profile.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              <span>{profile.location}</span>
            </div>
          )}
        </div>

        {/* AI Match Reason */}
        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-primary">Why you match:</span> {reason}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {profile.industry && (
            <Badge variant="secondary" className="text-xs">
              {INDUSTRY_LABELS[profile.industry]}
            </Badge>
          )}
          {profile.experience_level && (
            <Badge variant="outline" className="text-xs">
              {EXPERIENCE_LABELS[profile.experience_level]}
            </Badge>
          )}
        </div>

        <div className="mt-4">
          {connectionState === 'none' && (
            <Button 
              onClick={handleConnect} 
              className="w-full gap-2"
              disabled={sendRequest.isPending}
            >
              <Sparkles className="h-4 w-4" />
              {sendRequest.isPending ? 'Connecting...' : 'Connect'}
            </Button>
          )}
          {connectionState === 'pending_sent' && (
            <Button variant="secondary" className="w-full" disabled>
              Request Sent
            </Button>
          )}
          {connectionState === 'pending_received' && (
            <Button variant="outline" className="w-full" disabled>
              Respond to Request
            </Button>
          )}
          {connectionState === 'connected' && (
            <Button variant="ghost" className="w-full" disabled>
              Connected
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
