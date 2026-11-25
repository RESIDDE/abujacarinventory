import type { VehicleWithOwner } from '@/types/database'

/**
 * Car brands, and how a free-typed `make` resolves to one.
 *
 * Make is plain text, and the same brand arrives spelt half a dozen ways:
 * "Benz", "Mercedes", "MERCEDES-BENZ" from a VIN decode, "Mercedez" from a
 * hurried check-in. Every spelling has to land on one brand, or a Benz page
 * would quietly be missing half its cars.
 *
 * Logos live in public/brand-logos/<slug>.svg and are only fetched when shown.
 * Most are from simple-icons (CC0); Mercedes-Benz, Lexus and Land Rover are
 * drawn here because simple-icons does not carry them. The marks themselves
 * remain their owners' trademarks and identify the make, nothing more.
 */

interface BrandDef {
  name: string
  /** Other spellings, compared with case, spaces and punctuation removed. */
  aliases?: string[]
  /** Has a file in public/brand-logos. */
  logo?: boolean
  /** Monogram colour when there is no logo. */
  tint?: string
}

const BRANDS: Record<string, BrandDef> = {
  toyota: { name: 'Toyota', logo: true },
  lexus: { name: 'Lexus', logo: true },
  'mercedes-benz': {
    name: 'Mercedes-Benz',
    logo: true,
    aliases: ['mercedes', 'benz', 'merc', 'mb', 'mercedez', 'mercedezbenz', 'mercedesbens'],
  },
  honda: { name: 'Honda', logo: true },
  acura: { name: 'Acura', logo: true },
  nissan: { name: 'Nissan', logo: true },
  infiniti: { name: 'Infiniti', logo: true, aliases: ['infinity'] },
  hyundai: { name: 'Hyundai', logo: true, aliases: ['hundai', 'hyundia', 'huyndai'] },
  kia: { name: 'Kia', logo: true, aliases: ['kiamotors'] },
  ford: { name: 'Ford', logo: true },
  bmw: { name: 'BMW', logo: true, aliases: ['bimmer'] },
  audi: { name: 'Audi', logo: true },
  volkswagen: { name: 'Volkswagen', logo: true, aliases: ['vw', 'volkswagon', 'volkswagan'] },
  'land-rover': {
    name: 'Land Rover',
    logo: true,
    // A Range Rover is a Land Rover, and a VIN decode says so; keeping them
    // apart would split the same model across two pages.
    aliases: ['rangerover', 'lr'],
  },
  jaguar: { name: 'Jaguar', tint: '#3A3A3A' },
  peugeot: { name: 'Peugeot', logo: true },
  mazda: { name: 'Mazda', logo: true },
  mitsubishi: { name: 'Mitsubishi', logo: true },
  subaru: { name: 'Subaru', logo: true },
  suzuki: { name: 'Suzuki', logo: true },
  jeep: { name: 'Jeep', logo: true },
  chevrolet: { name: 'Chevrolet', logo: true, aliases: ['chevy'] },
  cadillac: { name: 'Cadillac', logo: true },
  chrysler: { name: 'Chrysler', logo: true },
  dodge: { name: 'Dodge', tint: '#B3121D' },
  ram: { name: 'RAM', logo: true, aliases: ['ramtrucks'] },
  gmc: { name: 'GMC', tint: '#C8102E' },
  lincoln: { name: 'Lincoln', tint: '#2B2B2B' },
  buick: { name: 'Buick', tint: '#1E3A5F' },
  genesis: { name: 'Genesis', tint: '#2B2B2B' },
  volvo: { name: 'Volvo', logo: true },
  tesla: { name: 'Tesla', logo: true },
  porsche: { name: 'Porsche', logo: true },
  ferrari: { name: 'Ferrari', logo: true },
  lamborghini: { name: 'Lamborghini', logo: true },
  maserati: { name: 'Maserati', logo: true },
  bentley: { name: 'Bentley', logo: true },
  // Not "RR": in Abuja that is as likely to mean a Range Rover.
  'rolls-royce': { name: 'Rolls-Royce', logo: true, aliases: ['rolls'] },
  'aston-martin': { name: 'Aston Martin', logo: true },
  mini: { name: 'MINI', logo: true },
  renault: { name: 'Renault', logo: true },
  citroen: { name: 'Citroën', logo: true },
  opel: { name: 'Opel', logo: true },
  fiat: { name: 'Fiat', logo: true },
  skoda: { name: 'Škoda', logo: true },
  mg: { name: 'MG', logo: true, aliases: ['morrisgarages'] },
  isuzu: { name: 'Isuzu', tint: '#C00000' },
  innoson: { name: 'Innoson', tint: '#1B5E20', aliases: ['ivm', 'innosonmotors', 'innosonvehicle'] },
  gac: { name: 'GAC', tint: '#7A1F2B', aliases: ['gacmotor', 'trumpchi'] },
  changan: { name: 'Changan', tint: '#0B3D91' },
  geely: { name: 'Geely', tint: '#1F4E79' },
  chery: { name: 'Chery', tint: '#A6192E' },
  byd: { name: 'BYD', tint: '#C8102E' },
  'great-wall': { name: 'Great Wall', tint: '#B3121D', aliases: ['gwm', 'haval'] },
  jac: { name: 'JAC', tint: '#0057A8' },
  hummer: { name: 'Hummer', tint: '#2B2B2B' },
}

