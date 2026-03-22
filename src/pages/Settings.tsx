import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Clock, Save, Loader2, Users, ChevronRight } from 'lucide-react';
import { COMMON_TIMEZONES } from '@/types/group';
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
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

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
      setTimezone((profile as any).timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    }
  }, [profile]);

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      preferred_locations: preferredLocations,
      preferred_industries: preferredIndustries,
      preferred_goals: preferredGoals,
      timezone,
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
      <main className="container px-4 py-6 md:py-8 pb-24 md:pb-8 max-w-2xl mx-auto">
        <div className="relative overflow-hidden rounded-xl gradient-subtle border border-border/50 p-5 mb-6">
          <h1 className="text-2xl font-bold">Connection Preferences</h1>
          <p className="text-sm text-muted-foreground mt-0.5">These preferences are considered in matching, not strict filters</p>
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

          {/* Timezone */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timezone
              </CardTitle>
              <CardDescription>
                Your system timezone is {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}. Override it below if needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Invite Friends */}
          {/* Invite Friends */}
          <div
            className="relative overflow-hidden rounded-xl border border-primary/20 cursor-pointer hover:border-primary/40 transition-all hover:shadow-sm group"
            onClick={() => navigate('/invite')}
          >
            <div className="h-0.5 w-full gradient-primary" />
            <div className="flex items-center gap-4 p-4">
              <div className="p-2.5 bg-gradient-to-br from-primary/15 to-accent/15 rounded-xl">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Who should BuildLink not exist without?</h3>
                <p className="text-xs text-muted-foreground">Growing circle by circle</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>

          <Button
            onClick={handleSave}
            className="w-full gap-2 gradient-primary text-white hover:opacity-90"
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
      <MobileNav />
      <InviteBubble />
    </div>
  );
}
