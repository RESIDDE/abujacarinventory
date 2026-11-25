import * as React from 'react'

import { monogramOf } from '@/lib/brands'
import type { Brand } from '@/lib/brands'
import { cn } from '@/lib/utils'

const MONOGRAM_SIZE = [0, 19, 15, 12.5]

/**
 * A brand's badge: its logo on a white disc, or its initials where there is
 * no logo file. Decorative — the brand's name is always written beside it.
 *
 * The monogram is SVG text in a 40-unit box, so it scales with the disc at
 * any size without a font-size per breakpoint.
 */
export function BrandLogo({ brand, className }: { brand: Brand; className?: string }) {
  // Keyed on the path, so moving to another brand gets another try.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null)
  const src = brand.logo && brand.logo !== failedSrc ? brand.logo : null
  const monogram = monogramOf(brand.name)

  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/70 bg-white/90 shadow-[0_8px_18px_-12px_hsl(160_20%_20%/.6)]',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          decoding="async"
          loading="lazy"
          draggable={false}
          onError={() => setFailedSrc(src)}
          className="size-[64%] object-contain"
        />
      ) : (
        <svg viewBox="0 0 40 40" className="size-full">
          <text
            x="20"
            y="20"
            dy="0.35em"
            textAnchor="middle"
            fill={brand.tint}
            fontSize={MONOGRAM_SIZE[monogram.length] ?? 12}
            fontWeight={600}
            fontFamily="Poppins, ui-sans-serif, system-ui, sans-serif"
            letterSpacing="-0.02em"
          >
            {monogram}
          </text>
        </svg>
      )}
    </span>
  )
}
