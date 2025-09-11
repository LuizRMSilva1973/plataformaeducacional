import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireMembership } from '../../middleware/auth.js';
import { parsePagination, buildMeta } from '../../utils/pagination.js';
import { z } from 'zod';
import { rateLimit } from '../../middleware/rateLimit.js';

export const router = Router();

router.get('/', requireMembership(), async (req, res) => {
  const schema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    classId: z.string().trim().min(1).optional(),
    studentUserId: z.string().trim().min(1).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { classId, studentUserId, dateFrom, dateTo, status, order } = parsed.data;
  const p = parsePagination(parsed.data as Record<string, unknown>);
  const where = {
    schoolId: req.schoolId!,
    ...(classId ? { classId } : {}),
    ...(studentUserId ? { studentUserId } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom || dateTo ? { date: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      skip: p.skip,
      take: p.take,
      orderBy: { date: order ?? 'desc' },
      select: {
        id: true,
        date: true,
        status: true,
        classId: true,
        studentUserId: true,
        class: { select: { id: true, name: true } },
        student: { select: { id: true, name: true, email: true } },
      }
    })
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

const attSchema = z.object({ classId: z.string(), studentUserId: z.string(), date: z.coerce.date(), status: z.enum(['PRESENT', 'ABSENT', 'LATE']) });
router.post('/', requireMembership('TEACHER'), rateLimit({ windowMs: 60_000, max: 60, keyGenerator: (req:any) => (req.user?.id || req.ip) + req.path }), async (req, res) => {
  const parsed = attSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const attendance = await prisma.attendance.create({ data: { ...parsed.data, schoolId: req.schoolId! } });
  res.status(201).json(attendance);
});

// Bulk upsert attendance for a specific date/class
const bulkSchema = z.object({
  classId: z.string(),
  date: z.coerce.date(),
  items: z.array(z.object({ studentUserId: z.string(), status: z.enum(['PRESENT','ABSENT','LATE']) })).min(1)
})
router.post('/bulk', requireMembership('TEACHER'), rateLimit({ windowMs: 60_000, max: 20, keyGenerator: (req:any) => (req.user?.id || req.ip) + req.path }), async (req, res) => {
  const parsed = bulkSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { classId, date, items } = parsed.data
  const schoolId = req.schoolId!
  // Upsert per unique (classId, studentUserId, date)
  await prisma.$transaction(items.map(it => prisma.attendance.upsert({
    where: { classId_studentUserId_date: { classId, studentUserId: it.studentUserId, date } as any },
    update: { status: it.status },
    create: { schoolId, classId, studentUserId: it.studentUserId, date, status: it.status }
  }) as any))
  res.json({ ok: true })
})
