import { useState } from 'react';
import { useAIMatches } from '@/hooks/useAIMatches';
import { useDismissProfile } from '@/hooks/useDismissProfile';
import { useUndoDismiss } from '@/hooks/useUndoDismiss';
import { useTrackSwipe } from '@/hooks/useTrackSwipe';
import { SwipeCard } from './SwipeCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, AlertCircle, Users, Undo2, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface DismissedProfile {
  profileId: string;
  index: number;
}

export function SwipeFeed() {
  const { data, isLoading, error, refetch, isFetching } = useAIMatches();
  const dismissProfile = useDismissProfile();
  const undoDismiss = useUndoDismiss();
  const trackSwipe = useTrackSwipe();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastDismissed, setLastDismissed] = useState<DismissedProfile | null>(null);

  const matches = data?.matches ?? [];
  const swipesRemaining = data?.swipes_remaining ?? 5;
  const dailyLimit = data?.daily_limit ?? 5;
  const dailyLimitReached = data?.daily_limit_reached ?? false;

  const handleRefresh = () => {
    setCurrentIndex(0);
    setLastDismissed(null);
    queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
    refetch();
  };

  const handleLike = () => {
    setLastDismissed(null);
    trackSwipe.mutate();
    setCurrentIndex(prev => prev + 1);
  };

  const handlePass = (profileId: string) => {
    dismissProfile.mutate(profileId);
    trackSwipe.mutate();
    setLastDismissed({ profileId, index: currentIndex });
    setCurrentIndex(prev => prev + 1);
  };

  const handleUndo = () => {
    if (!lastDismissed) return;
    
    undoDismiss.mutate(lastDismissed.profileId, {
      onSuccess: () => {
        setCurrentIndex(lastDismissed.index);
        setLastDismissed(null);
        toast.success('Profile restored');
      },
      onError: () => {
        toast.error('Failed to undo');
      },
    });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-destructive mb-4 text-center">{error.message}</p>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <span className="text-muted-foreground">Finding professionals for you...</span>
        </div>
        <div className="w-full max-w-sm mx-auto">
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Daily limit reached
  if (dailyLimitReached) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Card className="w-full max-w-sm mx-auto text-center">
          <CardContent className="pt-12 pb-8">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Clock className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Daily limit reached</h3>
            <p className="text-muted-foreground mb-4">
              You've used all {dailyLimit} swipes for today. Come back tomorrow for more connections!
            </p>
            <Badge variant="secondary" className="text-sm">
              0 of {dailyLimit} swipes remaining
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentMatch = matches[currentIndex];

  if (matches.length === 0 || !currentMatch) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Card className="w-full max-w-sm mx-auto text-center">
          <CardContent className="pt-12 pb-8">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Users className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {matches.length > 0 ? "You've seen everyone!" : "No recommendations yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {matches.length > 0 
                ? "Check back later for new professionals"
                : "Complete your profile to get better recommendations!"}
            </p>
            <Badge variant="secondary" className="text-sm mb-4">
              {swipesRemaining} of {dailyLimit} swipes remaining today
            </Badge>
            <div>
              <Button onClick={handleRefresh} className="gap-2" disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Find More Connections
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} of {matches.length} professionals
        </span>
        <Badge variant="outline" className="text-xs">
          {swipesRemaining - currentIndex > 0 ? swipesRemaining - currentIndex : 0}/{dailyLimit} swipes left
        </Badge>
        <Button 
          onClick={handleRefresh} 
          variant="ghost" 
          size="sm" 
          className="gap-1"
          disabled={isFetching}
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <SwipeCard
        key={currentMatch.profile_id}
        profile={currentMatch.profile}
        score={currentMatch.score}
        reason={currentMatch.reason}
        onLike={handleLike}
        onPass={() => handlePass(currentMatch.profile_id)}
      />

      {/* Undo Button */}
      {lastDismissed && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={handleUndo}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={undoDismiss.isPending}
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </Button>
        </div>
      )}
    </div>
  );
}
