import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LocationSelectProps {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}

interface LocationSuggestion {
  id: string;
  name: string;
  fullName: string;
  city: string;
  country: string;
  countryCode: string;
}

export function LocationSelect({ value, onChange, disabled, hideLabel }: LocationSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSelected, setHasSelected] = useState(!!value);

  // Sync with external value changes
  useEffect(() => {
    setQuery(value || '');
    setHasSelected(!!value);
  }, [value]);

  const searchLocations = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode', {
        body: { query: searchQuery },
      });

      if (error) {
        console.error('Geocode error:', error);
        setSuggestions([]);
        return;
      }

      setSuggestions(data?.suggestions || []);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query && query !== value) {
        searchLocations(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, value, searchLocations]);

  const handleSelect = (suggestion: LocationSuggestion) => {
    const locationString = suggestion.country 
      ? `${suggestion.city}, ${suggestion.country}`
      : suggestion.city;
    setQuery(locationString);
    onChange(locationString);
    setHasSelected(true);
    setOpen(false);
    setSuggestions([]);
  };

  const handleInputChange = (newValue: string) => {
    setQuery(newValue);
    setHasSelected(false); // Mark as not selected when user types
    if (!open && newValue.length >= 2) {
      setOpen(true);
    }
  };

  const handleBlur = () => {
    // Only allow selected values - revert to previous valid value if not selected
    setTimeout(() => {
      if (!hasSelected) {
        // Revert to the last valid value
        setQuery(value || '');
      }
      setOpen(false);
    }, 200);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setHasSelected(false);
    setSuggestions([]);
  };

  return (
    <div className="space-y-2">
      {!hideLabel && <Label htmlFor="location">Location</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => query.length >= 2 && setOpen(true)}
              onBlur={handleBlur}
              placeholder="Search for a city..."
              disabled={disabled}
              className="pl-10"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {suggestions.length === 0 && !loading && query.length >= 2 && (
                <CommandEmpty>No locations found.</CommandEmpty>
              )}
              {suggestions.length > 0 && (
                <CommandGroup>
                  {suggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion.id}
                      value={suggestion.fullName}
                      onSelect={() => handleSelect(suggestion)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">{suggestion.city}</span>
                        {suggestion.country && (
                          <span className="text-xs text-muted-foreground">
                            {suggestion.country}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
