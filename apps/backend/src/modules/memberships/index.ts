import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireMembership } from '../../middleware/auth.js';
import { parsePagination, buildMeta } from '../../utils/pagination.js';
import { z } from 'zod';

export const router = Router();

router.get('/', requireMembership('DIRECTOR'), async (req, res) => {
  const schema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().min(1).optional(),
    role: z.enum(['DIRECTOR', 'TEACHER', 'STUDENT']).optional(),
    sort: z.enum(['name', 'email', 'role']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { q, role, sort, order } = parsed.data;
  const p = parsePagination(parsed.data as Record<string, unknown>);
  const where = {
    schoolId: req.schoolId!,
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  } as const;
  const orderBy = sort === 'email' ? { user: { email: order ?? 'asc' } } : sort === 'role' ? { role: order ?? 'asc' } : { user: { name: order ?? 'asc' } };
  const [total, items] = await Promise.all([
    prisma.membership.count({ where }),
    prisma.membership.findMany({
      where,
      select: { id: true, role: true, status: true, user: { select: { id: true, email: true, name: true } } },
      orderBy,
      skip: p.skip,
      take: p.take,
    }),
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

const upsertSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['DIRECTOR', 'TEACHER', 'STUDENT'])
});

router.post('/', requireMembership('DIRECTOR'), async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { userId, role } = parsed.data;
  const schoolId = req.schoolId!;
  const membership = await prisma.membership.upsert({
    where: { userId_schoolId_role: { userId, schoolId, role } },
    update: { status: 'ACTIVE' },
    create: { userId, schoolId, role, status: 'ACTIVE' }
  });
  res.status(201).json(membership);
});
