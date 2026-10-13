import { Router } from 'express';
import * as aiController from '../controllers/aiController.js';
import { validateBody } from '../middlewares/validate.js';
import { authenticateUser, requireRoles } from '../middlewares/auth.js';
import { matchOfferSchema, draftRequestSchema } from '../validators/aiValidator.js';

const router = Router();

// Public/Donor: Match an offer with urgent NGO requests
router.post('/match', validateBody(matchOfferSchema), aiController.matchOffer);

// Verified NGO: Assist drafting clear resource request specifications
router.post('/draft', authenticateUser, requireRoles('ngo'), validateBody(draftRequestSchema), aiController.draftRequest);

export default router;
