import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Trash2, Save } from 'lucide-react';
import { TimeSlot, getDayName, useUserAvailability, useSaveAvailability } from '@/hooks/useAvailability';

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const TIME_OPTIONS = [
  { value: '08:00', label: '8:00 AM' },
  { value: '08:30', label: '8:30 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '09:30', label: '9:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '13:30', label: '1:30 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '14:30', label: '2:30 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '15:30', label: '3:30 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '16:30', label: '4:30 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '17:30', label: '5:30 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '18:30', label: '6:30 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '19:30', label: '7:30 PM' },
  { value: '20:00', label: '8:00 PM' },
];

function formatTime(time: string): string {
  const option = TIME_OPTIONS.find(t => t.value === time || t.value === time.slice(0, 5));
  return option?.label || time;
}

interface AvailabilityPickerProps {
  onSaved?: () => void;
}

export function AvailabilityPicker({ onSaved }: AvailabilityPickerProps) {
  const { data: existingSlots, isLoading } = useUserAvailability();
  const saveAvailability = useSaveAvailability();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Initialize from existing data
  useEffect(() => {
    if (existingSlots && existingSlots.length > 0) {
      const mappedSlots = existingSlots.map(s => ({
        day_of_week: s.day_of_week,
        start_time: s.start_time.slice(0, 5), // Remove seconds
        end_time: s.end_time.slice(0, 5),
        timezone: s.timezone,
      }));
      setSlots(mappedSlots);
      setSelectedDays([...new Set(mappedSlots.map(s => s.day_of_week))]);
    }
  }, [existingSlots]);

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
      setSlots(slots.filter(s => s.day_of_week !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
      // Add a default slot for this day
      setSlots([...slots, {
        day_of_week: day,
        start_time: '09:00',
        end_time: '10:00',
        timezone,
      }]);
    }
  };

  const addSlot = (day: number) => {
    const daySlots = slots.filter(s => s.day_of_week === day);
    const lastSlot = daySlots[daySlots.length - 1];
    const newStartIndex = lastSlot 
      ? TIME_OPTIONS.findIndex(t => t.value === lastSlot.end_time) 
      : 0;
    const newStart = TIME_OPTIONS[newStartIndex]?.value || '09:00';
    const newEndIndex = Math.min(newStartIndex + 2, TIME_OPTIONS.length - 1);
    const newEnd = TIME_OPTIONS[newEndIndex]?.value || '10:00';

    setSlots([...slots, {
      day_of_week: day,
      start_time: newStart,
      end_time: newEnd,
      timezone,
    }]);
  };

  const removeSlot = (day: number, index: number) => {
    const daySlots = slots.filter(s => s.day_of_week === day);
    const otherSlots = slots.filter(s => s.day_of_week !== day);
    daySlots.splice(index, 1);
    
    if (daySlots.length === 0) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    }
    
    setSlots([...otherSlots, ...daySlots]);
  };

  const updateSlot = (day: number, index: number, field: 'start_time' | 'end_time', value: string) => {
    const newSlots = [...slots];
    const daySlots = newSlots.filter(s => s.day_of_week === day);
    const slotIndex = newSlots.findIndex(s => s === daySlots[index]);
    
    if (slotIndex !== -1) {
      newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value };
      setSlots(newSlots);
    }
  };

  const handleSave = async () => {
    // Validate slots
    const validSlots = slots.filter(slot => {
      const startIndex = TIME_OPTIONS.findIndex(t => t.value === slot.start_time);
      const endIndex = TIME_OPTIONS.findIndex(t => t.value === slot.end_time);
      return startIndex < endIndex;
    });

    await saveAvailability.mutateAsync(validSlots);
    onSaved?.();
  };

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
          Select the days and times you're available for a 30-minute intro call. 
          We'll match you with someone who has overlapping availability.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timezone */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Timezone:</span>
          <Badge variant="secondary">{timezone}</Badge>
        </div>

        {/* Day Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Available Days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(day => (
              <div key={day.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`day-${day.value}`}
                  checked={selectedDays.includes(day.value)}
                  onCheckedChange={() => toggleDay(day.value)}
                />
                <label
                  htmlFor={`day-${day.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {day.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Time Slots per Day */}
        {selectedDays.length > 0 && (
          <div className="space-y-4">
            <label className="text-sm font-medium">Time Slots</label>
            {DAYS.filter(day => selectedDays.includes(day.value)).map(day => {
              const daySlots = slots.filter(s => s.day_of_week === day.value);
              return (
                <div key={day.value} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{day.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addSlot(day.value)}
                      className="h-7 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Slot
                    </Button>
                  </div>
                  {daySlots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Select
                        value={slot.start_time}
                        onValueChange={(v) => updateSlot(day.value, idx, 'start_time', v)}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue placeholder="Start" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">to</span>
                      <Select
                        value={slot.end_time}
                        onValueChange={(v) => updateSlot(day.value, idx, 'end_time', v)}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue placeholder="End" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeSlot(day.value, idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saveAvailability.isPending || slots.length === 0}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveAvailability.isPending ? 'Saving...' : 'Save Availability'}
        </Button>
      </CardContent>
    </Card>
  );
}
