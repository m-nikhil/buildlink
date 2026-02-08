import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface TimeSlot {
  id?: string;
  day_of_week: number; // 0=Sunday, 1=Monday, etc.
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  timezone: string;
}

export interface AvailabilitySlot extends TimeSlot {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] || '';
}

export function useUserAvailability() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['availability', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_weekly_availability')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      return data as AvailabilitySlot[];
    },
    enabled: !!user,
  });
}

export function useSaveAvailability() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slots: TimeSlot[]) => {
      if (!user) throw new Error('Not authenticated');

      // Delete all existing slots for this user
      const { error: deleteError } = await supabase
        .from('user_weekly_availability')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Insert new slots
      if (slots.length > 0) {
        const slotsToInsert = slots.map(slot => ({
          user_id: user.id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          timezone: slot.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        }));

        const { error: insertError } = await supabase
          .from('user_weekly_availability')
          .insert(slotsToInsert);

        if (insertError) throw insertError;
      }

      return slots;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      toast.success('Availability saved!');
    },
    onError: (error) => {
      console.error('Failed to save availability:', error);
      toast.error('Failed to save availability');
    },
  });
}

export function useHasAvailability() {
  const { data: availability, isLoading } = useUserAvailability();
  return {
    hasAvailability: (availability?.length ?? 0) > 0,
    isLoading,
  };
}
