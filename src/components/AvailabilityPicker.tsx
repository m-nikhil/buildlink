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
import { Clock, Moon, Trash2 } from 'lucide-react';
import { TimeSlot, useUserAvailability, useSaveAvailability } from '@/hooks/useAvailability';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6]; // Sunday = 0

// Generate time slots
function generateTimeSlots(includeNight: boolean): { hour: number; minute: number; label: string }[] {
  const slots: { hour: number; minute: number; label: string }[] = [];
  
  // Night hours (12 AM - 5 AM)
  if (includeNight) {
    for (let hour = 0; hour < 5; hour++) {
      const displayHour = hour === 0 ? 12 : hour;
      slots.push({ hour, minute: 0, label: `${displayHour}:00 AM` });
      slots.push({ hour, minute: 30, label: `${displayHour}:30 AM` });
    }
  }
  
  // Day hours (5 AM - 12 AM / midnight)
  for (let hour = 5; hour < 24; hour++) {
    const isPM = hour >= 12;
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    slots.push({ hour, minute: 0, label: `${displayHour}:00 ${isPM ? 'PM' : 'AM'}` });
    slots.push({ hour, minute: 30, label: `${displayHour}:30 ${isPM ? 'PM' : 'AM'}` });
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
        const [startHour, startMin] = slot.start_time.split(':').map(Number);
        const [endHour, endMin] = slot.end_time.split(':').map(Number);
        
        // Check if there are any night slots
        if (startHour < 5 || (endHour < 5 && endHour > 0)) {
          hasNightSlots = true;
        }
        
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
      dayHours.set(day, (dayHours.get(day) || 0) + 0.5);
    });
    
    return {
      totalHours: selectedSlots.size * 0.5,
      perDayHours: dayHours,
    };
  })();

  // Debounced save function
  const saveSlots = useCallback((slots: Set<SlotKey>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
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

      await saveAvailability.mutateAsync(timeSlots);
    }, 800);
  }, [saveAvailability, timezone]);

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
      
      saveSlots(newSlots);
      return newSlots;
    });
  }, [saveSlots]);

  const handleClearAll = useCallback(() => {
    setSelectedSlots(new Set());
    saveSlots(new Set());
  }, [saveSlots]);

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

  const handleTouchStart = useCallback((day: number, hour: number, minute: number) => {
    const key: SlotKey = `${day}-${hour}-${minute}`;
    const mode = selectedSlots.has(key) ? 'deselect' : 'select';
    setIsDragging(true);
    setDragMode(mode);
    toggleSlot(day, hour, minute, mode);
  }, [selectedSlots, toggleSlot]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !gridRef.current) return;
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element && element.getAttribute('data-slot')) {
      const [day, hour, minute] = element.getAttribute('data-slot')!.split('-').map(Number);
      toggleSlot(day, hour, minute, dragMode);
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Set Your Weekly Availability
        </CardTitle>
        <CardDescription>
          Click and drag to toggle availability. Changes save automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend & Night toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span>Unavailable</span>
              <div className="w-5 h-5 rounded bg-slot-unavailable border border-slot-border-unavailable" />
            </div>
            <div className="flex items-center gap-2">
              <span>Available</span>
              <div className="w-5 h-5 rounded bg-slot-available border border-slot-border-available" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedSlots.size === 0}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
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
            
            <div className="flex items-center gap-2">
              <Switch
                id="night-hours"
                checked={showNightHours}
                onCheckedChange={setShowNightHours}
              />
              <Label htmlFor="night-hours" className="flex items-center gap-1 text-sm cursor-pointer">
                <Moon className="h-4 w-4" />
                Night hours
              </Label>
            </div>
          </div>
        </div>

        {/* Timezone */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Timezone:</span>
          <Badge variant="secondary">{timezone}</Badge>
        </div>

        {/* Grid */}
        <div 
          ref={gridRef}
          className="overflow-x-auto touch-none max-h-[400px] overflow-y-auto"
          onTouchMove={handleTouchMove}
        >
          <div className="min-w-[420px] select-none">
            {/* Header row - sticky */}
            <div className="grid grid-cols-8 gap-0.5 mb-1 sticky top-0 bg-card z-10 py-1">
              <div className="text-xs text-muted-foreground text-right pr-2" />
              {DAYS.map(day => (
                <div key={day} className="text-center font-medium text-sm py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Time rows */}
            {TIME_SLOTS.map(({ hour, minute, label }) => (
              <div key={`${hour}-${minute}`} className="grid grid-cols-8 gap-0.5 mb-0.5">
                <div className="text-xs text-muted-foreground text-right pr-2 flex items-center justify-end">
                  {minute === 0 ? label : ''}
                </div>
                {DAY_VALUES.map(day => {
                  const key: SlotKey = `${day}-${hour}-${minute}`;
                  const isSelected = selectedSlots.has(key);
                  
                  return (
                    <div
                      key={key}
                      data-slot={`${day}-${hour}-${minute}`}
                      className={cn(
                        "h-5 rounded-sm cursor-pointer transition-colors border",
                        isSelected 
                          ? "bg-slot-available border-slot-border-available hover:bg-slot-available-hover" 
                          : "bg-slot-unavailable border-slot-border-unavailable hover:bg-slot-unavailable-hover"
                      )}
                      onMouseDown={() => handleMouseDown(day, hour, minute)}
                      onMouseEnter={() => handleMouseEnter(day, hour, minute)}
                      onTouchStart={() => handleTouchStart(day, hour, minute)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Per-day breakdown */}
        <div className="pt-3 border-t space-y-2">
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm">
            {DAY_VALUES.map(day => {
              const hours = perDayHours.get(day) || 0;
              return (
                <span key={day} className="text-muted-foreground">
                  <span className="font-medium text-foreground">{DAY_NAMES_FULL[day]}:</span>{' '}
                  {hours > 0 ? `${hours}h` : '—'}
                </span>
              );
            })}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Total: <span className="font-medium text-foreground">{totalHours}</span> hours/week
          </p>
        </div>

        {/* Saving indicator */}
        {saveAvailability.isPending && (
          <div className="text-center text-sm text-muted-foreground">
            Saving...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
