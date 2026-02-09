import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCurrentWeeklyIntro, useGenerateWeeklyIntro, useUpdateIntroStatus } from '@/hooks/useWeeklyIntro';
import { useHasAvailability } from '@/hooks/useAvailability';
import { Header } from '@/components/Header';
import { AvailabilityPicker } from '@/components/AvailabilityPicker';
import { InviteFriendsCard } from '@/components/InviteFriendsCard';
import { InviteBubble } from '@/components/InviteBubble';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, Video, Sparkles, Users, MapPin, CheckCircle, RefreshCw, 
  Clock, CalendarDays, Edit2, AlertCircle, Globe, Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { EXPERIENCE_LABELS, GOAL_LABELS } from '@/types/profile';

export default function WeeklyIntro() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: intro, isLoading: introLoading, refetch } = useCurrentWeeklyIntro();
  const { hasAvailability, isLoading: availabilityLoading } = useHasAvailability();
  const generateIntro = useGenerateWeeklyIntro();
  const updateStatus = useUpdateIntroStatus();
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('intro');
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [noMatchResult, setNoMatchResult] = useState<{ message: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Show availability tab if no availability set
  useEffect(() => {
    if (!availabilityLoading && !hasAvailability) {
      setActiveTab('availability');
    }
  }, [hasAvailability, availabilityLoading]);

  const handleGenerateIntro = async () => {
    try {
      const result = await generateIntro.mutateAsync();
      if (result?.no_match) {
        setNoMatchResult({ message: result.message || 'No matches available right now.' });
        toast.info('No matches found - see tips below!');
      } else {
        setNoMatchResult(null);
        toast.success('Your weekly intro has been generated!');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate intro');
    }
  };

  const handleMarkCompleted = async () => {
    if (!intro) return;
    try {
      await updateStatus.mutateAsync({ introId: intro.id, status: 'completed' });
      toast.success('Intro marked as completed!');
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

  const handleAvailabilitySaved = () => {
    setShowAvailabilityEditor(false);
    setActiveTab('intro');
    toast.success('Your availability has been saved! You can now get matched.');
  };

  if (authLoading || profileLoading || availabilityLoading) {
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

  const scheduledAt = intro?.scheduled_at ? new Date(intro.scheduled_at) : null;

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

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="intro" className="gap-2">
                <Users className="h-4 w-4" />
                This Week's Match
              </TabsTrigger>
              <TabsTrigger value="availability" className="gap-2">
                <Clock className="h-4 w-4" />
                My Availability
              </TabsTrigger>
            </TabsList>

            {/* Intro Tab */}
            <TabsContent value="intro" className="space-y-6">
              {!hasAvailability ? (
                <Card>
                  <CardHeader className="text-center">
                    <div className="mx-auto p-4 bg-warning/10 rounded-full w-fit mb-4">
                      <Clock className="h-12 w-12 text-warning" />
                    </div>
                    <CardTitle className="text-2xl">Set Your Availability First</CardTitle>
                    <CardDescription className="max-w-md mx-auto">
                      To get matched with someone, we need to know when you're free for a 30-minute call.
                      We'll find someone with overlapping availability.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center pb-8">
                    <Button 
                      size="lg" 
                      className="gap-2"
                      onClick={() => setActiveTab('availability')}
                    >
                      <CalendarDays className="h-5 w-5" />
                      Set My Availability
                    </Button>
                  </CardContent>
                </Card>
              ) : introLoading ? (
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
                      
                      <h2 className="mt-4 text-2xl font-bold">{matchedProfile?.full_name || initials}</h2>
                      
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

                      {/* Scheduled Meeting Time */}
                      {scheduledAt && (
                        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20 flex items-center gap-3">
                          <CalendarDays className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium">Scheduled Meeting</p>
                            <p className="text-lg font-semibold text-primary">
                              {format(scheduledAt, 'EEEE, MMMM d')} at {format(scheduledAt, 'h:mm a')}
                            </p>
                          </div>
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
                        <div className="mt-8 w-full space-y-4">
                          {showVideoCall && intro.video_call_url ? (
                            <div className="space-y-4">
                              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border shadow-lg">
                                <iframe
                                  src={`${intro.video_call_url}#userInfo.displayName="${encodeURIComponent(profile?.full_name || 'Guest')}"&config.prejoinConfig.enabled=false`}
                                  className="absolute inset-0 w-full h-full"
                                  allow="camera; microphone; fullscreen; display-capture; autoplay"
                                  allowFullScreen
                                />
                              </div>
                              <Button 
                                variant="outline" 
                                className="w-full gap-2"
                                onClick={() => setShowVideoCall(false)}
                              >
                                Hide Video Call
                              </Button>
                            </div>
                          ) : (
                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 max-w-md mx-auto">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-full">
                                  <Video className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">Ready to connect?</p>
                                  <p className="text-sm text-muted-foreground">
                                    {scheduledAt 
                                      ? `Your call is scheduled for ${format(scheduledAt, 'EEEE')} at ${format(scheduledAt, 'h:mm a')}`
                                      : 'Join the video call when you\'re both ready'
                                    }
                                  </p>
                                </div>
                              </div>

                              {intro.video_call_url && (
                                <Button 
                                  className="w-full mt-4 gap-2"
                                  onClick={() => setShowVideoCall(true)}
                                >
                                  <Video className="h-4 w-4" />
                                  Join Video Call
                                </Button>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2 max-w-md mx-auto">
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
              ) : noMatchResult ? (
                /* No matches found - show tips */
                <Card className="border-warning/30">
                  <CardHeader className="text-center">
                    <div className="mx-auto p-4 bg-warning/10 rounded-full w-fit mb-4">
                      <AlertCircle className="h-12 w-12 text-warning" />
                    </div>
                    <CardTitle className="text-2xl">No Matches Available Yet</CardTitle>
                    <CardDescription className="max-w-md mx-auto">
                      {noMatchResult.message}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pb-8">
                    {/* Tips to improve matching */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        Tips to improve your matching chances:
                      </div>
                      <div className="grid gap-3">
                        <div className="flex items-start gap-3 text-sm">
                          <div className="p-1.5 bg-primary/10 rounded-full mt-0.5">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Add more time slots</p>
                            <p className="text-muted-foreground">
                              The more availability you add, the higher your chances of finding a match.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <div className="p-1.5 bg-primary/10 rounded-full mt-0.5">
                            <Globe className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Consider different time zones</p>
                            <p className="text-muted-foreground">
                              Adding early morning or evening slots can match with users in other regions.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <div className="p-1.5 bg-primary/10 rounded-full mt-0.5">
                            <CalendarDays className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Try again later</p>
                            <p className="text-muted-foreground">
                              More users are joining every day. Check back soon for new potential matches!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col items-center gap-3">
                      <Button 
                        size="lg" 
                        className="gap-2"
                        onClick={() => {
                          setNoMatchResult(null);
                          setActiveTab('availability');
                        }}
                      >
                        <Edit2 className="h-5 w-5" />
                        Expand My Availability
                      </Button>
                      <Button 
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          setNoMatchResult(null);
                          handleGenerateIntro();
                        }}
                        disabled={generateIntro.isPending}
                      >
                        <RefreshCw className={`h-4 w-4 ${generateIntro.isPending ? 'animate-spin' : ''}`} />
                        {generateIntro.isPending ? 'Checking...' : 'Try Again'}
                      </Button>
                    </div>

                    {/* Invite Friends */}
                    <InviteFriendsCard compact />
                  </CardContent>
                </Card>
              ) : (
                /* No Intro Yet - But has availability */
                <Card>
                  <CardHeader className="text-center">
                    <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit mb-4">
                      <Sparkles className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Ready for your weekly intro!</CardTitle>
                    <CardDescription className="max-w-md mx-auto">
                      Your availability is set. Generate your intro to get matched with 
                      someone who has overlapping free time.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4 pb-8">
                    <Button 
                      size="lg" 
                      className="gap-2"
                      onClick={handleGenerateIntro}
                      disabled={generateIntro.isPending}
                    >
                      <Sparkles className="h-5 w-5" />
                      {generateIntro.isPending ? 'Finding your match...' : 'Generate My Intro'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="gap-2 text-muted-foreground"
                      onClick={() => setActiveTab('availability')}
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit my availability
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
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Set Availability</p>
                        <p className="text-sm text-muted-foreground">
                          Tell us when you're free
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">AI Match</p>
                        <p className="text-sm text-muted-foreground">
                          We find your best match
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Scheduled Call</p>
                        <p className="text-sm text-muted-foreground">
                          Meeting at overlapping time
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                        4
                      </div>
                      <div>
                        <p className="font-medium">Auto-Connect</p>
                        <p className="text-sm text-muted-foreground">
                          Stay connected after
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability">
              <AvailabilityPicker onSaved={handleAvailabilitySaved} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <InviteBubble />
    </div>
  );
}
