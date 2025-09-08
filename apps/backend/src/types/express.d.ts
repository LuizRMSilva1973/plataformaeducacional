import type { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      schoolId?: string;
      user?: Pick<User, 'id' | 'email' | 'name' | 'isAdmin'>;
      tokenSub?: string;
    }
  }
}

export {};

