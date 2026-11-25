import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '@/components/brands/brand-logo'
import { Skeleton } from '@/components/ui/skeleton'
import type { BrandGroup } from '@/lib/brands'
import { cn } from '@/lib/utils'

interface BrandStripProps {
  groups: BrandGroup[]
  isLoading?: boolean
}

/**
 * Every make on record as a logo tile, each opening that brand's full record.
 *
 * A swipeable row on a phone. From `sm` up it is a grid held to two rows until
 * opened, so a yard with thirty makes does not push the vehicles off screen;
 * the toggle only appears once the brands actually overflow those two rows.
 */
export function BrandStrip({ groups, isLoading }: BrandStripProps) {
  const listRef = React.useRef<HTMLUListElement>(null)
  const [expanded, setExpanded] = React.useState(false)
  const [overflows, setOverflows] = React.useState(false)

  React.useEffect(() => {
    const list = listRef.current
    if (!list || typeof ResizeObserver === 'undefined') return
    const measure = () => setOverflows(list.scrollHeight > list.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [groups.length, expanded])

  if (isLoading) {
    return (
      <div className="glass-tile flex gap-2 overflow-hidden rounded-[1.75rem] p-4 sm:p-5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-[7.25rem] w-[6.5rem] shrink-0 rounded-[1.35rem]" />
        ))}
      </div>
    )
  }

  if (groups.length === 0) return null

  return (
    <section aria-labelledby="brands-heading" className="glass-tile rounded-[1.75rem] p-4 sm:p-5">
      <header className="mb-3 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 id="brands-heading" className="text-sm font-semibold uppercase tracking-wide">
            Brands
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {groups.length} make{groups.length === 1 ? '' : 's'} on record. Open one for its
            full history.
          </p>
        </div>
        {overflows || expanded ? (
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-controls="brand-list"
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/40 bg-white/30 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/55 sm:inline-flex"
          >
            {expanded ? 'Show fewer' : `All ${groups.length} brands`}
            <ChevronDown
              className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}
            />
          </button>
        ) : null}
      </header>

      <ul
        id="brand-list"
        ref={listRef}
        className={cn(
          // Phone: one swipeable row, bleeding to the panel's edges.
          'no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-1',
          // sm and up: a grid, two rows high until opened. The padding keeps
          // focus rings inside the clipped box.
          'sm:mx-0 sm:grid sm:snap-none sm:auto-rows-[7.25rem] sm:grid-cols-4 sm:overflow-hidden sm:p-1 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8',
          // Two 7.25rem rows, the gap between them, and the padding.
          !expanded && 'sm:max-h-[15.5rem]',
        )}
      >
        {groups.map(({ brand, total, inStock }) => (
          <li key={brand.slug} className="w-[6.5rem] shrink-0 snap-start sm:w-auto">
            <Link
              to={`/brands/${brand.slug}`}
              aria-label={`${brand.name}: ${total} vehicle${total === 1 ? '' : 's'} on record, ${inStock} in stock`}
              className="glass-tile-solid relative flex h-[7.25rem] flex-col items-center justify-center gap-1.5 rounded-[1.35rem] px-2 text-center transition-colors hover:bg-white/75 active:bg-white/80 sm:h-full"
            >
              <span className="absolute right-2 top-2 min-w-6 rounded-full border border-white/50 bg-white/60 px-1.5 text-center text-[0.65rem] font-semibold tabular-nums">
                {total}
              </span>
              <BrandLogo brand={brand} className="size-11" />
              <span className="w-full truncate text-sm font-medium">{brand.name}</span>
              <span className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                {inStock > 0 ? (
                  <>
                    <span className="size-1.5 rounded-full bg-[hsl(69_80%_40%)]" />
                    {inStock} in stock
                  </>
                ) : (
                  'None in stock'
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
