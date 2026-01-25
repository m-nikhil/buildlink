import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, Linkedin } from 'lucide-react';
import { 
  ExperienceLevel, 
  Industry, 
  ConnectionGoal,
  EXPERIENCE_LABELS, 
  GOAL_LABELS, 
  INDUSTRY_LABELS 
} from '@/types/profile';
import { Profile } from '@/hooks/useProfile';

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  showFullDetails?: boolean; // When LinkedIn is mutually revealed
}

export function ProfileSheet({ open, onOpenChange, profile, showFullDetails = false }: ProfileSheetProps) {
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl">
                {showFullDetails ? (profile.full_name || 'Anonymous') : getInitials(profile.full_name)}
              </SheetTitle>
              {profile.headline && (
                <p className="text-sm text-muted-foreground mt-1">{profile.headline}</p>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Location & Industry */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {profile.location && (
              <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
                <MapPin className="h-4 w-4" />
                {profile.location}
              </span>
            )}
            {profile.industry && (
              <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
                <Briefcase className="h-4 w-4" />
                {INDUSTRY_LABELS[profile.industry as Industry]}
              </span>
            )}
          </div>

          {/* LinkedIn - only shown when mutually revealed */}
          {showFullDetails && profile.linkedin_url && (
            <Button asChild className="w-full gap-2 bg-[#0A66C2] hover:bg-[#004182]">
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                <Linkedin className="h-5 w-5" />
                View LinkedIn Profile
              </a>
            </Button>
          )}

          {/* Experience & Goals */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Experience & Goals</h4>
            <div className="flex flex-wrap gap-2">
              {profile.experience_level && (
                <Badge variant="secondary">
                  {EXPERIENCE_LABELS[profile.experience_level as ExperienceLevel]}
                </Badge>
              )}
              {profile.looking_for?.map((goal) => (
                <Badge key={goal} variant="outline">
                  {GOAL_LABELS[goal as ConnectionGoal]}
                </Badge>
              ))}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">About</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Age - only if available */}
          {profile.age && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Age</h4>
              <p className="text-sm text-muted-foreground">{profile.age} years old</p>
            </div>
          )}

          {/* Full name hint when not revealed */}
          {!showFullDetails && (
            <div className="text-center p-4 rounded-lg bg-muted/50 border border-dashed">
              <p className="text-sm text-muted-foreground">
                Request LinkedIn connection to see their full name and profile
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
