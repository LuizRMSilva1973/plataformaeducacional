import express from 'express';
import cors from 'cors';
import { router as adminRouter } from '../modules/admin/index.js';
import { router as authRouter } from '../modules/auth/index.js';
import { router as scopedRouter } from '../server/scoped.js';
import { ensureAuthenticated } from '../middleware/auth.js';

export function createServer() {
  const app = express();
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  // Allow all in dev by default, or restrict to configured origin(s)
  if (corsOrigin === '*') {
    app.use(cors());
  } else {
    // Support comma-separated origins
    const allowed = corsOrigin.split(',').map((o) => o.trim());
    app.use(cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowed.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }));
  }
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/auth', authRouter);
  app.use('/admin', ensureAuthenticated, adminRouter);
  app.use('/', ensureAuthenticated, scopedRouter);

  return app;
}
