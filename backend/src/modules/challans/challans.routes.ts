import { Router } from 'express';
import * as challanController from './challans.controller';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import {
  createChallanSchema,
  updateChallanSchema,
  challanQuerySchema
} from './challans.schema';

const router = Router();

router.use(authMiddleware);

// GET /challans (all authenticated roles can read)
router.get('/', validate({ query: challanQuerySchema }), challanController.getChallans);

// POST /challans (Admin, Sales can create)
router.post('/', requireRole('Admin', 'Sales'), validate({ body: createChallanSchema }), challanController.createChallan);

// GET /challans/:id (all authenticated roles can read)
router.get('/:id', challanController.getChallanById);

// PUT /challans/:id (Admin, Sales can update draft)
router.put('/:id', requireRole('Admin', 'Sales'), validate({ body: updateChallanSchema }), challanController.updateChallan);

// POST /challans/:id/confirm (Admin, Sales can confirm)
router.post('/:id/confirm', requireRole('Admin', 'Sales'), challanController.confirmChallan);

// POST /challans/:id/cancel (Admin, Sales can cancel)
router.post('/:id/cancel', requireRole('Admin', 'Sales'), challanController.cancelChallan);

export default router;
