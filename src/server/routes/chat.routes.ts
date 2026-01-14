/**
 * Chat Routes
 * POST /api/chat - Conversational job discovery endpoint
 */

import { Router } from 'express';
import { chatController } from '../../controllers/chat.controller.js';

export const chatRoutes = Router();

chatRoutes.post('/', chatController);
