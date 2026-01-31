import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { BuildLinkLogo } from '@/components/BuildLinkLogo';
import { Loader2, X, ArrowRight } from 'lucide-react';
import { ExperienceLevel, ConnectionGoal, EXPERIENCE_LABELS, GOAL_LABELS } from '@/types/profile';
import { IndustrySelect } from '@/components/IndustrySelect';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function ProfileComplete() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: '',
    headline: '',
    bio: '',
    looking_for_text: '',
    location: '',
    experience_level: '' as ExperienceLevel | '',
    industry: '' as string,
    industry_other: '',
    skills: [] as string[],
    linkedin_url: '',
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
      
      // Pre-fill with existing data
      setFormData({
        full_name: profile.full_name || '',
        headline: profile.headline || '',
        bio: profile.bio || '',
        looking_for_text: profile.looking_for_text || '',
        location: profile.location || '',
        experience_level: profile.experience_level || '',
        industry: profile.industry || '',
        industry_other: profile.industry_other || '',
        skills: profile.skills || [],
        linkedin_url: profile.linkedin_url || '',
        looking_for: (profile.looking_for || []) as ConnectionGoal[],
      });
    }
  }, [profile, navigate]);

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim()) && formData.skills.length < 10) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const toggleGoal = (goal: ConnectionGoal) => {
    setFormData(prev => ({
      ...prev,
      looking_for: prev.looking_for.includes(goal)
        ? prev.looking_for.filter(g => g !== goal)
        : [...prev.looking_for, goal],
    }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.full_name || !formData.headline) {
        toast.error('Please fill in your name and headline');
        return;
      }
    }
    if (step === 2) {
      if (!formData.experience_level || !formData.industry) {
        toast.error('Please select your experience level and industry');
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {

    try {
      await updateProfile.mutateAsync({
        full_name: formData.full_name,
        headline: formData.headline,
        bio: formData.bio,
        looking_for_text: formData.looking_for_text || null,
        location: formData.location || null,
        experience_level: formData.experience_level as ExperienceLevel,
        industry: formData.industry || null,
        industry_other: formData.industry_other || null,
        skills: formData.skills,
        linkedin_url: formData.linkedin_url,
        looking_for: formData.looking_for.length > 0 ? formData.looking_for : null,
      });
      
      toast.success('Profile completed! Welcome to BuildLink');
      navigate('/');
    } catch (error) {
      console.error('Error completing profile:', error);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BuildLinkLogo size="md" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground">
            Help us connect you with the right people
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-2 w-24 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Basic Information'}
              {step === 2 && 'Professional Details'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Tell us about yourself'}
              {step === 2 && 'Share your professional background'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <>
                {/* Avatar Display - matching ProfileEdit */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                      <AvatarImage src={profile?.avatar_url ?? undefined} alt={formData.full_name || 'User'} />
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                        {formData.full_name ? formData.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {profile?.avatar_url && (
                    <p className="text-sm text-muted-foreground">Profile picture imported from LinkedIn</p>
                  )}
                </div>

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
                    placeholder="Senior Software Engineer at Tech Co"
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
                  <Label htmlFor="looking_for_text">What are you looking for?</Label>
                  <Textarea
                    id="looking_for_text"
                    value={formData.looking_for_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, looking_for_text: e.target.value }))}
                    placeholder="Describe what you're looking for in connections..."
                    rows={3}
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
              </>
            )}

            {/* Step 2: Professional Details */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Experience Level *</Label>
                  <Select
                    value={formData.experience_level}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, experience_level: value as ExperienceLevel }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your experience level" />
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
                    placeholder="Select your industry"
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Skills</Label>
                    <span className="text-xs text-muted-foreground">{formData.skills.length}/10</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder={formData.skills.length >= 10 ? "Maximum 10 skills reached" : "Add a skill"}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      disabled={formData.skills.length >= 10}
                    />
                    <Button type="button" onClick={addSkill} variant="outline" disabled={formData.skills.length >= 10}>
                      Add
                    </Button>
                  </div>
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="gap-1">
                          {skill}
                          <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
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
              </>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-4">
              {step > 1 ? (
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              ) : (
                <div />
              )}
              
              {step < 2 ? (
                <Button onClick={handleNext} className="gap-2">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={updateProfile.isPending}
                  className="gap-2"
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Complete Profile'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
