import { useState } from 'react';
import { useProfiles } from '@/hooks/useProfile';
import { ProfileCard } from './ProfileCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X, Filter } from 'lucide-react';
import {
  ExperienceLevel,
  Industry,
  ConnectionGoal,
  EXPERIENCE_LABELS,
  INDUSTRY_LABELS,
  GOAL_LABELS,
} from '@/types/profile';

export function ConnectionFeed() {
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | undefined>();
  const [industry, setIndustry] = useState<Industry | undefined>();
  const [lookingFor, setLookingFor] = useState<ConnectionGoal | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: profiles, isLoading, error } = useProfiles({
    experienceLevel,
    industry,
    lookingFor,
  });

  const filteredProfiles = profiles?.filter((profile) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      profile.full_name?.toLowerCase().includes(query) ||
      profile.headline?.toLowerCase().includes(query) ||
      profile.bio?.toLowerCase().includes(query) ||
      profile.location?.toLowerCase().includes(query)
    );
  });

  const clearFilters = () => {
    setExperienceLevel(undefined);
    setIndustry(undefined);
    setLookingFor(undefined);
    setSearchQuery('');
  };

  const hasFilters = experienceLevel || industry || lookingFor || searchQuery;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load profiles. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, headline, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>

          <Select
            value={lookingFor ?? ''}
            onValueChange={(value) => setLookingFor(value as ConnectionGoal || undefined)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Looking for..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GOAL_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={industry ?? ''}
            onValueChange={(value) => setIndustry(value as Industry || undefined)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INDUSTRY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={experienceLevel ?? ''}
            onValueChange={(value) => setExperienceLevel(value as ExperienceLevel || undefined)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Experience" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EXPERIENCE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && filteredProfiles && (
        <p className="text-sm text-muted-foreground">
          {filteredProfiles.length} {filteredProfiles.length === 1 ? 'profile' : 'profiles'} found
        </p>
      )}

      {/* Profile Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <div className="flex flex-col items-center gap-2 px-6 pb-6">
                <Skeleton className="h-24 w-24 rounded-full -mt-12" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProfiles && filteredProfiles.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProfiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No profiles found matching your criteria.</p>
          {hasFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
