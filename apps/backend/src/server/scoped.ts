import { Router } from 'express';
import { schoolScope } from './schoolScope.js';
import { router as schoolsRouter } from '../modules/schools/index.js';
import { router as usersRouter } from '../modules/users/index.js';
import { router as membershipsRouter } from '../modules/memberships/index.js';
import { router as classesRouter } from '../modules/classes/index.js';
import { router as subjectsRouter } from '../modules/subjects/index.js';
import { router as teachingRouter } from '../modules/teaching/index.js';
import { router as enrollmentsRouter } from '../modules/enrollments/index.js';
import { router as assignmentsRouter } from '../modules/assignments/index.js';
import { router as submissionsRouter } from '../modules/submissions/index.js';
import { router as gradesRouter } from '../modules/grades/index.js';
import { router as attendanceRouter } from '../modules/attendance/index.js';
import { router as communicationsRouter } from '../modules/communications/index.js';
import { router as profileRouter } from '../modules/profile/index.js';
import { router as lessonsRouter } from '../modules/lessons/index.js';
import { router as filesRouter } from '../modules/files/index.js';
import { router as pricingRouter } from '../modules/pricing/index.js';
import { router as checkoutRouter } from '../modules/checkout/index.js';
import { router as subscriptionsRouter } from '../modules/subscriptions/index.js';
import { router as billingRouter } from '../modules/billing/index.js';
import { router as ordersRouter } from '../modules/orders/index.js';

export const router = Router();

router.use('/:schoolId', schoolScope, Router()
  .use('/profile', profileRouter)
  .use('/schools', schoolsRouter)
  .use('/users', usersRouter)
  .use('/members', membershipsRouter)
  .use('/classes', classesRouter)
  .use('/subjects', subjectsRouter)
  .use('/teaching-assignments', teachingRouter)
  .use('/enrollments', enrollmentsRouter)
  .use('/assignments', assignmentsRouter)
  .use('/submissions', submissionsRouter)
  .use('/grades', gradesRouter)
  .use('/attendance', attendanceRouter)
  .use('/communications', communicationsRouter)
  .use('/lessons', lessonsRouter)
  .use('/files', filesRouter)
  .use('/pricing', pricingRouter)
  .use('/checkout', checkoutRouter)
  .use('/subscriptions', subscriptionsRouter)
  .use('/billing', billingRouter)
  .use('/orders', ordersRouter)
);
