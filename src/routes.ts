import express from 'express';

import * as assignments from './controllers/assignment';
import * as submissions from './controllers/submission';
import * as jobs from './controllers/job';

const router = express.Router({ mergeParams: true });

// Submissions
const submissionsRouter = express.Router({ mergeParams: true });
submissionsRouter.post('/submissions', submissions.create);
submissionsRouter.use('/submissions/:submission_id', submissions.provide);
submissionsRouter.get('/submissions/:submission_id', submissions.get);
submissionsRouter.delete('/submissions/:submission_id', submissions.del);

// Assignments
router.post('/assignments', assignments.create);
router.use('/assignments/:assignment_id', assignments.provide);
router.get('/assignments/:assignment_id', assignments.get);
router.delete('/assignments/:assignment_id', assignments.del);
router.use('/assignments/:assignment_id', submissionsRouter);

// Jobs
router.get('/jobs/:jobid/:tarid.tar.gz', jobs.get_tar);

export default router;
