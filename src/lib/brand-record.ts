import type { Owner, VehicleWithOwner } from '@/types/database'

/** Whole days between two yyyy-MM-dd dates, ignoring time zones. */
export function daysBetween(from: string | null | undefined, to: string | null | undefined) {
  if (!from || !to) return null
  const parse = (value: string) => {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number)
    return y && m && d ? Date.UTC(y, m - 1, d) : Number.NaN
  }
  const diff = Math.round((parse(to) - parse(from)) / 86_400_000)
  return Number.isFinite(diff) && diff >= 0 ? diff : null
}

export interface ModelCount {
  /** What models group on; see modelKeyOf. */
  key: string
  /** The most common way it was written. */
  name: string
  total: number
  inStock: number
  sold: number
}

export interface BrandCustomer {
  owner: Owner
  /** Vehicles of this brand they brought in, in any state. */
  stored: VehicleWithOwner[]
  /** Vehicles of this brand they bought. */
  bought: VehicleWithOwner[]
}

/** A buyer who was recorded by name only, with no customer record. */
export interface NamedBuyer {
  name: string
  bought: VehicleWithOwner[]
}

export interface BrandRecord {
  total: number
  inStock: number
  released: number
  sold: number
  /** Sum of sale prices, falling back to the asking price where none was taken. */
  salesTotal: number
  /** Sales that had a price to count. */
  pricedSales: number
  averageSale: number | null
  /** Asking price of everything still in the yard. */
  stockValue: number
  /** Mean days from intake to sale, over sales with both dates. */
  averageDaysToSell: number | null
  firstIntake: string | null
  lastSale: string | null
  models: ModelCount[]
  /** Sold vehicles, newest sale first. */
  sales: VehicleWithOwner[]
  customers: BrandCustomer[]
  namedBuyers: NamedBuyer[]
}

/** "RX 350", "rx350 " and "RX  350" are one model to anyone reading. */
export function modelKeyOf(model: string) {
  return model.toLowerCase().replace(/\s+/g, '') || '—'
}

/** Everything the brand page shows, from one brand's vehicles. */
export function buildBrandRecord(vehicles: VehicleWithOwner[]): BrandRecord {
  const inStock = vehicles.filter((v) => v.status === 'in_stock')
  const sales = vehicles
    .filter((v) => v.status === 'sold')
    .sort((a, b) => (b.sold_date ?? '').localeCompare(a.sold_date ?? ''))

  let salesTotal = 0
  let pricedSales = 0
  for (const v of sales) {
    const price = v.sale_price ?? v.price
    if (price === null) continue
    salesTotal += price
    pricedSales += 1
  }

  const stockValue = inStock.reduce((sum, v) => sum + (v.price ?? 0), 0)

  const sellingTimes = sales
    .map((v) => daysBetween(v.intake_date, v.sold_date))
    .filter((d): d is number => d !== null)

  const intakes = vehicles.map((v) => v.intake_date).filter(Boolean).sort()

  const models = new Map<string, ModelCount & { spellings: Map<string, number> }>()
  for (const v of vehicles) {
    const key = modelKeyOf(v.model)
    const entry =
      models.get(key) ??
      { key, name: '', total: 0, inStock: 0, sold: 0, spellings: new Map<string, number>() }
    entry.total += 1
    if (v.status === 'in_stock') entry.inStock += 1
    if (v.status === 'sold') entry.sold += 1
    const spelling = v.model.trim().replace(/\s+/g, ' ') || '—'
    entry.spellings.set(spelling, (entry.spellings.get(spelling) ?? 0) + 1)
    models.set(key, entry)
  }

  // Customers, through either relationship, each counted once.
  const customers = new Map<string, BrandCustomer>()
  const touch = (owner: Owner) => {
    const entry = customers.get(owner.id) ?? { owner, stored: [], bought: [] }
    customers.set(owner.id, entry)
    return entry
  }
  const namedBuyers = new Map<string, NamedBuyer>()

  for (const v of vehicles) {
    if (v.owner) touch(v.owner).stored.push(v)
    if (v.status !== 'sold') continue
    if (v.buyer) {
      touch(v.buyer).bought.push(v)
    } else if (v.buyer_name?.trim()) {
      const name = v.buyer_name.trim().replace(/\s+/g, ' ')
      const key = name.toLowerCase()
      const entry = namedBuyers.get(key) ?? { name, bought: [] }
      entry.bought.push(v)
      namedBuyers.set(key, entry)
    }
  }

  return {
    total: vehicles.length,
    inStock: inStock.length,
    released: vehicles.filter((v) => v.status === 'released').length,
    sold: sales.length,
    salesTotal,
    pricedSales,
    averageSale: pricedSales > 0 ? Math.round(salesTotal / pricedSales) : null,
    stockValue,
    averageDaysToSell:
      sellingTimes.length > 0
        ? Math.round(sellingTimes.reduce((a, b) => a + b, 0) / sellingTimes.length)
        : null,
    firstIntake: intakes[0] ?? null,
    lastSale: sales[0]?.sold_date ?? null,
    models: [...models.values()]
      .map(({ spellings, ...model }) => ({
        ...model,
        name: [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
    sales,
    customers: [...customers.values()].sort(
      (a, b) =>
        b.stored.length + b.bought.length - (a.stored.length + a.bought.length) ||
        b.bought.length - a.bought.length ||
        a.owner.full_name.localeCompare(b.owner.full_name),
    ),
    namedBuyers: [...namedBuyers.values()].sort(
      (a, b) => b.bought.length - a.bought.length || a.name.localeCompare(b.name),
    ),
  }
}
