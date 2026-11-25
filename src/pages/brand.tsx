import * as React from 'react'
import { ArrowLeft, Car, History, Layers, Tag, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { BrandActivity } from '@/components/brands/brand-activity'
import { BrandCustomers } from '@/components/brands/brand-customers'
import { BrandLogo } from '@/components/brands/brand-logo'
import { BrandRegister } from '@/components/brands/brand-register'
import type { RegisterStatus } from '@/components/brands/brand-register'
import { BrandSales } from '@/components/brands/brand-sales'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Section } from '@/components/common/section'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BRAND_EVENT_LIMIT, useBrandEvents } from '@/hooks/use-brand-events'
import { useVehicles } from '@/hooks/use-vehicles'
import { buildBrandRecord } from '@/lib/brand-record'
import { brandFromSlug, groupByBrand } from '@/lib/brands'
import type { BrandGroup } from '@/lib/brands'
import { formatDate, formatNaira, formatNairaCompact } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VehicleWithOwner } from '@/types/database'

const NO_VEHICLES: VehicleWithOwner[] = []

export default function BrandPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { data: vehicles = NO_VEHICLES, isLoading, isError, error, refetch } = useVehicles()

  const group = React.useMemo(
    () => groupByBrand(vehicles).find((g) => g.brand.slug === slug) ?? null,
    [vehicles, slug],
  )

  if (isError) {
    return (
      <div className="page-enter space-y-4">
        <BackLink />
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="page-enter space-y-4">
        <BackLink />
        <Skeleton className="h-64 rounded-[2rem]" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-[1.75rem]" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-[1.75rem]" />
      </div>
    )
  }

  if (!group) {
    const brand = brandFromSlug(slug)
    return (
      <div className="page-enter space-y-4">
        <BackLink />
        <EmptyState
          icon={Car}
          title={`No ${brand.name} on record`}
          description="Nothing in the inventory is recorded under this make. It may have been deleted, or its make corrected to another brand."
          action={
            <Button variant="outline" asChild>
              <Link to="/vehicles">Back to vehicles</Link>
            </Button>
          }
        />
      </div>
    )
  }

  // Keyed, so the filters start fresh when moving from one brand to another.
  return <BrandRecordView key={group.brand.slug} group={group} />
}

