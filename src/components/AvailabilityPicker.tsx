import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { TimeSlot, useUserAvailability, useSaveAvailability } from '@/hooks/useAvailability';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6]; // Sunday = 0

const TIME_SLOTS = [
  { hour: 9, label: '9:00 AM' },
  { hour: 10, label: '10:00 AM' },
  { hour: 11, label: '11:00 AM' },
  { hour: 12, label: '12:00 PM' },
  { hour: 13, label: '1:00 PM' },
  { hour: 14, label: '2:00 PM' },
  { hour: 15, label: '3:00 PM' },
  { hour: 16, label: '4:00 PM' },
  { hour: 17, label: '5:00 PM' },
];

interface AvailabilityPickerProps {
  onSaved?: () => void;
}

type SlotKey = `${number}-${number}`; // day-hour

export function AvailabilityPicker({ onSaved }: AvailabilityPickerProps) {
  const { data: existingSlots, isLoading } = useUserAvailability();
  const saveAvailability = useSaveAvailability();
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize from existing data
  useEffect(() => {
    if (existingSlots && existingSlots.length > 0) {
      const slots = new Set<SlotKey>();
      existingSlots.forEach(slot => {
        const startHour = parseInt(slot.start_time.split(':')[0], 10);
        const endHour = parseInt(slot.end_time.split(':')[0], 10);
        // Mark each hour in the range as selected
        for (let h = startHour; h < endHour; h++) {
          slots.add(`${slot.day_of_week}-${h}`);
        }
      });
      setSelectedSlots(slots);
    }
  }, [existingSlots]);

  // Debounced save function
  const saveSlots = useCallback((slots: Set<SlotKey>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      // Convert selected slots to TimeSlot format
      // Group consecutive hours per day
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
        
        // Group consecutive hours
        let start = hours[0];
        let end = hours[0];
        
        for (let i = 1; i <= hours.length; i++) {
          if (i < hours.length && hours[i] === end + 1) {
            end = hours[i];
          } else {
            timeSlots.push({
              day_of_week: day,
              start_time: `${start.toString().padStart(2, '0')}:00`,
              end_time: `${(end + 1).toString().padStart(2, '0')}:00`,
              timezone,
            });
            if (i < hours.length) {
              start = hours[i];
              end = hours[i];
            }
          }
        }
      });

      await saveAvailability.mutateAsync(timeSlots);
      onSaved?.();
    }, 800);
  }, [saveAvailability, timezone, onSaved]);

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
      
      // Trigger save
      saveSlots(newSlots);
      
      return newSlots;
    });
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

  // Add global mouse up listener
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

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
        <div className="overflow-x-auto">
          <div className="min-w-[400px] select-none">
            {/* Header row */}
            <div className="grid grid-cols-8 gap-1 mb-1">
              <div className="text-xs text-muted-foreground text-right pr-2" />
              {DAYS.map(day => (
                <div key={day} className="text-center font-medium text-sm py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Time rows */}
            {TIME_SLOTS.map(({ hour, label }) => (
              <div key={hour} className="grid grid-cols-8 gap-1 mb-1">
                <div className="text-xs text-muted-foreground text-right pr-2 flex items-center justify-end">
                  {label}
                </div>
                {DAY_VALUES.map(day => {
                  const key: SlotKey = `${day}-${hour}`;
                  const isSelected = selectedSlots.has(key);
                  
                  return (
                    <div
                      key={key}
                      className={cn(
                        "h-10 rounded cursor-pointer transition-colors border",
                        isSelected 
                          ? "bg-slot-available border-slot-border-available hover:bg-slot-available-hover" 
                          : "bg-slot-unavailable border-slot-border-unavailable hover:bg-slot-unavailable-hover"
                      )}
                      onMouseDown={() => handleMouseDown(day, hour)}
                      onMouseEnter={() => handleMouseEnter(day, hour)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
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
