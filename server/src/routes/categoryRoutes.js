import { Router } from 'express';
import * as categoryController from '../controllers/categoryController.js';

const router = Router();

// Public: view all resource categories
router.get('/', categoryController.list);

export default router;
