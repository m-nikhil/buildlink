import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Clock, Moon } from 'lucide-react';
import { TimeSlot, useUserAvailability, useSaveAvailability } from '@/hooks/useAvailability';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6];

// Generate time slots - 1 hour increments for cleaner display
function generateTimeSlots(includeNight: boolean): { hour: number; label: string }[] {
  const slots: { hour: number; label: string }[] = [];
  
  if (includeNight) {
    for (let hour = 0; hour < 6; hour++) {
      const displayHour = hour === 0 ? 12 : hour;
      slots.push({ hour, label: `${displayHour} AM` });
    }
  }
  
  for (let hour = 6; hour < 24; hour++) {
    const isPM = hour >= 12;
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    slots.push({ hour, label: `${displayHour} ${isPM ? 'PM' : 'AM'}` });
  }
  
  return slots;
}

interface AvailabilityPickerProps {
  onSaved?: () => void;
}

type SlotKey = `${number}-${number}`; // day-hour

function formatTimeValue(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

export function AvailabilityPicker({ onSaved }: AvailabilityPickerProps) {
  const { data: existingSlots, isLoading } = useUserAvailability();
  const saveAvailability = useSaveAvailability();
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');
  const [showNightHours, setShowNightHours] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const TIME_SLOTS = generateTimeSlots(showNightHours);

  // Initialize from existing data
  useEffect(() => {
    if (existingSlots && existingSlots.length > 0) {
      const slots = new Set<SlotKey>();
      let hasNightSlots = false;
      
      existingSlots.forEach(slot => {
        const [startHour] = slot.start_time.split(':').map(Number);
        const [endHour] = slot.end_time.split(':').map(Number);
        
        if (startHour < 6 || (endHour <= 6 && endHour > 0)) {
          hasNightSlots = true;
        }
        
        for (let h = startHour; h < endHour; h++) {
          slots.add(`${slot.day_of_week}-${h}`);
        }
      });
      
      setSelectedSlots(slots);
      if (hasNightSlots) {
        setShowNightHours(true);
      }
    }
  }, [existingSlots]);

  // Calculate total selected hours and per-day breakdown
  const { totalHours, perDayHours } = (() => {
    const dayHours = new Map<number, number>();
    DAY_VALUES.forEach(d => dayHours.set(d, 0));
    
    selectedSlots.forEach(key => {
      const [day] = key.split('-').map(Number);
      dayHours.set(day, (dayHours.get(day) || 0) + 1);
    });
    
    return {
      totalHours: selectedSlots.size,
      perDayHours: dayHours,
    };
  })();

  // Debounced save function
  const saveSlots = useCallback((slots: Set<SlotKey>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      const slotsByDay = new Map<number, number[]>();
      
      slots.forEach(key => {
        const [day, hour] = key.split('-').map(Number);
        if (!slotsByDay.has(day)) {
          slotsByDay.set(day, []);
        }
        slotsByDay.get(day)!.push(hour);
      });

      const timeSlots: TimeSlot[] = [];
      
      slotsByDay.forEach((hours, day) => {
        hours.sort((a, b) => a - b);
        
        if (hours.length === 0) return;
        
        let startHour = hours[0];
        let endHour = hours[0];
        
        for (let i = 1; i <= hours.length; i++) {
          const current = hours[i];
          
          if (current === endHour + 1) {
            endHour = current;
          } else {
            timeSlots.push({
              day_of_week: day,
              start_time: formatTimeValue(startHour),
              end_time: formatTimeValue(endHour + 1),
              timezone,
            });
            
            if (current !== undefined) {
              startHour = current;
              endHour = current;
            }
          }
        }
      });

      await saveAvailability.mutateAsync(timeSlots);
    }, 800);
  }, [saveAvailability, timezone]);

  const toggleSlot = useCallback((day: number, hour: number, forceMode?: 'select' | 'deselect') => {
    const key: SlotKey = `${day}-${hour}`;
    
    setSelectedSlots(prev => {
      const newSlots = new Set(prev);
      const mode = forceMode || (newSlots.has(key) ? 'deselect' : 'select');
      
      if (mode === 'select') {
        newSlots.add(key);
      } else {
        newSlots.delete(key);
      }
      
      saveSlots(newSlots);
      return newSlots;
    });
  }, [saveSlots]);

  const handleClearAll = useCallback(() => {
    setSelectedSlots(new Set());
    saveSlots(new Set());
  }, [saveSlots]);

  const handleMouseDown = useCallback((day: number, hour: number) => {
    const key: SlotKey = `${day}-${hour}`;
    const mode = selectedSlots.has(key) ? 'deselect' : 'select';
    setIsDragging(true);
    setDragMode(mode);
    toggleSlot(day, hour, mode);
  }, [selectedSlots, toggleSlot]);

  const handleMouseEnter = useCallback((day: number, hour: number) => {
    if (isDragging) {
      toggleSlot(day, hour, dragMode);
    }
  }, [isDragging, dragMode, toggleSlot]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((day: number, hour: number) => {
    const key: SlotKey = `${day}-${hour}`;
    const mode = selectedSlots.has(key) ? 'deselect' : 'select';
    setIsDragging(true);
    setDragMode(mode);
    toggleSlot(day, hour, mode);
  }, [selectedSlots, toggleSlot]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !gridRef.current) return;
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element && element.getAttribute('data-slot')) {
      const [day, hour] = element.getAttribute('data-slot')!.split('-').map(Number);
      toggleSlot(day, hour, dragMode);
    }
  }, [isDragging, dragMode, toggleSlot]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
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
          Click and drag to toggle. Changes save automatically.
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

        {/* Timezone */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Timezone:</span>
          <Badge variant="secondary" className="text-xs font-normal">{timezone}</Badge>
        </div>

        {/* Grid */}
        <div 
          ref={gridRef}
          className="touch-none"
          onTouchMove={handleTouchMove}
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
              {TIME_SLOTS.map(({ hour, label }, idx) => (
                <div 
                  key={hour} 
                  className={cn(
                    "grid grid-cols-[50px_repeat(7,1fr)] gap-px bg-border",
                    idx > 0 && "border-t border-border"
                  )}
                >
                  <div className="text-xs text-muted-foreground pr-2 flex items-center justify-end bg-card">
                    {label}
                  </div>
                  {DAY_VALUES.map(day => {
                    const key: SlotKey = `${day}-${hour}`;
                    const isSelected = selectedSlots.has(key);
                    
                    return (
                      <div
                        key={key}
                        data-slot={`${day}-${hour}`}
                        className={cn(
                          "h-7 cursor-pointer transition-colors",
                          isSelected 
                            ? "bg-slot-available hover:bg-slot-available-hover" 
                            : "bg-slot-unavailable hover:bg-slot-unavailable-hover"
                        )}
                        onMouseDown={() => handleMouseDown(day, hour)}
                        onMouseEnter={() => handleMouseEnter(day, hour)}
                        onTouchStart={() => handleTouchStart(day, hour)}
                      />
                    );
                  })}
                </div>
              ))}
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
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
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
        {saveAvailability.isPending && (
          <div className="text-center text-xs text-muted-foreground">
            Saving...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
