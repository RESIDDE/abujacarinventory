import * as React from 'react'
import { Tag } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { daysBetween } from '@/lib/brand-record'
import { formatDate, formatNaira, telHref, vehicleTitle } from '@/lib/format'
import type { VehicleWithOwner } from '@/types/database'

const PAGE = 10

/** The sales ledger for one brand: when, to whom, for how much. Newest first. */
export function BrandSales({ sales, brandName }: { sales: VehicleWithOwner[]; brandName: string }) {
  const [limit, setLimit] = React.useState(PAGE)

  if (sales.length === 0) {
    return (
      <p className="flex items-center gap-3 rounded-2xl border border-dashed border-white/50 px-4 py-6 text-sm text-muted-foreground">
        <Tag className="size-4 shrink-0" />
        No {brandName} has been sold yet.
      </p>
    )
  }

  const shown = sales.slice(0, limit)

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {shown.map((v) => {
          const days = daysBetween(v.intake_date, v.sold_date)
          const buyer = v.buyer
          return (
            <li
              key={v.id}
              className="grid gap-x-4 gap-y-2 rounded-2xl border border-white/40 bg-white/30 px-4 py-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="flex items-baseline justify-between gap-2 sm:block">
                <p className="text-sm font-semibold">{formatDate(v.sold_date, 'Date not set')}</p>
                {days !== null ? (
                  <p className="text-xs text-muted-foreground">
                    {days === 0 ? 'Sold the day it came' : `${days} day${days === 1 ? '' : 's'} to sell`}
                  </p>
                ) : null}
              </div>

              <div className="min-w-0">
                <Link
                  to={`/vehicles/${v.id}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {vehicleTitle(v)}
                  {v.plate_number ? (
                    <span className="font-normal text-muted-foreground"> · {v.plate_number}</span>
                  ) : null}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  Sold to{' '}
                  <span className="font-medium text-foreground">
                    {buyer?.full_name ?? v.buyer_name ?? 'an unnamed buyer'}
                  </span>
                  {buyer ? (
                    <>
                      {' · '}
                      <a href={telHref(buyer.phone_primary)} className="hover:text-foreground">
                        {buyer.phone_primary}
                      </a>
                    </>
                  ) : null}
                </p>
                {v.owner ? (
                  <p className="truncate text-xs text-muted-foreground">
                    Owner {v.owner.full_name}
                  </p>
                ) : null}
              </div>

              <p className="text-base font-semibold tracking-tight sm:text-right">
                {formatNaira(v.sale_price ?? v.price)}
              </p>
            </li>
          )
        })}
      </ol>

      {sales.length > shown.length ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
            Show more sales ({sales.length - shown.length} left)
          </Button>
        </div>
      ) : null}
    </div>
  )
}
