import * as React from 'react'

import { cn } from '@/lib/utils'

interface SectionProps {
  title: string
  icon: React.ElementType
  action?: React.ReactNode
  className?: string
  id?: string
  children: React.ReactNode
}

/**
 * A titled glass panel, as used on the record pages. Scroll targets land
 * clear of the sticky nav.
 */
export const Section = React.forwardRef<HTMLElement, SectionProps>(function Section(
  { title, icon: Icon, action, className, id, children },
  ref,
) {
  return (
    <section
      ref={ref}
      id={id}
      className={cn('glass-tile-solid scroll-mt-28 rounded-[1.75rem] p-5 sm:p-6', className)}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  )
})
