import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { TimeSlot, useUserAvailability, useSaveAvailability } from '@/hooks/useAvailability';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6]; // Sunday = 0

// 30-minute slots from 9 AM to 6 PM
const TIME_SLOTS: { hour: number; minute: number; label: string }[] = [];
for (let hour = 9; hour < 18; hour++) {
  TIME_SLOTS.push({ hour, minute: 0, label: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}` });
  TIME_SLOTS.push({ hour, minute: 30, label: `${hour > 12 ? hour - 12 : hour}:30 ${hour >= 12 ? 'PM' : 'AM'}` });
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
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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

  // Calculate total selected hours
  const totalHours = selectedSlots.size * 0.5;

  // Debounced save function
  const saveSlots = useCallback((slots: Set<SlotKey>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      // Convert selected slots to TimeSlot format
      // Group consecutive 30-min slots per day
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
        // Sort by time
        times.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
        
        if (times.length === 0) return;
        
        // Group consecutive slots
        let startTime = times[0];
        let endTime = times[0];
        
        for (let i = 1; i <= times.length; i++) {
          const current = times[i];
          const prevMinutes = endTime.hour * 60 + endTime.minute;
          const currMinutes = current ? current.hour * 60 + current.minute : -1;
          
          if (current && currMinutes === prevMinutes + 30) {
            endTime = current;
          } else {
            // End of consecutive block - calculate end time (add 30 min to last slot)
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
      // Don't call onSaved to avoid auto-switching tabs
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

  // Touch support
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

  // Add global mouse up listener
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
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span>Unavailable</span>
            <div className="w-6 h-6 rounded bg-slot-unavailable border border-slot-border-unavailable" />
          </div>
          <div className="flex items-center gap-2">
            <span>Available</span>
            <div className="w-6 h-6 rounded bg-slot-available border border-slot-border-available" />
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
          className="overflow-x-auto touch-none"
          onTouchMove={handleTouchMove}
        >
          <div className="min-w-[420px] select-none">
            {/* Header row */}
            <div className="grid grid-cols-8 gap-0.5 mb-1">
              <div className="text-xs text-muted-foreground text-right pr-2" />
              {DAYS.map(day => (
                <div key={day} className="text-center font-medium text-sm py-2">
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
                        "h-6 rounded-sm cursor-pointer transition-colors border",
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

        {/* Summary */}
        <div className="text-center pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{totalHours}</span> hours selected this week
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
