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
import { Loader2, Plus, X, Linkedin, CheckCircle, AlertTriangle } from 'lucide-react';
import { LocationSelect } from '@/components/LocationSelect';
import {
  ExperienceLevel,
  ConnectionGoal,
  EXPERIENCE_LABELS,
  GOAL_LABELS,
} from '@/types/profile';
import { IndustrySelect } from '@/components/IndustrySelect';
import { toast } from 'sonner';

export default function ProfileComplete() {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    headline: '',
    bio: '',
    looking_for_text: '',
    location: '',
    linkedin_url: '',
    experience_level: '' as ExperienceLevel | '',
    industry: '' as string,
    industry_other: '',
    skills: [] as string[],
    looking_for: [] as ConnectionGoal[],
  });
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      // Check if profile is already complete
      if (profile.full_name && profile.headline && profile.experience_level && profile.industry) {
        navigate('/');
        return;
      }
      
      // Pre-fill with existing LinkedIn data
      setFormData({
        full_name: profile.full_name ?? '',
        headline: profile.headline ?? '',
        bio: profile.bio ?? '',
        looking_for_text: profile.looking_for_text ?? '',
        location: profile.location ?? '',
        linkedin_url: profile.linkedin_url ?? '',
        experience_level: profile.experience_level ?? '',
        industry: profile.industry ?? '',
        industry_other: profile.industry_other ?? '',
        skills: profile.skills ?? [],
        looking_for: (profile.looking_for ?? []) as ConnectionGoal[],
      });
    }
  }, [profile, navigate]);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.full_name || !formData.headline) {
      toast.error('Please fill in your name and headline');
      return;
    }
    if (!formData.experience_level || !formData.industry) {
      toast.error('Please select your experience level and industry');
      return;
    }
    
    try {
      await updateProfile.mutateAsync({
        ...formData,
        experience_level: formData.experience_level || null,
        industry: formData.industry || null,
        industry_other: formData.industry_other || null,
        looking_for: formData.looking_for.length > 0 ? formData.looking_for : null,
        looking_for_text: formData.looking_for_text || null,
      });
      toast.success('Profile completed! Welcome to BuildLink');
      navigate('/');
    } catch (error) {
      console.error('Error completing profile:', error);
    }
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
    if (formData.skills.length >= 10) {
      toast.error('Maximum 10 skills allowed');
      return;
    }
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

  // Check for LinkedIn imported data
  const hasLinkedInData = profile?.avatar_url || profile?.linkedin_url;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Fill in the remaining details to help others find and connect with you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* LinkedIn Import Notice */}
              {hasLinkedInData && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                  <div className="flex items-center gap-3">
                    <Linkedin className="h-5 w-5 text-[#0A66C2] flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">Data imported from LinkedIn</p>
                      <p className="text-xs text-muted-foreground">Some fields are pre-filled and locked</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  {profile?.linkedin_url && (
                    <a 
                      href={profile.linkedin_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[#0A66C2] hover:underline"
                    >
                      <span className="truncate">{profile.linkedin_url}</span>
                      <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              )}

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
                  <Label htmlFor="full_name">Full Name *</Label>
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
                  <Label htmlFor="headline">Headline *</Label>
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
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    Don't include your name or personal contact info
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="looking_for_text">What are you looking for?</Label>
                  <Textarea
                    id="looking_for_text"
                    value={formData.looking_for_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, looking_for_text: e.target.value }))}
                    placeholder="Describe what you're looking for in connections..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    Don't include your name or personal contact info
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <LocationSelect
                    value={formData.location}
                    onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                  />
                </div>
              </div>

              {/* Professional Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Experience Level *</Label>
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
                  <Label>Industry *</Label>
                  <IndustrySelect
                    value={formData.industry || null}
                    onChange={(value) => setFormData(prev => ({ ...prev, industry: value, industry_other: value === 'other' ? prev.industry_other : '' }))}
                    placeholder="Select industry"
                  />
                  {formData.industry === 'other' && (
                    <Input
                      value={formData.industry_other}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry_other: e.target.value }))}
                      placeholder="Please specify your industry..."
                      className="mt-2"
                    />
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Skills</Label>
                  <span className="text-xs text-muted-foreground">{formData.skills.length}/10</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill"
                    disabled={formData.skills.length >= 10}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <Button type="button" onClick={addSkill} variant="outline" size="icon" disabled={formData.skills.length >= 10}>
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
                <Label>Exploring</Label>
                <p className="text-sm text-muted-foreground">Select all that apply</p>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(GOAL_LABELS) as [ConnectionGoal, string][]).map(([value, label]) => (
                    <div key={value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`onboard-goal-${value}`}
                        checked={formData.looking_for.includes(value)}
                        onCheckedChange={() => toggleGoal(value)}
                      />
                      <Label htmlFor={`onboard-goal-${value}`} className="cursor-pointer font-normal">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={updateProfile.isPending} className="gap-2">
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Complete Profile'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
