import { Router } from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = Router();

// All notification routes require authentication
router.use(authenticateUser);

// List user notifications (up to 50, optional ?unread=true)
router.get('/', notificationController.list);

// Unread count
router.get('/unread-count', notificationController.unreadCount);

// Mark all as read (defined BEFORE /:id/read so :id does not capture "read-all")
router.patch('/read-all', notificationController.markAllRead);

// Mark single notification as read
router.patch('/:id/read', notificationController.markOneRead);

export default router;
