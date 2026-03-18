import { Router } from 'express';
import { buildResumeController } from '../../controllers/resume.controller.js';

export const resumeRoutes = Router();

resumeRoutes.post('/build', buildResumeController);
