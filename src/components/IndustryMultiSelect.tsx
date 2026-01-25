import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface IndustryMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxDisplay?: number;
  maxSelections?: number;
}

export function IndustryMultiSelect({ 
  value = [], 
  onChange, 
  placeholder = 'Select industries...', 
  disabled = false,
  maxDisplay = 3,
  maxSelections = 3
}: IndustryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const groupedIndustries = useMemo(() => getIndustriesGroupedByCategory(), []);
  
  const selectedIndustries = value.map(id => getIndustryById(id)).filter(Boolean);

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

  const toggleIndustry = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id));
    } else if (value.length < maxSelections) {
      onChange([...value, id]);
    }
  };

  const isMaxReached = value.length >= maxSelections;

  const removeIndustry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal h-auto min-h-10"
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedIndustries.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selectedIndustries.length <= maxDisplay ? (
              selectedIndustries.map(industry => (
                <Badge 
                  key={industry!.id} 
                  variant="secondary" 
                  className="mr-1"
                >
                  {industry!.name}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={(e) => removeIndustry(industry!.id, e)}
                  />
                </Badge>
              ))
            ) : (
              <span>{selectedIndustries.length} industries selected</span>
            )}
          </div>
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
                {industries.map((industry) => {
                  const isSelected = value.includes(industry.id);
                  const isDisabled = isMaxReached && !isSelected;
                  return (
                    <CommandItem
                      key={industry.id}
                      value={industry.id}
                      onSelect={() => toggleIndustry(industry.id)}
                      disabled={isDisabled}
                      className={cn(isDisabled && "opacity-50 cursor-not-allowed")}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {industry.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
