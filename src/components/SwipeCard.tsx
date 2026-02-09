import { useState } from 'react';
import { Profile, EXPERIENCE_LABELS, INDUSTRY_LABELS, GOAL_LABELS } from '@/types/profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserPlus, X, MapPin, Briefcase, Sparkles, Heart } from 'lucide-react';
import { useConnectionStatus, useSendConnectionRequest } from '@/hooks/useConnections';
import { useProfile } from '@/hooks/useProfile';
import { motion } from 'framer-motion';

interface SwipeCardProps {
  profile: Profile;
  score?: number;
  reason?: string;
  likesYou?: boolean;
  onLike: () => void;
  onPass: () => void;
}

export function SwipeCard({ profile, score, reason, likesYou, onLike, onPass }: SwipeCardProps) {
  const connection = useConnectionStatus(profile.user_id);
  const { data: myProfile } = useProfile();
  const sendRequest = useSendConnectionRequest();
  const [isExiting, setIsExiting] = useState<'left' | 'right' | null>(null);

  // Use stored initials, fallback to computing from name
  const initials = profile.initials || (profile.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()) || '?';

  const handleLike = () => {
    setIsExiting('right');
    sendRequest.mutate({ recipientId: profile.user_id });
    setTimeout(onLike, 300);
  };

  const handlePass = () => {
    setIsExiting('left');
    setTimeout(onPass, 300);
  };

  // Check if already connected
  const isConnected = connection?.status === 'accepted';
  
  // Use the likesYou prop from AI match, or fallback to checking connection
  const theyLikedUs = likesYou || (connection?.requester_id === profile.user_id && connection?.recipient_id === myProfile?.user_id && connection?.status === 'pending');

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
        <div className="relative h-52 bg-gradient-to-b from-primary/20 to-primary/5">
          <Avatar className="absolute inset-0 h-full w-full rounded-none">
            <AvatarImage 
              src={profile.avatar_url || undefined} 
              alt={initials} 
              className="object-cover"
            />
            <AvatarFallback className="text-4xl rounded-none bg-gradient-to-br from-primary/30 to-primary/10">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          {/* They Liked You Badge */}
          {theyLikedUs && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded-full shadow-lg animate-pulse">
              <Heart className="h-3 w-3 fill-current" />
              <span className="font-semibold text-xs">Likes you!</span>
            </div>
          )}

          {/* Match Score Badge */}
          {score && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-lg">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="font-semibold text-sm text-primary">{score}%</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-4 -mt-10 relative">
          <div className="text-center mb-1">
            <h2 className="text-xl font-bold">{initials}</h2>
          </div>

          {profile.headline && (
            <p className="text-center text-sm text-muted-foreground mb-2 line-clamp-1">
              {profile.headline}
            </p>
          )}

          {profile.location && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPin className="h-3 w-3" />
              <span>{profile.location}</span>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-2">
            {profile.industry && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Briefcase className="h-3 w-3" />
                {INDUSTRY_LABELS[profile.industry]}
              </Badge>
            )}
            {profile.experience_level && (
              <Badge variant="outline" className="text-xs">
                {EXPERIENCE_LABELS[profile.experience_level]}
              </Badge>
            )}
          </div>

          {/* Looking For */}
          {profile.looking_for && profile.looking_for.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mb-2">
              {profile.looking_for.map((goal) => (
                <Badge key={goal} variant="secondary" className="text-xs">
                  {GOAL_LABELS[goal]}
                </Badge>
              ))}
            </div>
          )}

          {/* AI Match Reason */}
          <div className="p-2 bg-primary/5 rounded-lg border border-primary/10 mb-2">
            <p className="text-xs text-center text-muted-foreground line-clamp-3">
              <span className="font-medium text-primary">Why connect:</span> {reason || 'Based on your professional interests and goals, this could be a great connection.'}
            </p>
          </div>

          {/* Looking For Text */}
          {profile.looking_for_text && (
            <div className="p-2 bg-accent/30 rounded-lg border border-accent/50 mb-2">
              <p className="text-xs text-center text-muted-foreground line-clamp-2">
                <span className="font-medium text-foreground">Looking for:</span> {profile.looking_for_text}
              </p>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="p-2 bg-muted/50 rounded-lg mb-2">
              <p className="text-xs text-muted-foreground text-center line-clamp-2">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Tags (Skills) */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap justify-center gap-1">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs py-0">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isConnected && (
            <div className="flex justify-center gap-4">
              <Button
                onClick={handlePass}
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full border-2 hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-6 w-6" />
              </Button>
              <Button
                onClick={handleLike}
                size="icon"
                className={`h-12 w-12 rounded-full shadow-lg ${theyLikedUs ? 'bg-green-500 hover:bg-green-600' : ''}`}
                disabled={sendRequest.isPending}
              >
                <UserPlus className="h-6 w-6" />
              </Button>
            </div>
          )}

          {theyLikedUs && !isConnected && (
            <p className="text-center text-xs text-green-600 mt-2 font-medium">
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
