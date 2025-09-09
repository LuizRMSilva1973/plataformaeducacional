import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireMembership } from '../../middleware/auth.js'

export const router = Router()

// Retorna informações do usuário atual no escopo da escola
router.get('/me', requireMembership(), async (req, res) => {
  const user = req.user!
  const schoolId = req.schoolId!
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, schoolId, status: 'ACTIVE' },
    select: { role: true }
  })
  res.json({
    user,
    isAdmin: user.isAdmin,
    schoolId,
    role: membership?.role || null,
  })
})

