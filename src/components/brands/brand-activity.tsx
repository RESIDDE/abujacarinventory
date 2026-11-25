import * as React from 'react'
import { ArrowDownLeft, ArrowUpRight, History, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatRelative, vehicleTitle } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VehicleEvent, VehicleWithOwner } from '@/types/database'

const PAGE = 12

interface BrandActivityProps {
  events: VehicleEvent[]
  /** This brand's vehicles, by id, to name the vehicle each movement was. */
  vehicles: Map<string, VehicleWithOwner>
  isLoading?: boolean
  isError?: boolean
  /** The log stopped at its cap, so there is older history than is shown. */
  truncated?: boolean
}

/**
 * Every check-in, release and sale across the brand, newest first. The full
 * detail of any one movement, signature included, is on the vehicle's page.
 */
export function BrandActivity({
  events,
  vehicles,
  isLoading,
  isError,
  truncated,
}: BrandActivityProps) {
  const [limit, setLimit] = React.useState(PAGE)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="rounded-2xl border border-dashed border-white/50 px-4 py-6 text-sm text-muted-foreground">
        The movement log could not be loaded. Each vehicle's own page still has its history.
      </p>
    )
  }

  const known = events.flatMap((event) => {
    const vehicle = vehicles.get(event.vehicle_id)
    return vehicle ? [{ event, vehicle }] : []
  })

  if (known.length === 0) {
    return (
      <p className="flex items-center gap-3 rounded-2xl border border-dashed border-white/50 px-4 py-6 text-sm text-muted-foreground">
        <History className="size-4 shrink-0" />
        No movements recorded yet.
      </p>
    )
  }

  const shown = known.slice(0, limit)

  return (
    <div className="space-y-3">
      <ol className="space-y-1.5">
        {shown.map(({ event, vehicle }) => {
          const isSale = event.event_type === 'sold'
          const outbound = isSale || event.event_type === 'released'
          const Icon = isSale ? Tag : outbound ? ArrowUpRight : ArrowDownLeft
          const label = isSale ? 'Sold' : outbound ? 'Released' : 'Checked in'
          const who = [
            event.recipient_name
              ? `${outbound ? 'to' : 'from'} ${event.recipient_name}`
              : null,
            event.staff_name ? `by ${event.staff_name}` : null,
          ]
            .filter(Boolean)
            .join(' · ')

          return (
            <li key={event.id}>
              <Link
                to={`/vehicles/${vehicle.id}`}
                className="flex items-start gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-white/45"
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border',
                    outbound
                      ? 'border-white/50 bg-[hsl(160_12%_40%/.3)] text-[hsl(160_16%_20%)]'
                      : 'border-primary/50 bg-primary/40 text-primary-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground"> · </span>
                    {vehicleTitle(vehicle)}
                  </span>
                  {who ? (
                    <span className="block truncate text-xs text-muted-foreground">{who}</span>
                  ) : null}
                  <span
                    className="block text-[0.7rem] text-muted-foreground"
                    title={formatRelative(event.occurred_at)}
                  >
                    {formatDateTime(event.occurred_at)}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>

      {known.length > shown.length ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((n) => n + PAGE * 2)}>
            Show older movements
          </Button>
        </div>
      ) : truncated ? (
        <p className="text-center text-xs text-muted-foreground">
          The latest {events.length} movements. Older ones are on each vehicle's page.
        </p>
      ) : null}
    </div>
  )
}
