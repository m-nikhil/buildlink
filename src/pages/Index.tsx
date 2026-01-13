import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { UserProfile } from '@/components/UserProfile';
import { ConnectionFeed } from '@/components/ConnectionFeed';
import { AIMatchFeed } from '@/components/AIMatchFeed';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Users } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 h-16 border-b bg-card/80 backdrop-blur-md">
          <div className="container flex h-full items-center px-4">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="ml-2 h-6 w-32" />
          </div>
        </div>
        <main className="container px-4 py-8">
          <Skeleton className="h-48 w-full rounded-lg" />
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[350px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-6">
            <UserProfile />
          </aside>

          {/* Main Content */}
          <section>
            <Tabs defaultValue="ai-matches" className="w-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Discover Connections</h1>
                  <p className="text-muted-foreground">
                    Find professionals who match your networking goals
                  </p>
                </div>
                <TabsList>
                  <TabsTrigger value="ai-matches" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Matches
                  </TabsTrigger>
                  <TabsTrigger value="browse" className="gap-2">
                    <Users className="h-4 w-4" />
                    Browse All
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="ai-matches">
                <AIMatchFeed />
              </TabsContent>
              
              <TabsContent value="browse">
                <ConnectionFeed />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </main>
    </div>
  );
}
