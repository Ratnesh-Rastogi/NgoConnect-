import { Router } from 'express';
import * as resourceController from '../controllers/resourceController.js';
import { validateBody } from '../middlewares/validate.js';
import { authenticateUser, requireApprovedNgo, requireRoles } from '../middlewares/auth.js';
import {
  createResourceSchema,
  updateResourceSchema,
  claimResourceSchema
} from '../validators/resourceValidator.js';

const router = Router();

// Public: browse and search active resources
router.get('/', resourceController.list);

// Authenticated: view listings created by current user
router.get('/my', authenticateUser, resourceController.listMy);

// Public: view single resource detail
router.get('/:id', resourceController.getById);

// Donors and APPROVED NGOs: list a donation resource
router.post(
  '/',
  authenticateUser,
  requireRoles('donor', 'ngo'),
  validateBody(createResourceSchema),
  resourceController.create
);

// Owner or Admin: update resource listing
router.put(
  '/:id',
  authenticateUser,
  requireRoles('donor', 'ngo', 'admin'),
  validateBody(updateResourceSchema),
  resourceController.update
);

// Owner or Admin: withdraw resource listing
router.patch(
  '/:id/withdraw',
  authenticateUser,
  requireRoles('donor', 'ngo', 'admin'),
  resourceController.withdraw
);

// APPROVED NGO: claim quantity from a resource listing
router.post(
  '/:id/claim',
  authenticateUser,
  requireApprovedNgo,
  validateBody(claimResourceSchema),
  resourceController.claim
);

export default router;
