import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConnections, useDisconnect } from '@/hooks/useConnections';
import { useProfile, useProfiles } from '@/hooks/useProfile';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Clock, Users, MessageCircle, UserMinus } from 'lucide-react';
import { Profile, Connection } from '@/types/profile';
import { ChatDialog } from '@/components/ChatDialog';
import { InviteBubble } from '@/components/InviteBubble';

export default function Connections() {
  const { user, loading: authLoading } = useAuth();
  const { data: profile } = useProfile();
  const { data: connections, isLoading: connectionsLoading } = useConnections();
  const { data: allProfiles } = useProfiles();
  const disconnect = useDisconnect();
  const navigate = useNavigate();
  
  const [chatConnection, setChatConnection] = useState<{ connectionId: string; profile: Profile } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  const getProfileByUserId = (userId: string): Profile | undefined => {
    return allProfiles?.find(p => p.user_id === userId);
  };

  const pendingSent = (connections?.filter(
    c => c.requester_id === user?.id && c.status === 'pending'
  ) ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);

  const accepted = connections?.filter(c => c.status === 'accepted') ?? [];

  // Use stored initials from profile, fallback to computing from name
  const getDisplayInitials = (profile: Profile | undefined) => {
    if (profile?.initials) return profile.initials;
    if (!profile?.full_name) return 'U';
    return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const openChat = (connection: Connection) => {
    const otherUserId = connection.requester_id === user?.id 
      ? connection.recipient_id 
      : connection.requester_id;
    const otherProfile = getProfileByUserId(otherUserId);
    if (otherProfile) {
      setChatConnection({ connectionId: connection.id, profile: otherProfile });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-6 md:py-8 pb-20 md:pb-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
          <p className="text-muted-foreground">Know before you connect</p>
        </div>

        <Tabs defaultValue="connections" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connections" className="gap-2">
              <Users className="h-4 w-4" />
              Connections
              {accepted.length > 0 && (
                <Badge variant="secondary" className="ml-1">{accepted.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Clock className="h-4 w-4" />
              Sent
              {pendingSent.length > 0 && (
                <Badge variant="outline" className="ml-1">{pendingSent.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="mt-6">
            {connectionsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : accepted.length > 0 ? (
              <div className="space-y-3">
                {accepted.map((connection) => {
                  const otherUserId = connection.requester_id === user?.id 
                    ? connection.recipient_id 
                    : connection.requester_id;
                  const otherProfile = getProfileByUserId(otherUserId);
                  if (!otherProfile) return null;
                  
                  const connectedDate = connection.updated_at 
                    ? new Date(connection.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                    : null;
                    
                    return (
                      <div 
                        key={connection.id} 
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div 
                          className="flex items-center gap-4 flex-1 cursor-pointer"
                          onClick={() => openChat(connection)}
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={otherProfile.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {getDisplayInitials(otherProfile)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{getDisplayInitials(otherProfile)}</p>
                            <p className="text-sm text-muted-foreground truncate">{otherProfile.headline}</p>
                            {connectedDate && (
                              <p className="text-xs text-muted-foreground">Connected {connectedDate}</p>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openChat(connection)}
                        >
                          <MessageCircle className="h-5 w-5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <UserMinus className="h-5 w-5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect from {getDisplayInitials(otherProfile)}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove your connection and chat history. They won't be notified, but you'll both appear in each other's discover feed again.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => disconnect.mutate(connection.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No connections yet.</p>
                  <Button variant="link" onClick={() => navigate('/')}>
                    Discover people to connect with
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-6">
            {pendingSent.length > 0 ? (
              <div className="space-y-3">
                {pendingSent.map((connection) => {
                  const recipientProfile = getProfileByUserId(connection.recipient_id);
                  const sentDate = connection.created_at 
                    ? new Date(connection.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                    : null;
                  return (
                  <div key={connection.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={recipientProfile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getDisplayInitials(recipientProfile)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {getDisplayInitials(recipientProfile)}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {recipientProfile?.headline}
                      </p>
                      {sentDate && (
                        <p className="text-xs text-muted-foreground">Sent {sentDate}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  </div>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending requests</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Chat Dialog */}
      {chatConnection && (
        <ChatDialog
          open={!!chatConnection}
          onOpenChange={(open) => !open && setChatConnection(null)}
          connectionId={chatConnection.connectionId}
          otherProfile={chatConnection.profile}
        />
      )}
      <MobileNav />
      <InviteBubble />
    </div>
  );
}
