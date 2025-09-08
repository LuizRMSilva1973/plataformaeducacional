import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export async function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });

  // Optionally confirm user still exists
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, name: true, isAdmin: true } });
  if (!user) return res.status(401).json({ error: 'User not found' });

  req.user = user;
  req.tokenSub = payload.sub;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.isAdmin) return next();
  return res.status(403).json({ error: 'Admin required' });
}

export function requireMembership(role?: 'DIRECTOR' | 'TEACHER' | 'STUDENT') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.isAdmin) return next();
    const schoolId = req.schoolId;
    const userId = req.user?.id;
    if (!schoolId || !userId) return res.status(400).json({ error: 'schoolId and user required' });

    const membership = await prisma.membership.findFirst({
      where: {
        schoolId,
        userId,
        status: 'ACTIVE',
        ...(role ? { role } : {}),
      },
      select: { id: true, role: true }
    });

    if (!membership) return res.status(403).json({ error: 'No membership for this school' });
    next();
  };
}

