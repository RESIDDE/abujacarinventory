import * as React from 'react'
import { Search, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { daysBetween, modelKeyOf } from '@/lib/brand-record'
import type { ModelCount } from '@/lib/brand-record'
import { STATUS_LABEL } from '@/lib/constants'
import { formatDate, formatNaira, telHref, toDateInputValue, vehicleTitle } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VehicleStatus, VehicleWithOwner } from '@/types/database'

export type RegisterStatus = VehicleStatus | 'all'

const FILTERS: { label: string; value: RegisterStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'In Stock', value: 'in_stock' },
  { label: 'Released', value: 'released' },
  { label: 'Sold', value: 'sold' },
]

const PAGE = 50

interface BrandRegisterProps {
  vehicles: VehicleWithOwner[]
  status: RegisterStatus
  onStatusChange: (status: RegisterStatus) => void
  /** Narrow to one model, chosen from the models panel. */
  model: ModelCount | null
  onClearModel: () => void
}

function haystack(v: VehicleWithOwner) {
  return [
    v.model,
    v.year,
    v.vin,
    v.plate_number,
    v.color,
    v.owner?.full_name,
    v.owner?.phone_primary,
    v.buyer?.full_name ?? v.buyer_name,
    v.buyer?.phone_primary,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** What a vehicle fetched, or is asking. */
function priceOf(v: VehicleWithOwner) {
  return v.status === 'sold' ? (v.sale_price ?? v.price) : v.price
}

function buyerName(v: VehicleWithOwner) {
  return v.buyer?.full_name ?? v.buyer_name ?? null
}

/** The date it left: a sale, or a release to its owner. */
function outDate(v: VehicleWithOwner) {
  if (v.status === 'sold') return v.sold_date ?? v.released_date
  if (v.status === 'released') return v.released_date
  return null
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/**
 * Every vehicle of one brand, in any state, newest intake first: a table from
 * `lg` up, a stack of cards below it where eight columns would not fit.
 */
export function BrandRegister({
  vehicles,
  status,
  onStatusChange,
  model,
  onClearModel,
}: BrandRegisterProps) {
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const [limit, setLimit] = React.useState(PAGE)
  // Read once per mount: "days in yard" does not need to tick over at midnight.
  const [today] = React.useState(() => toDateInputValue(new Date()))

  const byModel = React.useMemo(
    () =>
      model ? vehicles.filter((v) => modelKeyOf(v.model) === model.key) : vehicles,
    [vehicles, model],
  )

  const counts = React.useMemo(
    () => ({
      all: byModel.length,
      in_stock: byModel.filter((v) => v.status === 'in_stock').length,
      released: byModel.filter((v) => v.status === 'released').length,
      sold: byModel.filter((v) => v.status === 'sold').length,
    }),
    [byModel],
  )

  const rows = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return byModel
      .filter((v) => status === 'all' || v.status === status)
      .filter((v) => !needle || haystack(v).includes(needle))
      .sort(
        (a, b) =>
          b.intake_date.localeCompare(a.intake_date) || b.created_at.localeCompare(a.created_at),
      )
  }, [byModel, status, query])

  // A new filter starts from the top of the list again. Compared by key, so a
  // background refetch does not collapse a list someone has opened up.
  const filterKey = `${status}|${model?.key ?? ''}|${query}`
  const [lastFilterKey, setLastFilterKey] = React.useState(filterKey)
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey)
    setLimit(PAGE)
  }

  const shown = rows.slice(0, limit)

  /** Rows open the vehicle, except where the click was on a link inside. */
  const openRow = (event: React.MouseEvent, id: string) => {
    if ((event.target as HTMLElement).closest('a, button')) return
    navigate(`/vehicles/${id}`)
  }

  const heldFor = (v: VehicleWithOwner) => {
    if (v.status !== 'in_stock') return null
    const days = daysBetween(v.intake_date, today)
    return days === null ? null : days === 0 ? 'Arrived today' : `${plural(days, 'day')} in yard`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-full border border-white/35 bg-white/25 p-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onStatusChange(filter.value)}
              aria-pressed={status === filter.value}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm',
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

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search model, VIN, plate, owner, buyer…"
            className="pl-11 pr-11"
            aria-label="Search this brand's vehicles"
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
      </div>

      {model ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/40 px-3.5 py-1.5 text-xs font-medium">
          Model: {model.name}
          <button
            type="button"
            onClick={onClearModel}
            aria-label="Clear model filter"
            className="grid size-4 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/50 px-4 py-6 text-center text-sm text-muted-foreground">
          {query ? 'Nothing matches that search.' : 'No vehicles in this view.'}
        </p>
      ) : (
        <>
          {/* lg and up: the full ledger. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-white/40 lg:block">
            <table className="w-full min-w-[60rem] text-left text-sm">
              <thead className="bg-white/35 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Vehicle</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">VIN</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Owner</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">In</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Out / sold</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Buyer</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {shown.map((v) => (
                  <tr
                    key={v.id}
                    onClick={(event) => openRow(event, v.id)}
                    className="cursor-pointer bg-white/15 align-top transition-colors hover:bg-white/45"
                  >
                    <td className="max-w-[14rem] px-4 py-3">
                      <Link
                        to={`/vehicles/${v.id}`}
                        className="block truncate font-medium hover:underline"
                      >
                        {vehicleTitle(v)}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[v.color, v.plate_number].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </td>
                    <td className="max-w-[11rem] truncate px-3 py-3 font-mono text-xs leading-5">
                      {v.vin ?? '—'}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={v.status === 'in_stock' ? 'inStock' : 'released'}>
                        {STATUS_LABEL[v.status]}
                      </Badge>
                    </td>
                    <td className="max-w-[11rem] px-3 py-3">
                      <span className="block truncate">{v.owner?.full_name ?? '—'}</span>
                      {v.owner ? (
                        <a
                          href={telHref(v.owner.phone_primary)}
                          className="block truncate text-xs text-muted-foreground hover:text-foreground"
                        >
                          {v.owner.phone_primary}
                        </a>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDate(v.intake_date)}
                      {heldFor(v) ? (
                        <span className="block text-xs text-muted-foreground">{heldFor(v)}</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{formatDate(outDate(v))}</td>
                    <td className="max-w-[10rem] px-3 py-3">
                      <span className="block truncate">{buyerName(v) ?? '—'}</span>
                      {v.buyer ? (
                        <a
                          href={telHref(v.buyer.phone_primary)}
                          className="block truncate text-xs text-muted-foreground hover:text-foreground"
                        >
                          {v.buyer.phone_primary}
                        </a>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="font-semibold">{formatNaira(priceOf(v))}</span>
                      <span className="block text-xs text-muted-foreground">
                        {v.status === 'sold' ? 'Sold for' : 'Asking'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Below lg: one card per vehicle. */}
          <ul className="space-y-2 lg:hidden">
            {shown.map((v) => (
              <li key={v.id}>
                <article
                  onClick={(event) => openRow(event, v.id)}
                  className="cursor-pointer rounded-2xl border border-white/40 bg-white/30 p-4 transition-colors active:bg-white/50"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/vehicles/${v.id}`}
                        className="block truncate text-sm font-semibold"
                      >
                        {vehicleTitle(v)}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {[v.color, v.plate_number].filter(Boolean).join(' · ') || 'No plate'}
                      </p>
                    </div>
                    <Badge
                      variant={v.status === 'in_stock' ? 'inStock' : 'released'}
                      className="shrink-0"
                    >
                      {STATUS_LABEL[v.status]}
                    </Badge>
                  </header>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">VIN</dt>
                      <dd className="truncate font-mono">{v.vin ?? '—'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Owner</dt>
                      <dd className="truncate font-medium">{v.owner?.full_name ?? '—'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">
                        {v.status === 'sold' ? 'Sold for' : 'Asking'}
                      </dt>
                      <dd className="truncate font-medium">{formatNaira(priceOf(v))}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">In</dt>
                      <dd className="font-medium">
                        {formatDate(v.intake_date)}
                        {heldFor(v) ? (
                          <span className="block font-normal text-muted-foreground">
                            {heldFor(v)}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {v.status === 'sold' ? 'Sold' : 'Out'}
                      </dt>
                      <dd className="font-medium">{formatDate(outDate(v))}</dd>
                    </div>
                    {v.status === 'sold' ? (
                      <div className="col-span-2 min-w-0">
                        <dt className="text-muted-foreground">Buyer</dt>
                        <dd className="truncate font-medium">{buyerName(v) ?? '—'}</dd>
                      </div>
                    ) : null}
                  </dl>
                </article>
              </li>
            ))}
          </ul>

          {rows.length > shown.length ? (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
                Show {Math.min(PAGE, rows.length - shown.length)} more of{' '}
                {rows.length - shown.length}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
