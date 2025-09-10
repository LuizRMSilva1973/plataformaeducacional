import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireMembership } from '../../middleware/auth.js';
import { parsePagination, buildMeta } from '../../utils/pagination.js';
import { z } from 'zod';

export const router = Router();

// Lista usuários vinculados à escola (via memberships)
router.get('/', requireMembership(), async (req, res) => {
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
  const schoolId = req.schoolId!;
  const where = {
    schoolId,
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { user: { is: { name: { contains: q, mode: 'insensitive' as const } } } },
            { user: { is: { email: { contains: q, mode: 'insensitive' as const } } } },
          ],
        }
      : {}),
  } as const;

  const orderBy = sort === 'email' ? { user: { email: order ?? 'asc' } } : sort === 'role' ? { role: order ?? 'asc' } : { user: { name: order ?? 'asc' } };

  const total = await prisma.membership.count({ where });
  const memberships = await prisma.membership.findMany({
    where,
    select: { user: { select: { id: true, email: true, name: true } }, role: true },
    orderBy,
    skip: p.skip,
    take: p.take,
  });
  const items = memberships.map((m: any) => ({ ...m.user, role: m.role }));
  res.json({ items, meta: buildMeta(total, p) });
});
