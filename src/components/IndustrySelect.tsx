import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { INDUSTRIES, getIndustriesGroupedByCategory, getIndustryById } from '@/data/industries';

interface IndustrySelectProps {
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showOther?: boolean;
}

export function IndustrySelect({ 
  value, 
  onChange, 
  placeholder = 'Select industry...', 
  disabled = false,
  showOther = false
}: IndustrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const groupedIndustries = useMemo(() => getIndustriesGroupedByCategory(), []);
  
  const selectedIndustry = value ? getIndustryById(value) : null;

  // Filter industries based on search
  const filteredGroups = useMemo(() => {
    if (!search) return groupedIndustries;
    
    const searchLower = search.toLowerCase();
    const filtered: Record<string, typeof INDUSTRIES> = {};
    
    Object.entries(groupedIndustries).forEach(([category, industries]) => {
      const matchingIndustries = industries.filter(
        i => i.name.toLowerCase().includes(searchLower) || 
             i.category.toLowerCase().includes(searchLower)
      );
      if (matchingIndustries.length > 0) {
        filtered[category] = matchingIndustries;
      }
    });
    
    return filtered;
  }, [groupedIndustries, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {value === 'other' ? 'Other' : selectedIndustry ? selectedIndustry.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search industries..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No industry found.</CommandEmpty>
            {Object.entries(filteredGroups).map(([category, industries]) => (
              <CommandGroup key={category} heading={category}>
                {industries.map((industry) => (
                  <CommandItem
                    key={industry.id}
                    value={industry.id}
                    onSelect={() => {
                      onChange(industry.id);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === industry.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {industry.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {showOther && (
              <CommandGroup heading="Other">
                <CommandItem
                  value="other"
                  onSelect={() => {
                    onChange('other');
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === 'other' ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Other (please specify)
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
