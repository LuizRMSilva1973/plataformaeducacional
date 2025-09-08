import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      schoolId?: string;
    }
  }
}

export function schoolScope(req: Request, res: Response, next: NextFunction) {
  const { schoolId } = req.params as { schoolId?: string };
  if (!schoolId) return res.status(400).json({ error: 'schoolId required' });
  req.schoolId = schoolId;
  next();
}

