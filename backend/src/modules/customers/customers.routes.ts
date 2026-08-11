import { Router } from 'express';
import * as customerController from './customers.controller';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
  createFollowupSchema,
  suspendCustomerSchema
} from './customers.schema';

const router = Router();

router.use(authMiddleware);

// GET /customers (all authenticated roles can read)
router.get('/', validate({ query: customerQuerySchema }), customerController.getCustomers);

// POST /customers (Admin, Sales can write)
router.post('/', requireRole('Admin', 'Sales'), validate({ body: createCustomerSchema }), customerController.createCustomer);

// GET /customers/:id (all authenticated roles can read)
router.get('/:id', customerController.getCustomerById);

// PUT /customers/:id (Admin, Sales can write)
router.put('/:id', requireRole('Admin', 'Sales'), validate({ body: updateCustomerSchema }), customerController.updateCustomer);

// DELETE /customers/:id (Admin only)
router.delete('/:id', requireRole('Admin'), customerController.deleteCustomer);

// POST /customers/:id/suspend (Admin only)
router.post('/:id/suspend', requireRole('Admin'), validate({ body: suspendCustomerSchema }), customerController.suspendCustomer);

// POST /customers/:id/unsuspend (Admin only)
router.post('/:id/unsuspend', requireRole('Admin'), customerController.unsuspendCustomer);

// POST /customers/:id/followups (Admin, Sales can write)
router.post('/:id/followups', requireRole('Admin', 'Sales'), validate({ body: createFollowupSchema }), customerController.addFollowup);

export default router;