function BrandRecordView({ group }: { group: BrandGroup }) {
  const { brand } = group
  const record = React.useMemo(() => buildBrandRecord(group.vehicles), [group.vehicles])
  const byId = React.useMemo(
    () => new Map(group.vehicles.map((v) => [v.id, v])),
    [group.vehicles],
  )
  const events = useBrandEvents(group.spellings)

  const [status, setStatus] = React.useState<RegisterStatus>('all')
  const [modelKey, setModelKey] = React.useState<string | null>(null)
  const model = record.models.find((m) => m.key === modelKey) ?? null
  const registerRef = React.useRef<HTMLElement>(null)

  const showStatus = (next: RegisterStatus) => {
    setStatus(next)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    registerRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const unpriced = group.vehicles.filter((v) => v.status === 'in_stock' && v.price === null).length

  const counts: { label: string; value: RegisterStatus; count: number }[] = [
    { label: 'In stock', value: 'in_stock', count: record.inStock },
    { label: 'Released', value: 'released', count: record.released },
    { label: 'Sold', value: 'sold', count: record.sold },
    { label: 'On record', value: 'all', count: record.total },
  ]

  return (
    <div className="page-enter space-y-5">
      <BackLink />

      <header className="glass-hero rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <BrandLogo brand={brand} className="size-16 sm:size-24" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Brand record
              </p>
              <h1 className="mt-2 break-words text-4xl tracking-tight text-display sm:text-5xl">
                {brand.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {record.total} vehicle{record.total === 1 ? '' : 's'} on record
                {record.firstIntake ? ` · first checked in ${formatDate(record.firstIntake)}` : ''}
                {record.lastSale ? ` · last sold ${formatDate(record.lastSale)}` : ''}
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/vehicles?brand=${brand.slug}`}>
              <Car /> Manage in vehicle list
            </Link>
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {counts.map(({ label, value, count }) => (
            <button
              key={value}
              type="button"
              onClick={() => showStatus(value)}
              aria-pressed={status === value}
              className={cn(
                'rounded-2xl border px-4 py-3 text-left transition-colors',
                status === value
                  ? 'pill-nav-active border-white/70'
                  : 'border-white/40 bg-white/30 hover:bg-white/50',
              )}
            >
              <span className="block text-3xl font-light tabular-nums tracking-tight">
                {count}
              </span>
              <span className="block text-xs text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>

        {group.spellings.length > 1 ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Recorded as{' '}
            {group.spellings.map((spelling, index) => (
              <React.Fragment key={spelling}>
                {index > 0 ? ', ' : ''}
                <span className="font-medium text-foreground">“{spelling.trim()}”</span>
              </React.Fragment>
            ))}
            . All counted together here.
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Figure
          label="Sales total"
          value={formatNairaCompact(record.salesTotal, '₦0')}
          title={formatNaira(record.salesTotal, '₦0')}
          caption={`from ${record.pricedSales} sale${record.pricedSales === 1 ? '' : 's'}`}
        />
        <Figure
          label="Average sale"
          value={formatNairaCompact(record.averageSale)}
          title={formatNaira(record.averageSale)}
          caption="per vehicle sold"
        />
        <Figure
          label="Stock value"
          value={formatNairaCompact(record.stockValue, '₦0')}
          title={formatNaira(record.stockValue, '₦0')}
          caption={
            unpriced > 0
              ? `asking; ${unpriced} in stock without a price`
              : `asking, across ${record.inStock} in stock`
          }
        />
        <Figure
          label="Time to sell"
          value={
            record.averageDaysToSell === null
              ? '—'
              : `${record.averageDaysToSell} day${record.averageDaysToSell === 1 ? '' : 's'}`
          }
          caption="average, intake to sale"
        />
      </div>

      <Section
        title="Models"
        icon={Layers}
        action={
          <span className="text-xs text-muted-foreground">
            {record.models.length} model{record.models.length === 1 ? '' : 's'} · tap to filter
          </span>
        }
      >
        <div className="flex flex-wrap gap-2">
          {record.models.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setModelKey((current) => (current === m.key ? null : m.key))}
              aria-pressed={modelKey === m.key}
              className={cn(
                'inline-flex items-baseline gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                modelKey === m.key
                  ? 'pill-nav-active border-white/70'
                  : 'border-white/40 bg-white/30 hover:bg-white/50',
              )}
            >
              <span className="font-medium">{m.name}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {m.total}
                {m.inStock > 0 ? ` · ${m.inStock} in stock` : ''}
                {m.sold > 0 ? ` · ${m.sold} sold` : ''}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section
        id="register"
        ref={registerRef}
        title={`Every ${brand.name}`}
        icon={Car}
        action={
          <span className="text-xs text-muted-foreground">Open any row for its full record</span>
        }
      >
        <BrandRegister
          vehicles={group.vehicles}
          status={status}
          onStatusChange={setStatus}
          model={model}
          onClearModel={() => setModelKey(null)}
        />
      </Section>

      {/* Top-aligned: a long movement log should not stretch a short ledger
          into an empty panel. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-start">
        <Section
          title="Sales history"
          icon={Tag}
          className="lg:col-span-3"
          action={
            <span className="text-xs text-muted-foreground">
              {record.sold} sold · newest first
            </span>
          }
        >
          <BrandSales sales={record.sales} brandName={brand.name} />
        </Section>

        <Section title="Movement log" icon={History} className="lg:col-span-2">
          <BrandActivity
            events={events.data ?? []}
            vehicles={byId}
            isLoading={events.isLoading}
            isError={events.isError}
            truncated={(events.data?.length ?? 0) >= BRAND_EVENT_LIMIT}
          />
        </Section>
      </div>

      <Section
        title="Customers"
        icon={Users}
        action={
          <span className="text-xs text-muted-foreground">
            {record.customers.length + record.namedBuyers.length} people · owners and buyers
          </span>
        }
      >
        <BrandCustomers
          customers={record.customers}
          namedBuyers={record.namedBuyers}
          brandName={brand.name}
        />
      </Section>
    </div>
  )
}

function Figure({
  label,
  value,
  caption,
  title,
}: {
  label: string
  value: string
  caption: string
  /** The unabbreviated figure, on hover. */
  title?: string
}) {
  return (
    <div className="glass-tile-solid rounded-[1.75rem] p-4 sm:p-5">
      <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl" title={title}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/vehicles"
      className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/30 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/50"
    >
      <ArrowLeft className="size-4" />
      All vehicles
    </Link>
  )
}
