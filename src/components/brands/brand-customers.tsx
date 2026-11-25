import * as React from 'react'
import { ArrowRight, Car, Mail, MapPin, Phone, ShoppingBag, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { BrandCustomer, NamedBuyer } from '@/lib/brand-record'
import { STATUS_LABEL } from '@/lib/constants'
import { formatDate, initialsOf, telHref, vehicleTitle } from '@/lib/format'

const PAGE = 12

interface BrandCustomersProps {
  customers: BrandCustomer[]
  namedBuyers: NamedBuyer[]
  brandName: string
}

const contactRow =
  'flex items-center gap-2.5 rounded-xl border border-white/40 bg-white/35 px-3 py-1.5 transition-colors hover:bg-white/60'

/**
 * Everyone this brand has passed through: who brought one in, who bought one,
 * how to reach them, and which of the brand's vehicles were theirs.
 */
export function BrandCustomers({ customers, namedBuyers, brandName }: BrandCustomersProps) {
  const [limit, setLimit] = React.useState(PAGE)

  if (customers.length === 0 && namedBuyers.length === 0) {
    return (
      <p className="flex items-center gap-3 rounded-2xl border border-dashed border-white/50 px-4 py-6 text-sm text-muted-foreground">
        <Users className="size-4 shrink-0" />
        No customers are linked to a {brandName} yet.
      </p>
    )
  }

  const shown = customers.slice(0, limit)

  return (
    <div className="space-y-4">
      {customers.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map(({ owner, stored, bought }) => (
            <li key={owner.id}>
              <article className="flex h-full flex-col gap-3 rounded-2xl border border-white/40 bg-white/30 p-4">
                <header className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/50 bg-white/55 text-sm font-semibold">
                    {initialsOf(owner.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">{owner.full_name}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {stored.length > 0 ? (
                        <Badge variant="muted" className="px-2 py-0.5 text-[0.65rem]">
                          <Car className="size-3" />
                          {stored.length} stored
                        </Badge>
                      ) : null}
                      {bought.length > 0 ? (
                        <Badge variant="inStock" className="px-2 py-0.5 text-[0.65rem]">
                          <ShoppingBag className="size-3" />
                          {bought.length} bought
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </header>

                <div className="space-y-1.5 text-xs">
                  <a href={telHref(owner.phone_primary)} className={contactRow}>
                    <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{owner.phone_primary}</span>
                  </a>
                  {owner.phone_secondary ? (
                    <a href={telHref(owner.phone_secondary)} className={contactRow}>
                      <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{owner.phone_secondary}</span>
                    </a>
                  ) : null}
                  {owner.email ? (
                    <a href={`mailto:${owner.email}`} className={contactRow}>
                      <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{owner.email}</span>
                    </a>
                  ) : null}
                  {owner.address ? (
                    <p className="flex items-start gap-2.5 px-1 text-muted-foreground">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      <span>{owner.address}</span>
                    </p>
                  ) : null}
                </div>

                <ul className="space-y-0.5 border-t border-white/40 pt-2">
                  {stored.map((v) => (
                    <li key={`s-${v.id}`}>
                      <Link
                        to={`/vehicles/${v.id}`}
                        className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-xs transition-colors hover:bg-white/50"
                      >
                        <span className="min-w-0 truncate">{vehicleTitle(v)}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {STATUS_LABEL[v.status]}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {bought.map((v) => (
                    <li key={`b-${v.id}`}>
                      <Link
                        to={`/vehicles/${v.id}`}
                        className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-xs transition-colors hover:bg-white/50"
                      >
                        <span className="min-w-0 truncate">{vehicleTitle(v)}</span>
                        <span className="shrink-0 text-muted-foreground">
                          Bought {formatDate(v.sold_date, '')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                {stored.length > 0 ? (
                  <Link
                    to={`/vehicles?owner=${owner.id}`}
                    className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Everything they have stored <ArrowRight className="size-3.5" />
                  </Link>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      ) : null}

      {customers.length > shown.length ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
            Show more customers ({customers.length - shown.length} left)
          </Button>
        </div>
      ) : null}

      {namedBuyers.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-white/50 p-4">
          <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            Bought with a name only
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            These sales recorded a buyer's name but no customer record, so there is no number
            on file.
          </p>
          <ul className="mt-2 space-y-1">
            {namedBuyers.map((buyer) => (
              <li key={buyer.name} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium">{buyer.name}</span>
                {buyer.bought.map((v, index) => (
                  <Link
                    key={v.id}
                    to={`/vehicles/${v.id}`}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {vehicleTitle(v)}
                    {v.sold_date ? `, ${formatDate(v.sold_date)}` : ''}
                    {index < buyer.bought.length - 1 ? ';' : ''}
                  </Link>
                ))}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
