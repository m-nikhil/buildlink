import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Moon, Globe } from 'lucide-react';
import { TimeSlot, useUserAvailability, useSaveAvailability } from '@/hooks/useAvailability';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

// Common timezones grouped by region
const TIMEZONE_OPTIONS = [
  { group: 'Americas', zones: [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
    { value: 'America/Toronto', label: 'Toronto' },
    { value: 'America/Vancouver', label: 'Vancouver' },
    { value: 'America/Mexico_City', label: 'Mexico City' },
    { value: 'America/Sao_Paulo', label: 'São Paulo' },
  ]},
  { group: 'Europe & Africa', zones: [
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
    { value: 'Europe/Stockholm', label: 'Stockholm (CET)' },
    { value: 'Europe/Moscow', label: 'Moscow' },
    { value: 'Africa/Cairo', label: 'Cairo' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg' },
  ]},
  { group: 'Asia & Pacific', zones: [
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Singapore', label: 'Singapore' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
    { value: 'Asia/Shanghai', label: 'Shanghai' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Seoul', label: 'Seoul' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
    { value: 'Australia/Melbourne', label: 'Melbourne' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
  ]},
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6];

// Generate time slots - 30 min increments
function generateTimeSlots(includeNight: boolean): { hour: number; minute: number; label: string }[] {
  const slots: { hour: number; minute: number; label: string }[] = [];
  
  // Night hours first (12 AM - 5:30 AM)
  if (includeNight) {
    for (let hour = 0; hour < 6; hour++) {
      const displayHour = hour === 0 ? 12 : hour;
      slots.push({ hour, minute: 0, label: `${displayHour} AM` });
      slots.push({ hour, minute: 30, label: '' });
    }
  }
  
  // Day hours (6 AM - 11:30 PM)
  for (let hour = 6; hour < 24; hour++) {
    const isPM = hour >= 12;
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour === 12 ? 12 : hour;
    slots.push({ hour, minute: 0, label: `${displayHour} ${isPM ? 'PM' : 'AM'}` });
    slots.push({ hour, minute: 30, label: '' });
  }
  
  return slots;
}

interface AvailabilityPickerProps {
  onSaved?: () => void;
}

type SlotKey = `${number}-${number}-${number}`; // day-hour-minute

function formatTimeValue(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function AvailabilityPicker({ onSaved }: AvailabilityPickerProps) {
  const { data: existingSlots, isLoading } = useUserAvailability();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const saveAvailability = useSaveAvailability();
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');
  const [showNightHours, setShowNightHours] = useState(false);
  
  // Get timezone from profile or detect from browser
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [timezone, setTimezone] = useState(detectedTimezone);
  
  const [hasChanges, setHasChanges] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const TIME_SLOTS = generateTimeSlots(showNightHours);
  
  // Initialize timezone from profile
  useEffect(() => {
    if (profile?.timezone) {
      setTimezone(profile.timezone);
    }
  }, [profile?.timezone]);
  
  // Get display label for current timezone
  const timezoneLabel = useMemo(() => {
    for (const group of TIMEZONE_OPTIONS) {
      const found = group.zones.find(z => z.value === timezone);
      if (found) return found.label;
    }
    return timezone; // Fallback to raw timezone
  }, [timezone]);
  
  const handleTimezoneChange = async (newTimezone: string) => {
    setTimezone(newTimezone);
    // Save to profile
    await updateProfile.mutateAsync({ timezone: newTimezone });
  };

  // Initialize from existing data
  useEffect(() => {
    if (existingSlots && existingSlots.length > 0) {
      const slots = new Set<SlotKey>();
      
      existingSlots.forEach(slot => {
        const [startHour, startMin] = slot.start_time.split(':').map(Number);
        const [endHour, endMin] = slot.end_time.split(':').map(Number);
        
        // Mark each 30-min slot in the range
        let h = startHour;
        let m = startMin;
        while (h < endHour || (h === endHour && m < endMin)) {
          slots.add(`${slot.day_of_week}-${h}-${m}`);
          m += 30;
          if (m >= 60) {
            m = 0;
            h += 1;
          }
        }
      });
      
      setSelectedSlots(slots);
    }
  }, [existingSlots]);

  // Calculate total selected hours and per-day breakdown
  const { totalHours, perDayHours } = (() => {
    const dayHours = new Map<number, number>();
    DAY_VALUES.forEach(d => dayHours.set(d, 0));
    
    selectedSlots.forEach(key => {
      const [day] = key.split('-').map(Number);
      dayHours.set(day, (dayHours.get(day) || 0) + 0.5);
    });
    
    return {
      totalHours: selectedSlots.size * 0.5,
      perDayHours: dayHours,
    };
  })();

  // Build time slots from selected grid slots
  const buildTimeSlots = useCallback((slots: Set<SlotKey>): TimeSlot[] => {
    const slotsByDay = new Map<number, { hour: number; minute: number }[]>();
    
    slots.forEach(key => {
      const [day, hour, minute] = key.split('-').map(Number);
      if (!slotsByDay.has(day)) {
        slotsByDay.set(day, []);
      }
      slotsByDay.get(day)!.push({ hour, minute });
    });

    const timeSlots: TimeSlot[] = [];
    
    slotsByDay.forEach((times, day) => {
      times.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
      
      if (times.length === 0) return;
      
      let startTime = times[0];
      let endTime = times[0];
      
      for (let i = 1; i <= times.length; i++) {
        const current = times[i];
        const prevMinutes = endTime.hour * 60 + endTime.minute;
        const currMinutes = current ? current.hour * 60 + current.minute : -1;
        
        if (current && currMinutes === prevMinutes + 30) {
          endTime = current;
        } else {
          let endH = endTime.hour;
          let endM = endTime.minute + 30;
          if (endM >= 60) {
            endM = 0;
            endH += 1;
          }
          
          timeSlots.push({
            day_of_week: day,
            start_time: formatTimeValue(startTime.hour, startTime.minute),
            end_time: formatTimeValue(endH, endM),
            timezone,
          });
          
          if (current) {
            startTime = current;
            endTime = current;
          }
        }
      }
    });

    return timeSlots;
  }, [timezone]);

  const handleSave = useCallback(async () => {
    const timeSlots = buildTimeSlots(selectedSlots);
    await saveAvailability.mutateAsync(timeSlots);
    setHasChanges(false);
  }, [buildTimeSlots, selectedSlots, saveAvailability]);

  const toggleSlot = useCallback((day: number, hour: number, minute: number, forceMode?: 'select' | 'deselect') => {
    const key: SlotKey = `${day}-${hour}-${minute}`;
    
    setSelectedSlots(prev => {
      const newSlots = new Set(prev);
      const mode = forceMode || (newSlots.has(key) ? 'deselect' : 'select');
      
      if (mode === 'select') {
        newSlots.add(key);
      } else {
        newSlots.delete(key);
      }
      
      setHasChanges(true);
      return newSlots;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedSlots(new Set());
    setHasChanges(true);
  }, []);

  const handleMouseDown = useCallback((day: number, hour: number, minute: number) => {
    const key: SlotKey = `${day}-${hour}-${minute}`;
    const mode = selectedSlots.has(key) ? 'deselect' : 'select';
    setIsDragging(true);
    setDragMode(mode);
    toggleSlot(day, hour, minute, mode);
  }, [selectedSlots, toggleSlot]);

  const handleMouseEnter = useCallback((day: number, hour: number, minute: number) => {
    if (isDragging) {
      toggleSlot(day, hour, minute, dragMode);
    }
  }, [isDragging, dragMode, toggleSlot]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mobile: single tap to toggle
  const handleTouchStart = useCallback((day: number, hour: number, minute: number) => {
    const key: SlotKey = `${day}-${hour}-${minute}`;
    const mode = selectedSlots.has(key) ? 'deselect' : 'select';
    toggleSlot(day, hour, minute, mode);
  }, [selectedSlots, toggleSlot]);

  // Disable drag-to-select on mobile to allow scrolling
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Allow native scrolling - don't interfere
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Don't reset dragging on touch end to allow two-tap flow
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseUp, handleTouchEnd]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Set Your Weekly Availability
        </CardTitle>
        <CardDescription>
          Tap or click to toggle. Drag to select multiple. Changes save automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Controls row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-slot-unavailable border border-slot-border-unavailable" />
              <span className="text-muted-foreground">Unavailable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-slot-available border border-slot-border-available" />
              <span className="text-muted-foreground">Available</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="night-hours"
              checked={showNightHours}
              onCheckedChange={setShowNightHours}
              className="scale-90"
            />
            <Label htmlFor="night-hours" className="flex items-center gap-1 text-xs cursor-pointer text-muted-foreground">
              <Moon className="h-3.5 w-3.5" />
              Night
            </Label>
          </div>
        </div>

        {/* Timezone selector */}
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <Select value={timezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger className="h-8 w-auto min-w-[180px] text-xs">
              <SelectValue>{timezoneLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map(group => (
                <div key={group.group}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {group.group}
                  </div>
                  {group.zones.map(zone => (
                    <SelectItem key={zone.value} value={zone.value} className="text-xs">
                      {zone.label}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid - allow touch scrolling on mobile */}
        <div 
          ref={gridRef}
          className="overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0"
        >
          <div className="select-none">
            {/* Header row */}
            <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-px mb-px">
              <div />
              {DAYS.map(day => (
                <div key={day} className="text-center font-medium text-xs py-1.5 text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Time rows */}
            <div className="rounded-lg overflow-hidden border">
              {TIME_SLOTS.map(({ hour, minute, label }, idx) => {
                const rowKey = `${hour}-${minute}`;
                
                return (
                  <div 
                    key={rowKey}
                    className={cn(
                      "grid grid-cols-[50px_repeat(7,1fr)] gap-px bg-border",
                      idx > 0 && "border-t border-border"
                    )}
                  >
                    <div className="text-xs pr-2 flex items-center justify-end bg-card text-muted-foreground">
                      {label}
                    </div>
                    {DAY_VALUES.map(day => {
                      const key: SlotKey = `${day}-${hour}-${minute}`;
                      const isSelected = selectedSlots.has(key);
                      
                      return (
                        <div
                          key={key}
                          data-slot={`${day}-${hour}-${minute}`}
                          className={cn(
                            "h-5 cursor-pointer transition-colors",
                            isSelected 
                              ? "bg-slot-available hover:bg-slot-available-hover" 
                              : "bg-slot-unavailable hover:bg-slot-unavailable-hover"
                          )}
                          style={{ touchAction: 'manipulation' }}
                          onMouseDown={() => handleMouseDown(day, hour, minute)}
                          onMouseEnter={() => handleMouseEnter(day, hour, minute)}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            handleTouchStart(day, hour, minute);
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with summary and clear */}
        <div className="pt-2 border-t space-y-2">
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {DAY_VALUES.map(day => {
              const hours = perDayHours.get(day) || 0;
              if (hours === 0) return null;
              return (
                <span key={day}>
                  {DAY_NAMES_FULL[day]}: <span className="font-medium text-foreground">{hours}h</span>
                </span>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Total: <span className="font-medium text-foreground">{totalHours}</span> hours/week
            </p>
            
            {selectedSlots.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    Clear all
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all availability?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all your selected time slots. You'll need to set them again if you want to be matched for weekly intros.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Clear all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Saving indicator */}
        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={saveAvailability.isPending}
            className="w-full"
          >
            {saveAvailability.isPending ? 'Saving...' : 'Save Availability'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
