import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min }

async function main(){
  const cfg = await prisma.appConfig.upsert({ where: { id: 'config' }, update: {}, create: { id: 'config', platformFeePercent: 10, defaultPaymentProvider: 'MANUAL' } })
  const school = await prisma.school.findFirst({})
  if (!school) throw new Error('No school found. Run prisma seed first.')
  const student = await prisma.user.findFirst({ where: { memberships: { some: { schoolId: school.id, role: 'STUDENT' } } } })
  if (!student) throw new Error('No student found. Run prisma seed first.')
  const subject = await prisma.subject.findFirst({ where: { schoolId: school.id } }) || await prisma.subject.create({ data: { name: 'Demo', schoolId: school.id } })
  const priceSub = await prisma.price.upsert({ where: { id: 'demo-price-sub' }, update: {}, create: { id: 'demo-price-sub', schoolId: school.id, productType: 'SCHOOL_MEMBERSHIP', productRefId: 'school', amountCents: 2990, currency: 'BRL', interval: 'MONTHLY', active: true } })
  const priceCourse = await prisma.price.upsert({ where: { id: 'demo-price-course' }, update: {}, create: { id: 'demo-price-course', schoolId: school.id, productType: 'SUBJECT_COURSE', productRefId: subject.id, amountCents: 1990, currency: 'BRL', interval: 'ONE_TIME', active: true } })

  const createPaidOrder = async (items) => {
    const total = items.reduce((s,i)=>s+i.amountCents,0)
    const order = await prisma.order.create({ data: { schoolId: school.id, buyerUserId: student.id, status: 'PAID', totalAmountCents: total, currency: 'BRL', items: { create: items.map(i=>({ productType: i.productType, productRefId: i.productRefId, priceAmountCents: i.amountCents, interval: i.interval })) }, payment: { create: { provider: 'manual', status: 'SUCCEEDED' } }, paidAt: new Date() } , include: { items: true } })
    const fee = Math.round(total * (cfg.platformFeePercent / 100))
    const net = total - fee
    await prisma.ledgerEntry.createMany({ data: [
      { schoolId: school.id, orderId: order.id, entryType: 'PLATFORM_FEE', direction: 'CREDIT', amountCents: fee },
      { schoolId: school.id, orderId: order.id, entryType: 'SCHOOL_EARNING', direction: 'CREDIT', amountCents: net },
    ] })
    for (const it of order.items){
      if (it.interval !== 'ONE_TIME'){
        const end = new Date(); end.setMonth(end.getMonth()+1)
        await prisma.subscription.upsert({ where: { schoolId_userId_productType_productRefId: { schoolId: school.id, userId: student.id, productType: it.productType, productRefId: it.productRefId } }, update: { status: 'ACTIVE', currentPeriodEnd: end }, create: { schoolId: school.id, userId: student.id, productType: it.productType, productRefId: it.productRefId, status: 'ACTIVE', currentPeriodEnd: end } })
      }
    }
  }

  for (let i=0;i<30;i++){
    await createPaidOrder([{ productType: 'SCHOOL_MEMBERSHIP', productRefId: 'school', amountCents: priceSub.amountCents, interval: 'MONTHLY' }])
  }
  for (let i=0;i<30;i++){
    await createPaidOrder([{ productType: 'SUBJECT_COURSE', productRefId: priceCourse.productRefId, amountCents: priceCourse.amountCents, interval: 'ONE_TIME' }])
  }

  console.log('Finance demo seed done.')
}

main().catch(e=>{ console.error(e); process.exit(1) }).finally(async ()=>{ await prisma.$disconnect() })

