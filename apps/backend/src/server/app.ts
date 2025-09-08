import express from 'express';
import cors from 'cors';
import { router as adminRouter } from '../modules/admin/index.js';
import { router as authRouter } from '../modules/auth/index.js';
import { router as scopedRouter } from '../server/scoped.js';
import { ensureAuthenticated } from '../middleware/auth.js';

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/auth', authRouter);
  app.use('/admin', ensureAuthenticated, adminRouter);
  app.use('/', ensureAuthenticated, scopedRouter);

  return app;
}
