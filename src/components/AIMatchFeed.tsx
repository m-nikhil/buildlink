import { useAIMatches } from '@/hooks/useAIMatches';
import { AIMatchCard } from './AIMatchCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';

export function AIMatchFeed() {
  const { data, isLoading, error, refetch, isFetching } = useAIMatches();
  const queryClient = useQueryClient();

  const matches = data?.matches ?? [];
  const swipesRemaining = data?.swipes_remaining ?? 5;
  const dailyLimit = data?.daily_limit ?? 5;
  const dailyLimitReached = data?.daily_limit_reached ?? false;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
    refetch();
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <Card className="max-w-sm mx-auto">
          <CardContent className="pt-8 pb-6">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Couldn't load matches</h3>
            <p className="text-muted-foreground text-sm mb-4">{error.message}</p>
            <Button onClick={handleRefresh} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <span className="text-muted-foreground">Finding your best matches...</span>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <div className="flex flex-col items-center gap-2 px-6 pb-6">
                <Skeleton className="h-20 w-20 rounded-full -mt-10" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (dailyLimitReached) {
    return (
      <div className="text-center py-12">
        <Card className="max-w-sm mx-auto">
          <CardContent className="pt-8 pb-6">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Daily limit reached</h3>
            <p className="text-muted-foreground text-sm mb-4">
              You've used all {dailyLimit} swipes for today.
            </p>
            <Badge variant="secondary">Come back tomorrow!</Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">
          No AI matches found. Complete your profile to get better recommendations!
        </p>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Matches
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            {matches.length} AI-recommended {matches.length === 1 ? 'match' : 'matches'}
          </span>
          <Badge variant="outline" className="text-xs">
            {swipesRemaining}/{dailyLimit} swipes left
          </Badge>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="ghost" 
          size="sm" 
          className="gap-2"
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((match) => (
          <AIMatchCard
            key={match.profile_id}
            profile={match.profile}
            score={match.score}
            reason={match.reason}
          />
        ))}
      </div>
    </div>
  );
}
