import { Router } from 'express';
import * as transferController from '../controllers/transferController.js';
import { validateBody } from '../middlewares/validate.js';
import { authenticateUser, requireRoles } from '../middlewares/auth.js';
import { createTransferSchema, updateTransferStatusSchema } from '../validators/transferValidator.js';

const router = Router();

// Donor: create a donation toward an open request
router.post('/', authenticateUser, requireRoles('donor'), validateBody(createTransferSchema), transferController.create);

// Donor: view donations made by them
router.get('/my/donor', authenticateUser, requireRoles('donor'), transferController.listMyTransfers);

// NGO: view transfers donated to their organization
router.get('/my/ngo', authenticateUser, requireRoles('ngo'), transferController.listNgoTransfers);

// Update transfer status (Donor marks IN_TRANSIT, NGO marks RECEIVED, either can CANCEL)
router.patch('/:id/status', authenticateUser, validateBody(updateTransferStatusSchema), transferController.updateStatus);

// View single transfer details (ownership checked in service)
router.get('/:id', authenticateUser, transferController.getById);

export default router;
