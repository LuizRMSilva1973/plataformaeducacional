import { describe, it, expect } from 'vitest'
import { computeTotals } from '../src/modules/billing/metrics'

describe('billing metrics', () => {
  it('computes nets and totals', () => {
    const items = [
      { entryType: 'SCHOOL_EARNING', direction: 'CREDIT', amountCents: 9000, meta: null },
      { entryType: 'PLATFORM_FEE', direction: 'CREDIT', amountCents: 1000, meta: null },
      { entryType: 'REFUND', direction: 'DEBIT', amountCents: 2000, meta: { target: 'SCHOOL_EARNING' } },
      { entryType: 'REFUND', direction: 'DEBIT', amountCents: 200, meta: { target: 'PLATFORM_FEE' } },
    ] as any
    const { totals, nets } = computeTotals(items)
    expect(totals['SCHOOL_EARNING']).toBe(9000)
    expect(totals['PLATFORM_FEE']).toBe(1000)
    expect(totals['REFUND']).toBe(2200)
    expect(nets.schoolNet).toBe(7000)
    expect(nets.platformNet).toBe(800)
  })
})

