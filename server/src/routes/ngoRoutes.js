import { Router } from 'express';
import * as ngoController from '../controllers/ngoController.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { authenticateUser, optionalAuth, requireRoles } from '../middlewares/auth.js';
import { uploadSingleDocument } from '../middlewares/upload.js';
import { urgentSearchRateLimiter } from '../middlewares/rateLimiter.js';
import {
  updateNgoStatusSchema,
  updateNgoProfileSchema,
  uploadDocumentSchema,
  urgentSearchQuerySchema
} from '../validators/ngoValidator.js';

const router = Router();

// Public: view approved NGOs
router.get('/', ngoController.listApproved);

// Public: urgent help search (must be declared before /:id)
router.get(
  '/search',
  urgentSearchRateLimiter,
  validateQuery(urgentSearchQuerySchema),
  ngoController.searchUrgent
);

// NGO owner routes (must be declared before /:id)
router.put(
  '/my/profile',
  authenticateUser,
  requireRoles('ngo'),
  validateBody(updateNgoProfileSchema),
  ngoController.updateMyProfile
);

router.post(
  '/my/documents',
  authenticateUser,
  requireRoles('ngo'),
  uploadSingleDocument('file'),
  validateBody(uploadDocumentSchema),
  ngoController.uploadDocument
);

router.get(
  '/my/documents',
  authenticateUser,
  requireRoles('ngo'),
  ngoController.listMyDocuments
);

router.delete(
  '/my/documents/:docId',
  authenticateUser,
  requireRoles('ngo'),
  ngoController.deleteDocument
);

router.post(
  '/my/resubmit',
  authenticateUser,
  requireRoles('ngo'),
  ngoController.resubmit
);

// Admin routes
router.get(
  '/admin/all',
  authenticateUser,
  requireRoles('admin'),
  ngoController.listAllAdmin
);

router.patch(
  '/admin/:id/status',
  authenticateUser,
  requireRoles('admin'),
  validateBody(updateNgoStatusSchema),
  ngoController.updateStatus
);

router.get(
  '/admin/:id/documents',
  authenticateUser,
  requireRoles('admin'),
  ngoController.listAdminDocuments
);

router.get(
  '/admin/:id/reviews',
  authenticateUser,
  requireRoles('admin'),
  ngoController.listAdminReviews
);

router.get(
  '/admin/documents/:docId/stream',
  authenticateUser,
  requireRoles('admin'),
  ngoController.streamDocument
);

// Public / Protected: view single NGO detail
router.get('/:id', optionalAuth, ngoController.getById);

export default router;
