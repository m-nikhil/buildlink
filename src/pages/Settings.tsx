import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import {
  ExperienceLevel,
  Industry,
  ConnectionGoal,
  EXPERIENCE_LABELS,
  INDUSTRY_LABELS,
  GOAL_LABELS,
} from '@/types/profile';

export default function Settings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [preferredExperience, setPreferredExperience] = useState<ExperienceLevel[]>([]);
  const [preferredIndustries, setPreferredIndustries] = useState<Industry[]>([]);
  const [preferredGoals, setPreferredGoals] = useState<ConnectionGoal[]>([]);
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 65]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setPreferredExperience(profile.preferred_experience_levels || []);
      setPreferredIndustries(profile.preferred_industries || []);
      setPreferredGoals(profile.preferred_goals || []);
      setAgeRange([profile.age_min || 18, profile.age_max || 65]);
    }
  }, [profile]);

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      preferred_experience_levels: preferredExperience,
      preferred_industries: preferredIndustries,
      preferred_goals: preferredGoals,
      age_min: ageRange[0],
      age_max: ageRange[1],
    });
  };

  const toggleExperience = (level: ExperienceLevel) => {
    setPreferredExperience(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const toggleIndustry = (industry: Industry) => {
    setPreferredIndustries(prev =>
      prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
    );
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
            <p className="text-muted-foreground">Set who you'd like to connect with</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Experience Level Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Experience Level</CardTitle>
              <CardDescription>What experience levels are you looking for?</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {(Object.entries(EXPERIENCE_LABELS) as [ExperienceLevel, string][]).map(([value, label]) => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`exp-${value}`}
                    checked={preferredExperience.includes(value)}
                    onCheckedChange={() => toggleExperience(value)}
                  />
                  <Label htmlFor={`exp-${value}`} className="cursor-pointer">{label}</Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Industry Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Industry</CardTitle>
              <CardDescription>What industries interest you?</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {(Object.entries(INDUSTRY_LABELS) as [Industry, string][]).map(([value, label]) => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ind-${value}`}
                    checked={preferredIndustries.includes(value)}
                    onCheckedChange={() => toggleIndustry(value)}
                  />
                  <Label htmlFor={`ind-${value}`} className="cursor-pointer">{label}</Label>
                </div>
              ))}
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

          {/* Age Range */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Age Range</CardTitle>
              <CardDescription>Preferred age range for connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>{ageRange[0]} years</span>
                <span>{ageRange[1]} years</span>
              </div>
              <Slider
                value={ageRange}
                onValueChange={(value) => setAgeRange(value as [number, number])}
                min={18}
                max={99}
                step={1}
                className="w-full"
              />
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
    </div>
  );
}
