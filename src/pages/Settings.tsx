import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Loader2, Users, ChevronRight } from 'lucide-react';
import {
  ConnectionGoal,
  GOAL_LABELS,
} from '@/types/profile';
import { IndustryMultiSelect } from '@/components/IndustryMultiSelect';
import { LocationMultiSelect } from '@/components/LocationMultiSelect';
import { InviteBubble } from '@/components/InviteBubble';

export default function Settings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [preferredIndustries, setPreferredIndustries] = useState<string[]>([]);
  const [preferredGoals, setPreferredGoals] = useState<ConnectionGoal[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setPreferredLocations((profile as any).preferred_locations || []);
      setPreferredIndustries(profile.preferred_industries || []);
      setPreferredGoals(profile.preferred_goals || []);
    }
  }, [profile]);

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      preferred_locations: preferredLocations,
      preferred_industries: preferredIndustries,
      preferred_goals: preferredGoals,
    } as any);
  };

  const toggleGoal = (goal: ConnectionGoal) => {
    setPreferredGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Connection Preferences</h1>
            <p className="text-muted-foreground">These preferences are considered in matching, not strict filters</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Location Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location</CardTitle>
              <CardDescription>Where would you like to connect? (max 3)</CardDescription>
            </CardHeader>
            <CardContent>
              <LocationMultiSelect
                value={preferredLocations}
                onChange={setPreferredLocations}
                max={3}
                placeholder="Search for a city..."
              />
            </CardContent>
          </Card>

          {/* Industry Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Industry</CardTitle>
              <CardDescription>What industries interest you? (max 3)</CardDescription>
            </CardHeader>
            <CardContent>
              <IndustryMultiSelect
                value={preferredIndustries}
                onChange={setPreferredIndustries}
                placeholder="Select up to 3 industries..."
              />
            </CardContent>
          </Card>

          {/* Goals Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Connection Goals</CardTitle>
              <CardDescription>What are you looking for in a connection?</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {(Object.entries(GOAL_LABELS) as [ConnectionGoal, string][]).map(([value, label]) => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`goal-${value}`}
                    checked={preferredGoals.includes(value)}
                    onCheckedChange={() => toggleGoal(value)}
                  />
                  <Label htmlFor={`goal-${value}`} className="cursor-pointer">{label}</Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Invite Friends */}
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors border-primary/20"
            onClick={() => navigate('/invite')}
          >
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Invite Friends</h3>
                <p className="text-sm text-muted-foreground">
                  Grow the network to find more matches
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Button
            onClick={handleSave} 
            className="w-full gap-2"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          Save Preferences
          </Button>
        </div>
      </main>
      <InviteBubble />
    </div>
  );
}
