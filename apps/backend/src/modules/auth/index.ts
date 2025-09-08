import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { signAccessToken } from '../../lib/jwt.js';
import { rateLimit } from '../../middleware/rateLimit.js';

export const router = Router();

// Para reduzir 400 indevidos, validamos de forma permissiva (trim)
const emailSchema = z.string().trim().min(3);
const loginSchema = z.object({ email: emailSchema, password: z.string().trim().min(1) });

router.post('/login', rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signAccessToken({ sub: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin });
  return res.json({ token });
});

router.post('/refresh', (_req, res) => {
  res.json({ token: 'dev-token' });
});

// Simple dev route to create first admin user (protect/remove in prod)
const registerSchema = z.object({ name: z.string().min(2), email: emailSchema, password: z.string().min(5), isAdmin: z.boolean().optional() });
router.post('/dev-register', rateLimit({ windowMs: 60_000, max: 5 }), async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, password, isAdmin } = parsed.data;
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { name, email, passwordHash: hash, isAdmin: !!isAdmin } });
    return res.status(201).json({ id: user.id, email: user.email, isAdmin: user.isAdmin });
  } catch {
    return res.status(409).json({ error: 'User already exists?' });
  }
});
