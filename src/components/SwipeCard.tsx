import { useState } from 'react';
import { Profile, EXPERIENCE_LABELS, INDUSTRY_LABELS, GOAL_LABELS } from '@/types/profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserPlus, X, MapPin, Briefcase, Sparkles, Heart } from 'lucide-react';
import { useConnectionStatus, useSendConnectionRequest } from '@/hooks/useConnections';
import { useProfile } from '@/hooks/useProfile';
import { useConfetti } from '@/hooks/useConfetti';
import { motion } from 'framer-motion';

interface SwipeCardProps {
  profile: Profile;
  score?: number;
  reason?: string;
  onLike: () => void;
  onPass: () => void;
}

export function SwipeCard({ profile, score, reason, onLike, onPass }: SwipeCardProps) {
  const connection = useConnectionStatus(profile.id);
  const { data: myProfile } = useProfile();
  const sendRequest = useSendConnectionRequest();
  const { fireMatch } = useConfetti();
  const [isExiting, setIsExiting] = useState<'left' | 'right' | null>(null);

  const initials = profile.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const handleLike = () => {
    setIsExiting('right');
    // Use user_id (Firebase UID) for connection requests, not document id
    const recipientId = profile.user_id || profile.id;
    console.log('[SwipeCard] Sending connection request to:', recipientId);
    sendRequest.mutate(
      { recipientId },
      {
        onSuccess: (data) => {
          if ((data as any).isMutualMatch) {
            fireMatch();
          }
        },
      }
    );
    setTimeout(onLike, 300);
  };

  const handlePass = () => {
    setIsExiting('left');
    setTimeout(onPass, 300);
  };

  // Check if already connected
  const isConnected = connection?.status === 'accepted';
  const isPending = connection?.status === 'pending';
  
  // Check if they liked us first (they sent a request to us)
  const theyLikedUs = connection?.requester_id === profile.id && connection?.recipient_id === myProfile?.id;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        x: isExiting === 'left' ? -300 : isExiting === 'right' ? 300 : 0,
        rotate: isExiting === 'left' ? -20 : isExiting === 'right' ? 20 : 0,
      }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm mx-auto"
    >
      <Card className="overflow-hidden shadow-xl">
        {/* Profile Image */}
        <div className="relative h-96 bg-gradient-to-b from-primary/20 to-primary/5">
          <Avatar className="absolute inset-0 h-full w-full rounded-none">
            <AvatarImage 
              src={profile.avatar_url || undefined} 
              alt={profile.full_name || 'User'} 
              className="object-cover"
            />
            <AvatarFallback className="text-6xl rounded-none bg-gradient-to-br from-primary/30 to-primary/10">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          {/* They Liked You Badge */}
          {theyLikedUs && (
            <div className="absolute top-4 left-4 flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-full shadow-lg animate-pulse">
              <Heart className="h-4 w-4 fill-current" />
              <span className="font-semibold text-sm">Likes you!</span>
            </div>
          )}

          {/* Match Score Badge */}
          {score && (
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">{score}% compatible</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="p-6 -mt-16 relative">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold">{initials}</h2>
            {profile.age && (
              <span className="text-lg text-muted-foreground">, {profile.age}</span>
            )}
          </div>

          {profile.headline && (
            <p className="text-center text-muted-foreground mb-4 line-clamp-2">
              {profile.headline}
            </p>
          )}

          {profile.location && (
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-4">
              <MapPin className="h-4 w-4" />
              <span>{profile.location}</span>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {profile.industry && (
              <Badge variant="secondary" className="gap-1">
                <Briefcase className="h-3 w-3" />
                {INDUSTRY_LABELS[profile.industry]}
              </Badge>
            )}
            {profile.experience_level && (
              <Badge variant="outline">
                {EXPERIENCE_LABELS[profile.experience_level]}
              </Badge>
            )}
          </div>

          {/* Looking For */}
          {profile.looking_for && profile.looking_for.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mb-4">
              {profile.looking_for.map((goal) => (
                <Badge key={goal} variant="secondary" className="text-xs">
                  {GOAL_LABELS[goal]}
                </Badge>
              ))}
            </div>
          )}

          {/* AI Match Reason */}
          {reason && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 mb-6">
              <p className="text-sm text-center text-muted-foreground">
                <span className="font-medium text-primary">Why connect:</span> {reason}
              </p>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-muted-foreground text-center mb-6 line-clamp-3">
              {profile.bio}
            </p>
          )}

          {/* Action Buttons */}
          {!isConnected && (
            <div className="flex justify-center gap-6">
              <Button
                onClick={handlePass}
                variant="outline"
                size="lg"
                className="h-16 w-16 rounded-full border-2 hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-8 w-8" />
              </Button>
              <Button
                onClick={handleLike}
                size="lg"
                className={`h-16 w-16 rounded-full shadow-lg ${theyLikedUs ? 'bg-green-500 hover:bg-green-600' : ''}`}
                disabled={sendRequest.isPending}
              >
                <UserPlus className="h-8 w-8" />
              </Button>
            </div>
          )}

          {theyLikedUs && !isConnected && (
            <p className="text-center text-sm text-green-600 mt-3 font-medium">
              Like back to connect instantly!
            </p>
          )}

          {isConnected && (
            <div className="text-center py-4">
              <Badge className="text-base px-4 py-2 bg-green-500">
                ✓ Connected
              </Badge>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
