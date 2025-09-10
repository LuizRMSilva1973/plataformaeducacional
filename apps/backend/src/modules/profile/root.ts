import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'

export const router = Router()

// Lista escolas nas quais o usuário autenticado possui membership
router.get('/schools', async (req, res) => {
  const userId = req.user!.id
  const memberships = await prisma.membership.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { schoolId: true, school: { select: { id: true, name: true } } },
    distinct: ['schoolId']
  })
  const items = memberships.map(m => ({ id: m.school.id, name: m.school.name }))
  res.json({ items, meta: { total: items.length } })
})

