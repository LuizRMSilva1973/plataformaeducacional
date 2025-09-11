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

// Unread count for current user (direct or class messages)
router.get('/unread-count', requireMembership(), async (req, res) => {
  const schoolId = req.schoolId!
  const userId = req.user!.id
  // classes for this user (as student or teacher)
  const [enr, teach] = await Promise.all([
    prisma.enrollment.findMany({ where: { schoolId, studentUserId: userId }, select: { classId: true } }),
    prisma.teachingAssignment.findMany({ where: { schoolId, teacherUserId: userId }, select: { classId: true } })
  ])
  const classIds = Array.from(new Set([...enr.map((e:any)=>e.classId), ...teach.map((t:any)=>t.classId)]))
  const messages = await prisma.message.findMany({ where: { schoolId, OR: [ { toUserId: userId }, ...(classIds.length? [{ classId: { in: classIds } }]:[]) ] }, select: { id: true, fromUserId: true } })
  const ids = messages.filter((m:any) => m.fromUserId !== userId).map((m:any)=>m.id)
  if (!ids.length) return res.json({ count: 0 })
  const reads = await prisma.messageRead.findMany({ where: { userId, messageId: { in: ids } }, select: { messageId: true } })
  const readSet = new Set(reads.map((r:any)=>r.messageId))
  const count = ids.filter((id:any)=> !readSet.has(id)).length
  res.json({ count })
})

// Mark messages as read for current user
router.post('/mark-read', requireMembership(), async (req, res) => {
  const schoolId = req.schoolId!
  const userId = req.user!.id
  const [enr2, teach2] = await Promise.all([
    prisma.enrollment.findMany({ where: { schoolId, studentUserId: userId }, select: { classId: true } }),
    prisma.teachingAssignment.findMany({ where: { schoolId, teacherUserId: userId }, select: { classId: true } })
  ])
  const classIds2 = Array.from(new Set([...enr2.map((e:any)=>e.classId), ...teach2.map((t:any)=>t.classId)]))
  const messages2 = await prisma.message.findMany({ where: { schoolId, OR: [ { toUserId: userId }, ...(classIds2.length? [{ classId: { in: classIds2 } }]:[]) ] }, select: { id: true } })
  const ids2 = messages2.map((m:any)=>m.id)
  if (!ids2.length) return res.json({ ok: true, count: 0 })
  // existing reads
  const reads2 = await prisma.messageRead.findMany({ where: { userId, messageId: { in: ids2 } }, select: { messageId: true } })
  const existing = new Set(reads2.map((r:any)=>r.messageId))
  const toCreate = ids2.filter((id:any)=> !existing.has(id)).map((id:any)=> ({ userId, messageId: id }))
  if (toCreate.length){ await prisma.messageRead.createMany({ data: toCreate, skipDuplicates: true }) }
  res.json({ ok: true, count: toCreate.length })
})

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
