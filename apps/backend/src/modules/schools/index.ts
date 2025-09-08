import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';

export const router = Router();

router.get('/', async (req, res) => {
  // Retorna a escola do escopo
  const school = await prisma.school.findUnique({ where: { id: req.schoolId }, select: { id: true, name: true } });
  res.json({ school });
});
