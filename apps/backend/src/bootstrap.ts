import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma.js';

export async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@local';
  const password = process.env.ADMIN_PASSWORD || 'senha';
  const name = 'Admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Garantir flag de admin
    if (!existing.isAdmin) {
      await prisma.user.update({ where: { id: existing.id }, data: { isAdmin: true } });
    }
    return existing.id;
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash: hash, isAdmin: true }
  });
  return user.id;
}

