import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticateUser, requireRoles } from '../middlewares/auth.js';

const router = Router();

// NGO Dashboard aggregates (strictly scoped to calling NGO)
router.get(
  '/ngo',
  authenticateUser,
  requireRoles('ngo'),
  dashboardController.getNgoStats
);

// Donor Dashboard aggregates (strictly scoped to calling Donor)
router.get(
  '/donor',
  authenticateUser,
  requireRoles('donor'),
  dashboardController.getDonorStats
);

// Admin Governance aggregates (admin only)
router.get(
  '/admin',
  authenticateUser,
  requireRoles('admin'),
  dashboardController.getAdminStats
);

export default router;
