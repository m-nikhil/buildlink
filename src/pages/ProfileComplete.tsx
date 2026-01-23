import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { BuildLinkLogo } from '@/components/BuildLinkLogo';
import { Loader2, X, Sparkles, ArrowRight } from 'lucide-react';
import { ExperienceLevel, Industry, ConnectionGoal, EXPERIENCE_LABELS, INDUSTRY_LABELS, GOAL_LABELS } from '@/types/profile';
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
    country: '',
    city: '',
    experience_level: '' as ExperienceLevel | '',
    industry: '' as Industry | '',
    looking_for: [] as ConnectionGoal[],
    skills: [] as string[],
    linkedin_url: '',
  });

  // Country and city data
  const countries = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
    'France', 'Netherlands', 'India', 'Singapore', 'Japan', 'Brazil',
    'Mexico', 'Spain', 'Italy', 'Sweden', 'Switzerland', 'Ireland',
    'United Arab Emirates', 'South Africa', 'Nigeria', 'Kenya', 'Egypt',
    'Israel', 'South Korea', 'China', 'Indonesia', 'Philippines', 'Vietnam',
    'Thailand', 'Malaysia', 'New Zealand', 'Poland', 'Portugal', 'Belgium',
    'Austria', 'Denmark', 'Norway', 'Finland', 'Czech Republic', 'Argentina'
  ].sort();

  const citiesByCountry: Record<string, string[]> = {
    'United States': ['New York', 'San Francisco', 'Los Angeles', 'Seattle', 'Austin', 'Boston', 'Chicago', 'Denver', 'Miami', 'Atlanta', 'Washington DC', 'Dallas', 'Houston', 'Phoenix', 'San Diego'],
    'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Bristol', 'Leeds', 'Glasgow', 'Cambridge', 'Oxford'],
    'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Waterloo'],
    'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra'],
    'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf'],
    'France': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Bordeaux'],
    'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'],
    'India': ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Gurgaon', 'Noida'],
    'Singapore': ['Singapore'],
    'Japan': ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Fukuoka'],
    'Brazil': ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília', 'Curitiba'],
    'Mexico': ['Mexico City', 'Guadalajara', 'Monterrey', 'Tijuana'],
    'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Málaga'],
    'Italy': ['Milan', 'Rome', 'Turin', 'Florence', 'Bologna'],
    'Sweden': ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala'],
    'Switzerland': ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne'],
    'Ireland': ['Dublin', 'Cork', 'Galway', 'Limerick'],
    'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah'],
    'South Africa': ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria'],
    'Nigeria': ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan'],
    'Kenya': ['Nairobi', 'Mombasa', 'Kisumu'],
    'Egypt': ['Cairo', 'Alexandria', 'Giza'],
    'Israel': ['Tel Aviv', 'Jerusalem', 'Haifa', 'Herzliya'],
    'South Korea': ['Seoul', 'Busan', 'Incheon', 'Daegu'],
    'China': ['Shanghai', 'Beijing', 'Shenzhen', 'Hangzhou', 'Guangzhou', 'Chengdu'],
    'Indonesia': ['Jakarta', 'Surabaya', 'Bandung', 'Bali'],
    'Philippines': ['Manila', 'Cebu', 'Davao'],
    'Vietnam': ['Ho Chi Minh City', 'Hanoi', 'Da Nang'],
    'Thailand': ['Bangkok', 'Chiang Mai', 'Phuket'],
    'Malaysia': ['Kuala Lumpur', 'Penang', 'Johor Bahru'],
    'New Zealand': ['Auckland', 'Wellington', 'Christchurch'],
    'Poland': ['Warsaw', 'Krakow', 'Wroclaw', 'Gdansk'],
    'Portugal': ['Lisbon', 'Porto', 'Braga'],
    'Belgium': ['Brussels', 'Antwerp', 'Ghent'],
    'Austria': ['Vienna', 'Salzburg', 'Graz'],
    'Denmark': ['Copenhagen', 'Aarhus', 'Odense'],
    'Norway': ['Oslo', 'Bergen', 'Trondheim'],
    'Finland': ['Helsinki', 'Espoo', 'Tampere'],
    'Czech Republic': ['Prague', 'Brno', 'Ostrava'],
    'Argentina': ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza'],
  };

  const availableCities = formData.country ? citiesByCountry[formData.country] || [] : [];
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
      const locationParts = profile.location?.split(', ') || [];
      setFormData({
        full_name: profile.full_name || '',
        headline: profile.headline || '',
        bio: profile.bio || '',
        country: locationParts[1] || '',
        city: locationParts[0] || '',
        experience_level: profile.experience_level || '',
        industry: profile.industry || '',
        looking_for: profile.looking_for || [],
        skills: profile.skills || [],
        linkedin_url: profile.linkedin_url || '',
      });
    }
  }, [profile, navigate]);

  const handleGoalToggle = (goal: ConnectionGoal) => {
    setFormData(prev => ({
      ...prev,
      looking_for: prev.looking_for.includes(goal)
        ? prev.looking_for.filter(g => g !== goal)
        : [...prev.looking_for, goal]
    }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
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
    if (formData.looking_for.length === 0) {
      toast.error('Please select at least one connection goal');
      return;
    }

    try {
      const location = formData.city && formData.country 
        ? `${formData.city}, ${formData.country}` 
        : formData.country || '';
      
      await updateProfile.mutateAsync({
        full_name: formData.full_name,
        headline: formData.headline,
        bio: formData.bio,
        location,
        experience_level: formData.experience_level as ExperienceLevel,
        industry: formData.industry as Industry,
        looking_for: formData.looking_for,
        skills: formData.skills,
        linkedin_url: formData.linkedin_url,
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
          
          {/* Coming soon badge */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
            <Sparkles className="h-4 w-4" />
            <span>We're building automatic LinkedIn data import - coming soon!</span>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
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
              {step === 3 && 'Connection Goals'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Tell us about yourself'}
              {step === 2 && 'Share your professional background'}
              {step === 3 && 'What are you looking to achieve?'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headline">Professional Headline *</Label>
                  <Input
                    id="headline"
                    value={formData.headline}
                    onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                    placeholder="Senior Software Engineer at Tech Co"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell others about yourself..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, country: value, city: '' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>City</Label>
                    <Select
                      value={formData.city}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                      disabled={!formData.country || availableCities.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.country ? "Select city" : "Select country first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn Profile URL</Label>
                  <Input
                    id="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
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
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value as Industry }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INDUSTRY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button type="button" onClick={addSkill} variant="outline">
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
              </>
            )}

            {/* Step 3: Connection Goals */}
            {step === 3 && (
              <>
                <div className="space-y-4">
                  <Label>What are you looking for? *</Label>
                  <p className="text-sm text-muted-foreground">Select all that apply</p>
                  <div className="grid gap-3">
                    {Object.entries(GOAL_LABELS).map(([value, label]) => (
                      <div
                        key={value}
                        className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          formData.looking_for.includes(value as ConnectionGoal)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleGoalToggle(value as ConnectionGoal)}
                      >
                        <Checkbox
                          checked={formData.looking_for.includes(value as ConnectionGoal)}
                          onCheckedChange={() => handleGoalToggle(value as ConnectionGoal)}
                        />
                        <span className="font-medium">{label}</span>
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
              
              {step < 3 ? (
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
