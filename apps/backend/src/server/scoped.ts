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

export const router = Router();

router.use('/:schoolId', schoolScope, Router()
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
);

