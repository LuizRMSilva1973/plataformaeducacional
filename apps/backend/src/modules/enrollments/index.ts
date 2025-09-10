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
    studentUserId: z.string().trim().min(1).optional(),
    classId: z.string().trim().min(1).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { studentUserId, classId, order } = parsed.data;
  const p = parsePagination(parsed.data as Record<string, unknown>);
  const where = { schoolId: req.schoolId!, ...(studentUserId ? { studentUserId } : {}), ...(classId ? { classId } : {}) };
  const [total, items] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where,
      skip: p.skip,
      take: p.take,
      orderBy: { id: order ?? 'asc' },
      select: {
        id: true,
        classId: true,
        studentUserId: true,
        student: { select: { id: true, name: true, email: true } },
        class: { select: { id: true, name: true, year: true } },
      }
    })
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

const enrollSchema = z.object({ studentUserId: z.string(), classId: z.string() });
router.post('/', requireMembership('DIRECTOR'), rateLimit({ windowMs: 60_000, max: 30, keyGenerator: (req:any) => (req.user?.id || req.ip) + req.path }), async (req, res) => {
  const parsed = enrollSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { studentUserId, classId } = parsed.data;
  const schoolId = req.schoolId!;

  // Verificações de integridade: classe da mesma escola e aluno com papel STUDENT nesta escola
  const [klass, member] = await Promise.all([
    prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } }),
    prisma.membership.findFirst({ where: { userId: studentUserId, schoolId, role: 'STUDENT', status: 'ACTIVE' }, select: { id: true } }),
  ]);
  if (!klass) return res.status(404).json({ error: 'Classe não encontrada nesta escola' });
  if (!member) return res.status(400).json({ error: 'Usuário não possui papel STUDENT nesta escola' });

  try {
    const enrollment = await prisma.enrollment.create({ data: { studentUserId, classId, schoolId } });
    return res.status(201).json(enrollment);
  } catch (e: any) {
    // Prisma unique constraint (já matriculado) ou chave estrangeira
    if (e?.code === 'P2002') return res.status(409).json({ error: 'Aluno já matriculado nesta turma' });
    if (e?.code === 'P2003') return res.status(400).json({ error: 'Referência inválida (usuário/turma)' });
    return res.status(500).json({ error: 'Falha ao criar matrícula' });
  }
});

router.delete('/:id', requireMembership('DIRECTOR'), async (req, res) => {
  await prisma.enrollment.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

const patchEnroll = z.object({ studentUserId: z.string().optional(), classId: z.string().optional() });
router.patch('/:id', requireMembership('DIRECTOR'), async (req, res) => {
  const parsed = patchEnroll.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const schoolId = req.schoolId!;
  const id = req.params.id;
  const { studentUserId, classId } = parsed.data;

  // Se informar classId, valide que pertence à escola; se informar studentUserId, valide membership STUDENT
  if (classId) {
    const klass = await prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } });
    if (!klass) return res.status(404).json({ error: 'Classe não encontrada nesta escola' });
  }
  if (studentUserId) {
    const member = await prisma.membership.findFirst({ where: { userId: studentUserId, schoolId, role: 'STUDENT', status: 'ACTIVE' }, select: { id: true } });
    if (!member) return res.status(400).json({ error: 'Usuário não possui papel STUDENT nesta escola' });
  }

  try {
    const enrollment = await prisma.enrollment.update({ where: { id }, data: parsed.data });
    return res.json(enrollment);
  } catch (e: any) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'Aluno já matriculado nesta turma' });
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Matrícula não encontrada' });
    return res.status(500).json({ error: 'Falha ao atualizar matrícula' });
  }
});
