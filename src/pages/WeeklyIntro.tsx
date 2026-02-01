import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCurrentWeeklyIntro, useGenerateWeeklyIntro, useUpdateIntroStatus } from '@/hooks/useWeeklyIntro';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Video, Sparkles, Users, MapPin, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { EXPERIENCE_LABELS, GOAL_LABELS } from '@/types/profile';

export default function WeeklyIntro() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: intro, isLoading: introLoading, refetch } = useCurrentWeeklyIntro();
  const generateIntro = useGenerateWeeklyIntro();
  const updateStatus = useUpdateIntroStatus();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleGenerateIntro = async () => {
    try {
      await generateIntro.mutateAsync();
      toast.success('Your weekly intro has been generated!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate intro');
    }
  };

  const handleMarkCompleted = async () => {
    if (!intro) return;
    try {
      await updateStatus.mutateAsync({ introId: intro.id, status: 'completed' });
      toast.success('Intro marked as completed! You are now connected.');
    } catch (error) {
      toast.error('Failed to update intro status');
    }
  };

  const handleSkip = async () => {
    if (!intro) return;
    try {
      await updateStatus.mutateAsync({ introId: intro.id, status: 'skipped' });
      toast.info('Intro skipped');
    } catch (error) {
      toast.error('Failed to skip intro');
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  const matchedProfile = intro?.matched_profile;
  const initials = matchedProfile?.initials || matchedProfile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Calendar className="h-8 w-8 text-primary" />
                Weekly Intro
              </h1>
              <p className="text-muted-foreground mt-1">
                One meaningful connection every week
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={introLoading}
            >
              <RefreshCw className={`h-4 w-4 ${introLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {introLoading ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </CardContent>
            </Card>
          ) : intro ? (
            /* Active Intro Card */
            <Card className="overflow-hidden border-primary/20">
              <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 relative">
                <div className="absolute top-3 right-3">
                  <Badge 
                    variant={intro.status === 'completed' ? 'default' : 'secondary'}
                    className="gap-1"
                  >
                    {intro.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                    {intro.status === 'pending' && <Sparkles className="h-3 w-3" />}
                    {intro.status === 'pending' ? 'This Week\'s Match' : 
                     intro.status === 'completed' ? 'Completed' : intro.status}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="pt-0">
                <div className="flex flex-col items-center -mt-12">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage src={matchedProfile?.avatar_url || undefined} alt={initials} />
                    <AvatarFallback className="text-2xl bg-primary/10">{initials}</AvatarFallback>
                  </Avatar>
                  
                  <h2 className="mt-4 text-2xl font-bold">{initials}</h2>
                  
                  {matchedProfile?.headline && (
                    <p className="text-muted-foreground text-center mt-1 max-w-md">
                      {matchedProfile.headline}
                    </p>
                  )}

                  {matchedProfile?.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                      <MapPin className="h-4 w-4" />
                      <span>{matchedProfile.location}</span>
                    </div>
                  )}

                  {/* Profile badges */}
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {matchedProfile?.experience_level && (
                      <Badge variant="outline">
                        {EXPERIENCE_LABELS[matchedProfile.experience_level as keyof typeof EXPERIENCE_LABELS]}
                      </Badge>
                    )}
                    {matchedProfile?.looking_for?.map((goal) => (
                      <Badge key={goal} variant="secondary">
                        {GOAL_LABELS[goal as keyof typeof GOAL_LABELS] || goal}
                      </Badge>
                    ))}
                  </div>

                  {/* Bio */}
                  {matchedProfile?.bio && (
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg max-w-md">
                      <p className="text-sm text-muted-foreground">{matchedProfile.bio}</p>
                    </div>
                  )}

                  {/* Video Call Section */}
                  {intro.status === 'pending' && (
                    <div className="mt-8 w-full max-w-md space-y-4">
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-full">
                            <Video className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Ready to connect?</p>
                            <p className="text-sm text-muted-foreground">
                              Schedule a quick video call this week
                            </p>
                          </div>
                        </div>
                        
                        {intro.video_call_url ? (
                          <Button 
                            className="w-full mt-4 gap-2"
                            onClick={() => window.open(intro.video_call_url!, '_blank')}
                          >
                            <Video className="h-4 w-4" />
                            Join Video Call
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-3 text-center">
                            Video call link will be generated when both parties are ready
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={handleSkip}
                          disabled={updateStatus.isPending}
                        >
                          Skip this week
                        </Button>
                        <Button 
                          className="flex-1 gap-2"
                          onClick={handleMarkCompleted}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark Complete
                        </Button>
                      </div>
                    </div>
                  )}

                  {intro.status === 'completed' && (
                    <div className="mt-8 p-4 bg-primary/10 rounded-lg border border-primary/20 text-center">
                      <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="font-medium text-primary">
                        Great connection made!
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You're now connected. Check your connections to message them.
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => navigate('/connections')}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        View Connections
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* No Intro Yet */
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit mb-4">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-2xl">No intro this week yet</CardTitle>
                <CardDescription className="max-w-md mx-auto">
                  Get matched with one carefully selected person each week for a meaningful 
                  professional connection. Quality over quantity.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-8">
                <Button 
                  size="lg" 
                  className="gap-2"
                  onClick={handleGenerateIntro}
                  disabled={generateIntro.isPending}
                >
                  <Sparkles className="h-5 w-5" />
                  {generateIntro.isPending ? 'Finding your match...' : 'Generate My Intro'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* How it works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How Weekly Intros Work</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">AI Match</p>
                    <p className="text-sm text-muted-foreground">
                      Our AI finds your best weekly match
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Video Intro</p>
                    <p className="text-sm text-muted-foreground">
                      Have a quick video call to connect
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Auto-Connect</p>
                    <p className="text-sm text-muted-foreground">
                      Stay connected after your intro
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
