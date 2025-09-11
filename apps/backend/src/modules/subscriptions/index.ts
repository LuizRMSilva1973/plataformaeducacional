import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireMembership } from '../../middleware/auth.js'

export const router = Router()

// List my subscriptions within a school
router.get('/me', requireMembership(), async (req, res) => {
  const schoolId = req.schoolId!
  const userId = req.user!.id
  const subs = await prisma.subscription.findMany({ where: { schoolId, userId }, orderBy: { createdAt: 'desc' } })
  res.json({ items: subs })
})

// Cancel at period end
router.post('/:subscriptionId/cancel', requireMembership(), async (req, res) => {
  const schoolId = req.schoolId!
  const userId = req.user!.id
  const id = req.params.subscriptionId
  const sub = await prisma.subscription.findUnique({ where: { id } })
  if (!sub || sub.schoolId !== schoolId || sub.userId !== userId) return res.status(404).json({ error: 'Subscription not found' })
  const updated = await prisma.subscription.update({ where: { id }, data: { cancelAtPeriodEnd: true } })
  res.json(updated)
})

// Resume
router.post('/:subscriptionId/resume', requireMembership(), async (req, res) => {
  const schoolId = req.schoolId!
  const userId = req.user!.id
  const id = req.params.subscriptionId
  const sub = await prisma.subscription.findUnique({ where: { id } })
  if (!sub || sub.schoolId !== schoolId || sub.userId !== userId) return res.status(404).json({ error: 'Subscription not found' })
  const updated = await prisma.subscription.update({ where: { id }, data: { cancelAtPeriodEnd: false } })
  res.json(updated)
})

