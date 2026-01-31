import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Loader2, Plus, X, RefreshCw, Linkedin } from 'lucide-react';
import {
  ExperienceLevel,
  ConnectionGoal,
  EXPERIENCE_LABELS,
  GOAL_LABELS,
} from '@/types/profile';
import { IndustrySelect } from '@/components/IndustrySelect';
import { toast } from 'sonner';

export default function ProfileEdit() {
  const { user, loading: authLoading, signInWithLinkedIn } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    headline: '',
    bio: '',
    location: '',
    linkedin_url: '',
    experience_level: '' as ExperienceLevel | '',
    industry: '' as string,
    skills: [] as string[],
    looking_for: [] as ConnectionGoal[],
  });
  const [newSkill, setNewSkill] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name ?? '',
        headline: profile.headline ?? '',
        bio: profile.bio ?? '',
        location: profile.location ?? '',
        linkedin_url: profile.linkedin_url ?? '',
        experience_level: profile.experience_level ?? '',
        industry: profile.industry ?? '',
        skills: profile.skills ?? [],
        looking_for: (profile.looking_for ?? []) as ConnectionGoal[],
      });
    }
  }, [profile]);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile.mutateAsync({
      ...formData,
      experience_level: formData.experience_level || null,
      industry: formData.industry || null,
      looking_for: formData.looking_for.length > 0 ? formData.looking_for : null,
    });
    navigate('/');
  };

  const handleResyncLinkedIn = () => {
    setIsSyncing(true);
    toast.info('Redirecting to LinkedIn to resync your profile...');
    signInWithLinkedIn(true);
  };

  const toggleGoal = (goal: ConnectionGoal) => {
    setFormData(prev => ({
      ...prev,
      looking_for: prev.looking_for.includes(goal)
        ? prev.looking_for.filter(g => g !== goal)
        : [...prev.looking_for, goal],
    }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill),
    }));
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8 max-w-2xl">
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8 max-w-2xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')} 
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>
              Update your profile to help others find and connect with you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Display */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt={formData.full_name || 'User'} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                      {getInitials(formData.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {profile?.avatar_url && (
                  <p className="text-sm text-muted-foreground">Profile picture imported from LinkedIn</p>
                )}
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="John Doe"
                    disabled={!!profile?.full_name}
                    className={profile?.full_name ? "bg-muted cursor-not-allowed" : ""}
                  />
                  {profile?.full_name && (
                    <p className="text-xs text-muted-foreground">Imported from LinkedIn</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={formData.headline}
                    onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                    placeholder="Product Manager at Tech Co"
                    disabled={!!profile?.headline}
                    className={profile?.headline ? "bg-muted cursor-not-allowed" : ""}
                  />
                  {profile?.headline && (
                    <p className="text-xs text-muted-foreground">Imported from LinkedIn</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell others about yourself..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="San Francisco, CA"
                    disabled={!!profile?.location}
                    className={profile?.location ? "bg-muted cursor-not-allowed" : ""}
                  />
                  {profile?.location && (
                    <p className="text-xs text-muted-foreground">Imported from LinkedIn</p>
                  )}
                </div>

              </div>

              {/* Professional Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Experience Level</Label>
                  <Select
                    value={formData.experience_level}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, experience_level: value as ExperienceLevel }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXPERIENCE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Industry</Label>
                  <IndustrySelect
                    value={formData.industry || null}
                    onChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
                    placeholder="Select industry"
                  />
                </div>
              </div>


              {/* Skills */}
              <div className="space-y-3">
                <Label>Skills</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <Button type="button" onClick={addSkill} variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Looking For */}
              <div className="space-y-3">
                <Label>What are you looking for?</Label>
                <p className="text-sm text-muted-foreground">Select all that apply</p>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(GOAL_LABELS) as [ConnectionGoal, string][]).map(([value, label]) => (
                    <div key={value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`goal-${value}`}
                        checked={formData.looking_for.includes(value)}
                        onCheckedChange={() => toggleGoal(value)}
                      />
                      <Label htmlFor={`goal-${value}`} className="cursor-pointer font-normal">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* LinkedIn Sync */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Linkedin className="h-5 w-5 text-[#0A66C2]" />
                  <Label>LinkedIn Profile</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Resync your profile data from LinkedIn (photo, headline, location, profile URL)
                </p>
                <Button
                  type="button"
                  onClick={handleResyncLinkedIn}
                  variant="outline"
                  className="w-full gap-2"
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Resync from LinkedIn
                </Button>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProfile.isPending} className="gap-2">
                  {updateProfile.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
