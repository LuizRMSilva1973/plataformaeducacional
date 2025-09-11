import express from 'express';
import cors from 'cors';
import { router as adminRouter } from '../modules/admin/index.js';
import { router as paymentsRouter } from '../modules/payments/index.js';
import { stripeWebhookHandler } from '../modules/payments/stripeWebhook.js';
import { router as authRouter } from '../modules/auth/index.js';
import { router as scopedRouter } from '../server/scoped.js';
import { router as profileRootRouter } from '../modules/profile/root.js';
import { prisma } from '../lib/prisma.js';
import { errorHandler } from './errors.js';
import { requestId } from '../middleware/requestId.js';
import { requestLogger } from '../middleware/logger.js';
import { ensureAuthenticated } from '../middleware/auth.js';

export function createServer() {
  const app = express();
  app.use(requestId);
  app.use(requestLogger);
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  // Stripe webhook must receive raw body — mount before json()
  app.post('/payments/stripe/webhook', express.raw({ type: 'application/json' }) as any, (req, res) => {
    // attach raw body for handler
    ;(req as any).rawBody = (req as any).body
    return stripeWebhookHandler(req, res)
  });
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

  // Webhooks and payment callbacks that may require raw body or no auth would be mounted here if needed
  // For now, payment OAuth callback is JSON and mounted without auth
  // Mercado Pago webhook should also accept raw body for signature validation
  app.post('/payments/mercadopago/webhook', express.raw({ type: '*/*' }) as any, (req, res, next) => {
    ;(req as any).rawBody = (req as any).body
    next()
  }, paymentsRouter)
  app.use('/payments', paymentsRouter);

  app.get('/health', async (_req, res) => {
    try {
      // Verifica conectividade com o banco
      await prisma.$executeRaw`SELECT 1`;
      return res.json({ ok: true, db: 'up' });
    } catch {
      return res.status(503).json({ ok: false, db: 'down' });
    }
  });

  app.use('/auth', authRouter);
  // Rotas de perfil sem escopo de escola (ex.: lista escolas do usuário)
  app.use('/profile', ensureAuthenticated, profileRootRouter);
  app.use('/admin', ensureAuthenticated, adminRouter);
  app.use('/', ensureAuthenticated, scopedRouter);

  // Middleware global de erros (sempre por último)
  app.use(errorHandler);

  return app;
}
