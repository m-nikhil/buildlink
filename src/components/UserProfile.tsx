import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Briefcase, Edit, Linkedin } from 'lucide-react';
import { EXPERIENCE_LABELS, GOAL_LABELS, INDUSTRY_LABELS } from '@/types/profile';
import { useNavigate } from 'react-router-dom';

export function UserProfile() {
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) return null;

  return (
    <Card className="overflow-hidden">
      <div className="h-24 gradient-primary" />
      <CardContent className="relative pt-0">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
          <Avatar className="h-20 w-20 border-4 border-card shadow-lg">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? 'User'} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 sm:mb-2">
            <h2 className="text-xl font-bold">{profile.full_name || 'Anonymous User'}</h2>
            {profile.headline && (
              <p className="text-muted-foreground">{profile.headline}</p>
            )}
          </div>

          <Button onClick={() => navigate('/profile/edit')} variant="outline" size="sm" className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {profile.location}
              </span>
            )}
            {profile.industry && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                {INDUSTRY_LABELS[profile.industry]}
              </span>
            )}
            {profile.linkedin_url && (
              <a 
                href={profile.linkedin_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {profile.experience_level && (
              <Badge variant="secondary">
                {EXPERIENCE_LABELS[profile.experience_level]}
              </Badge>
            )}
            {profile.looking_for?.map((goal) => (
              <Badge key={goal} variant="outline">
                {GOAL_LABELS[goal]}
              </Badge>
            ))}
          </div>

          {profile.bio && (
            <p className="text-sm text-muted-foreground">{profile.bio}</p>
          )}

          {profile.skills && profile.skills.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
