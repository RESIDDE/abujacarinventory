import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { VehicleEvent } from '@/types/database'

export const brandEventKeys = {
  all: ['brand-events'] as const,
  forMakes: (makes: string[]) => ['brand-events', makes] as const,
}

/** How far back a brand's movement log reaches. */
export const BRAND_EVENT_LIMIT = 100

/**
 * The latest movements across every vehicle of one brand.
 *
 * Filtered through the vehicle's make rather than a list of vehicle ids: a
 * brand with a few hundred cars would push an id list past what a URL can
 * carry, while the spellings of one make are only ever a handful.
 */
export function useBrandEvents(spellings: string[]) {
  const makes = [...spellings].sort()
  return useQuery({
    queryKey: brandEventKeys.forMakes(makes),
    enabled: makes.length > 0,
    queryFn: async (): Promise<VehicleEvent[]> => {
      const { data, error } = await supabase
        .from('vi_vehicle_events')
        .select('*, vi_vehicles!inner(make)')
        .in('vi_vehicles.make', makes)
        .order('occurred_at', { ascending: false })
        .limit(BRAND_EVENT_LIMIT)
      if (error) throw error
      return (data ?? []) as VehicleEvent[]
    },
  })
}