export interface Brand {
  /** Stable, URL-safe id: /brands/:slug */
  slug: string
  name: string
  /** Path of the logo file, or null to draw a monogram. */
  logo: string | null
  /** Colour for the monogram. */
  tint: string
}

/** Lower case, accents off, everything but letters and digits removed. */
export function compactMake(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

const LOOKUP = new Map<string, string>()
for (const [slug, def] of Object.entries(BRANDS)) {
  LOOKUP.set(compactMake(slug), slug)
  LOOKUP.set(compactMake(def.name), slug)
  for (const alias of def.aliases ?? []) LOOKUP.set(compactMake(alias), slug)
}

/** A muted colour per unknown brand, the same one every time. */
function tintFor(slug: string) {
  let hash = 0
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return `hsl(${hash % 360} 32% 32%)`
}

/** Own keys only: a make typed as "constructor" must not find Object's. */
function isCatalogued(slug: string) {
  return Object.hasOwn(BRANDS, slug)
}

function known(slug: string): Brand {
  const def = BRANDS[slug]
  return {
    slug,
    name: def.name,
    logo: def.logo ? `/brand-logos/${slug}.svg` : null,
    tint: def.tint ?? '#2B3A35',
  }
}

/**
 * Tidies a spelling nobody catalogued: "INNOSON MOTORS" and "great wall" both
 * read better title-cased, but "BYD" typed in capitals is left as it is.
 */
function displayName(raw: string) {
  const clean = raw.trim().replace(/\s+/g, ' ')
  const shouty = clean === clean.toUpperCase()
  const quiet = clean === clean.toLowerCase()
  if ((shouty && clean.replace(/[^A-Za-z]/g, '').length > 3) || quiet) {
    return clean.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())
  }
  return clean
}

/**
 * The brand a vehicle's make belongs to.
 *
 * Tries the whole make, then its first two words, then its first word, so a
 * make typed as "Toyota Camry" or "Range Rover Sport" still finds its brand.
 * Anything unrecognised becomes a brand of its own, keyed so that "Great
 * Wall" and "GreatWall" still group together.
 */
export function vehicleBrand(make: string | null | undefined): Brand {
  const raw = (make ?? '').trim()
  const words = raw.split(/[\s/]+/).filter(Boolean)
  const candidates = [raw, words.slice(0, 2).join(' '), words[0] ?? '']
  for (const candidate of candidates) {
    const slug = LOOKUP.get(compactMake(candidate))
    if (slug) return known(slug)
  }
  const slug = compactMake(raw) || 'unknown'
  return {
    slug,
    name: slug === 'unknown' ? 'Unknown make' : displayName(raw),
    logo: null,
    tint: tintFor(slug),
  }
}

/** The brand behind a URL slug, for a page with nothing on record yet. */
export function brandFromSlug(slug: string): Brand {
  if (isCatalogued(slug)) return known(slug)
  return vehicleBrand(slug)
}

/** One to three letters for a brand with no logo file. */
export function monogramOf(name: string) {
  const words = name.split(/[\s-]+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  const word = words[0] ?? '?'
  return word.length <= 3 ? word.toUpperCase() : word[0].toUpperCase()
}

export interface BrandGroup {
  brand: Brand
  vehicles: VehicleWithOwner[]
  total: number
  inStock: number
  released: number
  sold: number
  /** Every spelling of the make in this group, exactly as stored. */
  spellings: string[]
}

/**
 * Vehicles by brand, biggest first.
 *
 * An unrecognised brand takes its name from whichever spelling is most
 * common, so a single typo does not get to name the group.
 */
export function groupByBrand(vehicles: VehicleWithOwner[]): BrandGroup[] {
  const groups = new Map<string, BrandGroup & { tally: Map<string, number> }>()

  for (const vehicle of vehicles) {
    const brand = vehicleBrand(vehicle.make)
    let group = groups.get(brand.slug)
    if (!group) {
      group = {
        brand,
        vehicles: [],
        total: 0,
        inStock: 0,
        released: 0,
        sold: 0,
        spellings: [],
        tally: new Map(),
      }
      groups.set(brand.slug, group)
    }
    group.vehicles.push(vehicle)
    group.total += 1
    if (vehicle.status === 'in_stock') group.inStock += 1
    else if (vehicle.status === 'released') group.released += 1
    else if (vehicle.status === 'sold') group.sold += 1
    // Untrimmed: the movement log filters on these, by exact match.
    group.tally.set(vehicle.make, (group.tally.get(vehicle.make) ?? 0) + 1)
  }

  return [...groups.values()]
    .map(({ tally, ...group }) => {
      const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      const brand =
        isCatalogued(group.brand.slug)
          ? group.brand
          : { ...group.brand, name: displayName(ranked[0]?.[0] ?? group.brand.name) }
      return { ...group, brand, spellings: ranked.map(([spelling]) => spelling) }
    })
    .sort((a, b) => b.total - a.total || a.brand.name.localeCompare(b.brand.name))
}
