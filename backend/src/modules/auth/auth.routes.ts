import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validate';
import { loginSchema, createUserSchema } from './auth.schema';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

router.post('/login', validate({ body: loginSchema }), authController.login);
router.get('/me', authMiddleware, authController.me);

// Admin-Only User Creation & Management Endpoints
router.post('/users', authMiddleware, requireRole('Admin'), validate({ body: createUserSchema }), authController.createUser);
router.get('/users', authMiddleware, requireRole('Admin'), authController.getUsers);

export default router;
