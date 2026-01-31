import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/data/countries';

interface LocationSelectProps {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

// Parse "City, Country" format
function parseLocation(location: string | null): { city: string; country: string } {
  if (!location) return { city: '', country: '' };
  
  const parts = location.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const city = parts.slice(0, -1).join(', ');
    const countryPart = parts[parts.length - 1];
    // Try to match country name to code
    const matchedCountry = COUNTRIES.find(
      c => c.name.toLowerCase() === countryPart.toLowerCase() || c.code === countryPart
    );
    return { city, country: matchedCountry?.code || '' };
  }
  return { city: location, country: '' };
}

// Format to "City, Country Name"
function formatLocation(city: string, countryCode: string): string {
  if (!city && !countryCode) return '';
  const country = COUNTRIES.find(c => c.code === countryCode);
  if (city && country) return `${city}, ${country.name}`;
  if (city) return city;
  if (country) return country.name;
  return '';
}

export function LocationSelect({ value, onChange, disabled }: LocationSelectProps) {
  const parsed = parseLocation(value);
  const [city, setCity] = useState(parsed.city);
  const [country, setCountry] = useState(parsed.country);

  // Sync with external value changes
  useEffect(() => {
    const parsed = parseLocation(value);
    setCity(parsed.city);
    setCountry(parsed.country);
  }, [value]);

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    onChange(formatLocation(city, newCountry));
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    onChange(formatLocation(newCity, country));
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select
            value={country}
            onValueChange={handleCountryChange}
            disabled={disabled}
          >
            <SelectTrigger id="country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => handleCityChange(e.target.value)}
            placeholder="Enter your city"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
