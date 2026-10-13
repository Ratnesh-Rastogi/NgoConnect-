import { Router } from 'express';
import * as ngoController from '../controllers/ngoController.js';
import { validateBody } from '../middlewares/validate.js';
import { authenticateUser, optionalAuth, requireRoles } from '../middlewares/auth.js';
import { updateNgoStatusSchema, updateNgoProfileSchema } from '../validators/ngoValidator.js';

const router = Router();

// Public: view approved NGOs
router.get('/', ngoController.listApproved);

// Public / Protected: view single NGO detail
router.get('/:id', optionalAuth, ngoController.getById);

// NGO owner: update their profile
router.put('/my/profile', authenticateUser, requireRoles('ngo'), validateBody(updateNgoProfileSchema), ngoController.updateMyProfile);

// Admin: view all NGOs and review verification status
router.get('/admin/all', authenticateUser, requireRoles('admin'), ngoController.listAllAdmin);
router.patch('/admin/:id/status', authenticateUser, requireRoles('admin'), validateBody(updateNgoStatusSchema), ngoController.updateStatus);

export default router;
