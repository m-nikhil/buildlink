import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConnections, useRespondToConnection } from '@/hooks/useConnections';
import { useProfile, useProfiles } from '@/hooks/useProfile';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Clock, Users } from 'lucide-react';
import { Profile } from '@/types/profile';

export default function Connections() {
  const { user, loading: authLoading } = useAuth();
  const { data: profile } = useProfile();
  const { data: connections, isLoading: connectionsLoading } = useConnections();
  const { data: allProfiles } = useProfiles();
  const respondToConnection = useRespondToConnection();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  const getProfileById = (id: string): Profile | undefined => {
    return allProfiles?.find(p => p.id === id);
  };

  const pendingReceived = connections?.filter(
    c => c.recipient_id === profile?.id && c.status === 'pending'
  ) ?? [];

  const pendingSent = connections?.filter(
    c => c.requester_id === profile?.id && c.status === 'pending'
  ) ?? [];

  const accepted = connections?.filter(c => c.status === 'accepted') ?? [];

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const ConnectionItem = ({ 
    connectionProfile, 
    showActions = false,
    connectionId 
  }: { 
    connectionProfile: Profile | undefined;
    showActions?: boolean;
    connectionId?: string;
  }) => {
    if (!connectionProfile) return null;

    return (
      <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
        <Avatar className="h-12 w-12">
          <AvatarImage src={connectionProfile.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {getInitials(connectionProfile.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{connectionProfile.full_name || 'Anonymous'}</p>
          <p className="text-sm text-muted-foreground truncate">{connectionProfile.headline}</p>
        </div>
        {showActions && connectionId && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => respondToConnection.mutate({ connectionId, status: 'accepted' })}
              disabled={respondToConnection.isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => respondToConnection.mutate({ connectionId, status: 'rejected' })}
              disabled={respondToConnection.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!showActions && (
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            Connected
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
          <p className="text-muted-foreground">Manage your professional network</p>
        </div>

        <Tabs defaultValue="connections" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connections" className="gap-2">
              <Users className="h-4 w-4" />
              Connections
              {accepted.length > 0 && (
                <Badge variant="secondary" className="ml-1">{accepted.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Requests
              {pendingReceived.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingReceived.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
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
                  const otherProfileId = connection.requester_id === profile?.id 
                    ? connection.recipient_id 
                    : connection.requester_id;
                  return (
                    <ConnectionItem 
                      key={connection.id} 
                      connectionProfile={getProfileById(otherProfileId)} 
                    />
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

          <TabsContent value="pending" className="mt-6">
            {pendingReceived.length > 0 ? (
              <div className="space-y-3">
                {pendingReceived.map((connection) => (
                  <ConnectionItem 
                    key={connection.id} 
                    connectionProfile={getProfileById(connection.requester_id)}
                    showActions
                    connectionId={connection.id}
                  />
                ))}
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

          <TabsContent value="sent" className="mt-6">
            {pendingSent.length > 0 ? (
              <div className="space-y-3">
                {pendingSent.map((connection) => (
                  <div key={connection.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getProfileById(connection.recipient_id)?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(getProfileById(connection.recipient_id)?.full_name ?? null)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {getProfileById(connection.recipient_id)?.full_name || 'Anonymous'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {getProfileById(connection.recipient_id)?.headline}
                      </p>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  </div>
                ))}
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
    </div>
  );
}
