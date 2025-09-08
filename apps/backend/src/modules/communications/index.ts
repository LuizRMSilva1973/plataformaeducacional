import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireMembership } from '../../middleware/auth.js';
import { parsePagination, buildMeta } from '../../utils/pagination.js';
import { z } from 'zod';

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
    prisma.message.findMany({ where, skip: p.skip, take: p.take, orderBy: { createdAt: order ?? 'desc' } })
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

const annSchema = z.object({ title: z.string().min(1), content: z.string().min(1), classId: z.string().optional() });
router.post('/announcements', requireMembership('DIRECTOR'), async (req, res) => {
  const parsed = annSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const ann = await prisma.announcement.create({ data: { ...parsed.data, schoolId: req.schoolId! } });
  res.status(201).json(ann);
});

const msgSchema = z.object({ toUserId: z.string().optional(), classId: z.string().optional(), content: z.string().min(1) });
router.post('/messages', requireMembership(), async (req, res) => {
  const parsed = msgSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const msg = await prisma.message.create({ data: { ...parsed.data, fromUserId: req.user!.id, schoolId: req.schoolId! } });
  res.status(201).json(msg);
});
