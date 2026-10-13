import { Router } from 'express';
import * as requestController from '../controllers/requestController.js';
import { validateBody } from '../middlewares/validate.js';
import { authenticateUser, requireApprovedNgo, requireRoles } from '../middlewares/auth.js';
import { createRequestSchema, updateRequestSchema } from '../validators/requestValidator.js';

const router = Router();

// Public: browse and search active resource requests
router.get('/', requestController.list);

// NGO owner: view requests created by their NGO
router.get('/my/all', authenticateUser, requireRoles('ngo'), requestController.listMyRequests);

// Public: view single request
router.get('/:id', requestController.getById);

// Verified NGO only: create request (Checked for APPROVED status)
router.post('/', authenticateUser, requireApprovedNgo, validateBody(createRequestSchema), requestController.create);

// NGO owner or Admin: update request (supports both PUT and PATCH)
router.put('/:id', authenticateUser, requireRoles('ngo', 'admin'), validateBody(updateRequestSchema), requestController.update);
router.patch('/:id', authenticateUser, requireRoles('ngo', 'admin'), validateBody(updateRequestSchema), requestController.update);

// NGO owner or Admin: delete request
router.delete('/:id', authenticateUser, requireRoles('ngo', 'admin'), requestController.deleteReq);

export default router;
