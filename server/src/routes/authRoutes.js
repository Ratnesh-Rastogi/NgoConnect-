import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validateBody } from '../middlewares/validate.js';
import { authenticateUser } from '../middlewares/auth.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';

const router = Router();

// Public onboarding and authentication endpoints with rate limiting
router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/logout', authController.logout);

// Authenticated session profile
router.get('/me', authenticateUser, authController.getMe);

export default router;
