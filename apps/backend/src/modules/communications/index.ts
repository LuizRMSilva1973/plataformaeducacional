import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireMembership } from '../../middleware/auth.js';
import { parsePagination, buildMeta } from '../../utils/pagination.js';
import { z } from 'zod';
import { rateLimit } from '../../middleware/rateLimit.js';

export const router = Router();

router.get('/announcements', requireMembership(), async (req, res) => {
  const schema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().min(1).optional(),
    classId: z.string().trim().min(1).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { q, classId, order } = parsed.data;
  const p = parsePagination(parsed.data as any);
  const where = {
    schoolId: req.schoolId!,
    ...(classId ? { classId } : {}),
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({ where, skip: p.skip, take: p.take, orderBy: { createdAt: order ?? 'desc' } })
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

router.get('/messages', requireMembership(), async (req, res) => {
  const schema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().min(1).optional(),
    fromUserId: z.string().trim().min(1).optional(),
    toUserId: z.string().trim().min(1).optional(),
    classId: z.string().trim().min(1).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { q, fromUserId, toUserId, classId, order } = parsed.data;
  const p = parsePagination(parsed.data as any);
  const where = {
    schoolId: req.schoolId!,
    ...(fromUserId ? { fromUserId } : {}),
    ...(toUserId ? { toUserId } : {}),
    ...(classId ? { classId } : {}),
    ...(q ? { content: { contains: q, mode: 'insensitive' as const } } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      skip: p.skip,
      take: p.take,
      orderBy: { createdAt: order ?? 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        classId: true,
        fromUserId: true,
        toUserId: true,
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        class: { select: { id: true, name: true } },
      }
    })
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

const annSchema = z.object({ title: z.string().min(1), content: z.string().min(1), classId: z.string().optional() });
router.post('/announcements', requireMembership('DIRECTOR'), rateLimit({ windowMs: 60_000, max: 10, keyGenerator: (req:any) => (req.user?.id || req.ip) + req.path }), async (req, res) => {
  const parsed = annSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const ann = await prisma.announcement.create({ data: { ...parsed.data, schoolId: req.schoolId! } });
  res.status(201).json(ann);
});

const msgSchema = z.object({ toUserId: z.string().optional(), classId: z.string().optional(), content: z.string().min(1), fileId: z.string().optional() });
router.post('/messages', requireMembership(), rateLimit({ windowMs: 60_000, max: 60, keyGenerator: (req:any) => (req.user?.id || req.ip) + req.path }), async (req, res) => {
  const parsed = msgSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const msg = await prisma.message.create({ data: { ...parsed.data, fromUserId: req.user!.id, schoolId: req.schoolId! } });
  res.status(201).json(msg);
});

const patchAnn = z.object({ title: z.string().min(1).optional(), content: z.string().min(1).optional(), classId: z.string().optional() });
router.patch('/announcements/:id', requireMembership('DIRECTOR'), async (req, res) => {
  const parsed = patchAnn.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const ann = await prisma.announcement.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(ann);
});

router.delete('/announcements/:id', requireMembership('DIRECTOR'), async (req, res) => {
  await prisma.announcement.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
