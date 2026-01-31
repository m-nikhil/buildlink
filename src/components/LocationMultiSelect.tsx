import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LocationMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  max?: number;
  placeholder?: string;
}

interface LocationSuggestion {
  id: string;
  name: string;
  fullName: string;
  city: string;
  country: string;
  countryCode: string;
}

export function LocationMultiSelect({ 
  value, 
  onChange, 
  disabled, 
  max = 3,
  placeholder = "Search for a city..." 
}: LocationMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

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
      if (query) {
        searchLocations(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchLocations]);

  const handleSelect = (suggestion: LocationSuggestion) => {
    const locationString = suggestion.country 
      ? `${suggestion.city}, ${suggestion.country}`
      : suggestion.city;
    
    if (!value.includes(locationString) && value.length < max) {
      onChange([...value, locationString]);
    }
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  };

  const handleRemove = (location: string) => {
    onChange(value.filter(l => l !== location));
  };

  const handleInputChange = (newValue: string) => {
    setQuery(newValue);
    if (!open && newValue.length >= 2) {
      setOpen(true);
    }
  };

  const isMaxReached = value.length >= max;

  return (
    <div className="space-y-3">
      {/* Selected locations */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((location) => (
            <Badge key={location} variant="secondary" className="gap-1 pr-1">
              <MapPin className="h-3 w-3" />
              {location}
              <button
                type="button"
                onClick={() => handleRemove(location)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      {!isMaxReached && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => query.length >= 2 && setOpen(true)}
                placeholder={placeholder}
                disabled={disabled || isMaxReached}
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
                    {suggestions.map((suggestion) => {
                      const locationString = suggestion.country 
                        ? `${suggestion.city}, ${suggestion.country}`
                        : suggestion.city;
                      const isSelected = value.includes(locationString);
                      
                      return (
                        <CommandItem
                          key={suggestion.id}
                          value={suggestion.fullName}
                          onSelect={() => !isSelected && handleSelect(suggestion)}
                          className={isSelected ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                          disabled={isSelected}
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
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {isMaxReached && (
        <p className="text-xs text-muted-foreground">
          Maximum {max} locations selected
        </p>
      )}
    </div>
  );
}
