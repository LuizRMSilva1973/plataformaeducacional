export type Nets = { schoolNet: number; platformNet: number }

export type SimpleLedger = { entryType: string; direction: string; amountCents: number; meta?: any }

export function computeTotals(items: SimpleLedger[]): { totals: Record<string, number>, nets: Nets } {
  const totals: Record<string, number> = {}
  let schoolEarnings = 0
  let platformFees = 0
  let refundSchool = 0
  let refundPlatform = 0
  for (const it of items){
    const key = String(it.entryType)
    totals[key] = (totals[key] || 0) + it.amountCents
    totals['all'] = (totals['all'] || 0) + it.amountCents
    if (it.entryType === 'SCHOOL_EARNING' && it.direction === 'CREDIT') schoolEarnings += it.amountCents
    if (it.entryType === 'PLATFORM_FEE' && it.direction === 'CREDIT') platformFees += it.amountCents
    if (it.entryType === 'REFUND'){
      const target = (it as any)?.meta?.target
      if (target === 'SCHOOL_EARNING') refundSchool += it.amountCents
      else if (target === 'PLATFORM_FEE') refundPlatform += it.amountCents
      else refundSchool += it.amountCents
    }
  }
  const nets: Nets = { schoolNet: Math.max(0, schoolEarnings - refundSchool), platformNet: Math.max(0, platformFees - refundPlatform) }
  return { totals, nets }
}
