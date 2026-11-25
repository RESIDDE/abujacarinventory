import * as React from 'react'
import { Car, Plus, Search, Upload, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { BrandLogo } from '@/components/brands/brand-logo'
import { BrandStrip } from '@/components/brands/brand-strip'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { HistoryDialog } from '@/components/vehicles/history-dialog'
import { MovementDialog } from '@/components/vehicles/movement-dialog'
import { VehicleCard } from '@/components/vehicles/vehicle-card'
import { VehicleFormDialog } from '@/components/vehicles/vehicle-form-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { usePhotoUrls } from '@/hooks/use-photo-urls'
import { useDeleteVehicle, useVehicles } from '@/hooks/use-vehicles'
import { brandFromSlug, groupByBrand, vehicleBrand } from '@/lib/brands'
import { describeDbError } from '@/lib/errors'
import { vehicleTitle } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VehicleEventType, VehicleStatus, VehicleWithOwner } from '@/types/database'

const FILTERS: { label: string; value: VehicleStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'In Stock', value: 'in_stock' },
  { label: 'Released', value: 'released' },
  { label: 'Sold', value: 'sold' },
]

function searchHaystack(vehicle: VehicleWithOwner) {
  return [
    vehicle.make,
    vehicle.model,
    vehicle.body_type,
    vehicle.vin,
    vehicle.color,
    vehicle.plate_number,
    vehicle.year,
    vehicle.owner?.full_name,
    vehicle.owner?.phone_primary,
    vehicle.owner?.phone_secondary,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export default function VehiclesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: vehicles = [], isLoading, isError, error, refetch } = useVehicles()
  const deleteVehicle = useDeleteVehicle()

  const [query, setQuery] = React.useState('')
  const [editing, setEditing] = React.useState<VehicleWithOwner | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [movement, setMovement] = React.useState<{
    vehicle: VehicleWithOwner
    eventType: VehicleEventType
  } | null>(null)
  const [history, setHistory] = React.useState<VehicleWithOwner | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<VehicleWithOwner | null>(null)

  // The status filter lives in the URL so dashboard tiles can deep-link into a
  // filtered view and it survives a refresh.
  const statusParam = searchParams.get('status')
  const status: VehicleStatus | 'all' =
    statusParam === 'in_stock' || statusParam === 'released' || statusParam === 'sold'
      ? statusParam
      : 'all'

  const setStatus = (next: VehicleStatus | 'all') => {
    const params = new URLSearchParams(searchParams)
    if (next === 'all') params.delete('status')
    else params.set('status', next)
    setSearchParams(params, { replace: true })
  }

  // ?new=1 opens the check-in form, which is how the nav and dashboard get here.
  const wantsNew = searchParams.get('new') === '1'
  React.useEffect(() => {
    if (!wantsNew) return
    setEditing(null)
    setFormOpen(true)
    const params = new URLSearchParams(searchParams)
    params.delete('new')
    setSearchParams(params, { replace: true })
  }, [wantsNew, searchParams, setSearchParams])

  // ?owner= narrows the list to one owner, which is how the owner cards link
  // in; ?brand= to one make, which is how a brand record links in.
  const ownerId = searchParams.get('owner')
  const brandSlug = searchParams.get('brand')
  const scoped = React.useMemo(
    () =>
      vehicles.filter(
        (v) =>
          (!ownerId || v.owner_id === ownerId) &&
          (!brandSlug || vehicleBrand(v.make).slug === brandSlug),
      ),
    [vehicles, ownerId, brandSlug],
  )
  const ownerName = scoped[0]?.owner?.full_name ?? null

  // The strip lists every make in the yard, whatever the list is filtered to.
  const brandGroups = React.useMemo(() => groupByBrand(vehicles), [vehicles])
  const activeBrand = brandSlug
    ? (brandGroups.find((g) => g.brand.slug === brandSlug)?.brand ?? brandFromSlug(brandSlug))
    : null

  /** One URL update for every key, so no call overwrites another's change. */
  const clearParams = (...keys: string[]) => {
    const params = new URLSearchParams(searchParams)
    for (const key of keys) params.delete(key)
    setSearchParams(params, { replace: true })
  }

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return scoped.filter((vehicle) => {
      if (status !== 'all' && vehicle.status !== status) return false
      if (!needle) return true
      return searchHaystack(vehicle).includes(needle)
    })
  }, [scoped, status, query])

  const counts = React.useMemo(
    () => ({
      all: scoped.length,
      in_stock: scoped.filter((v) => v.status === 'in_stock').length,
      released: scoped.filter((v) => v.status === 'released').length,
      sold: scoped.filter((v) => v.status === 'sold').length,
    }),
    [scoped],
  )

  // One signing request for the whole grid rather than one per card.
  const firstPhotos = React.useMemo(
    () => filtered.flatMap((vehicle) => (vehicle.photos[0] ? [vehicle.photos[0]] : [])),
    [filtered],
  )
  const { data: photoUrls = {} } = usePhotoUrls(firstPhotos)

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteVehicle.mutateAsync(pendingDelete.id)
      toast.success('Vehicle deleted')
    } catch (err) {
      toast.error(describeDbError(err))
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <div className="page-enter space-y-6">
      <header className="glass-hero rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Inventory
            </p>
            <h1 className="mt-2 text-4xl tracking-tight text-display sm:text-5xl">
              Vehicles
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLoading
                ? 'Loading records…'
                : `${filtered.length} of ${counts.all} record${counts.all === 1 ? '' : 's'}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="lg" asChild>
              <Link to="/import">
                <Upload /> Import
              </Link>
            </Button>
            <Button
              size="lg"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus /> Check in vehicle
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search make, model, VIN, plate, colour, owner…"
              className="pl-11 pr-11"
              aria-label="Search vehicles"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/50 hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-1 rounded-full border border-white/35 bg-white/25 p-1">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
                aria-pressed={status === filter.value}
                className={cn(
                  'rounded-full px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm',
                  status === filter.value
                    ? 'pill-nav-active text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {filter.label}
                <span className="ml-1.5 opacity-60">{counts[filter.value]}</span>
              </button>
            ))}
          </div>
        </div>
        {ownerId || activeBrand ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {ownerId ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/40 px-3.5 py-1.5 text-xs font-medium">
                Owner: {ownerName ?? 'selected owner'}
                <button
                  type="button"
                  onClick={() => clearParams('owner')}
                  aria-label="Clear owner filter"
                  className="grid size-4 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ) : null}
            {activeBrand ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/40 py-1 pl-1 pr-3.5 text-xs font-medium">
                <BrandLogo brand={activeBrand} className="size-6" />
                Brand: {activeBrand.name}
                <Link
                  to={`/brands/${activeBrand.slug}`}
                  className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Full record
                </Link>
                <button
                  type="button"
                  onClick={() => clearParams('brand')}
                  aria-label="Clear brand filter"
                  className="grid size-4 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      {!isError ? <BrandStrip groups={brandGroups} isLoading={isLoading} /> : null}

      {isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[22rem] rounded-[1.75rem]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Car}
          title={counts.all === 0 ? 'No vehicles yet' : 'Nothing matches that'}
          description={
            counts.all === 0
              ? 'Check in the first vehicle to start the record.'
              : 'Try a different search, or clear the status filter.'
          }
          action={
            counts.all === 0 ? (
              <Button
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                <Plus /> Check in vehicle
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('')
                  clearParams('status', 'owner', 'brand')
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              photoUrl={vehicle.photos[0] ? photoUrls[vehicle.photos[0].path] : undefined}
              onMove={(v) =>
                setMovement({
                  vehicle: v,
                  eventType: v.status === 'in_stock' ? 'released' : 'checked_in',
                })
              }
              onSell={(v) => setMovement({ vehicle: v, eventType: 'sold' })}
              onHistory={setHistory}
              onEdit={(v) => {
                setEditing(v)
                setFormOpen(true)
              }}
              onDelete={setPendingDelete}
            />
          ))}
        </div>
      )}

      <VehicleFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        vehicle={editing}
      />

      <MovementDialog
        open={movement !== null}
        onOpenChange={(open) => {
          if (!open) setMovement(null)
        }}
        vehicle={movement?.vehicle ?? null}
        eventType={movement?.eventType ?? 'released'}
      />

      <HistoryDialog
        open={history !== null}
        onOpenChange={(open) => {
          if (!open) setHistory(null)
        }}
        vehicle={history}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? vehicleTitle(pendingDelete) : ''} and its whole movement
              history will be removed permanently. The owner stays on record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteVehicle.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteVehicle.isPending}
              onClick={(event) => {
                event.preventDefault()
                void confirmDelete()
              }}
            >
              Delete vehicle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
