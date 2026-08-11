import { useQuery } from '@tanstack/react-query'
import { getActiveShift } from '@/services/stock'
import type { ShiftInfo } from '@/types'

export function useActiveShift(disabled = false) {
  return useQuery({
    queryKey: ['active-shift'],
    queryFn: getActiveShift,
    enabled: !disabled,
    staleTime: 60_000,
    refetchInterval: 60_000
  })
}

export function useStockSnapshot() {
  return useQuery({
    queryKey: ['stock-snapshot'],
    queryFn: async () => null,
    enabled: false
  })
}

export type { ShiftInfo }
