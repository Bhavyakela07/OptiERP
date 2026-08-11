import { Router } from 'express';
import * as productController from './products.controller';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  createStockMovementSchema,
  stockMovementQuerySchema
} from './products.schema';

const router = Router();

router.use(authMiddleware);

// GET /products (all authenticated roles can read)
router.get('/', validate({ query: productQuerySchema }), productController.getProducts);

// POST /products (Admin, Warehouse can write)
router.post('/', requireRole('Admin', 'Warehouse'), validate({ body: createProductSchema }), productController.createProduct);

// GET /products/:id (all authenticated roles can read)
router.get('/:id', productController.getProductById);

// PUT /products/:id (Admin, Warehouse can write)
router.put('/:id', requireRole('Admin', 'Warehouse'), validate({ body: updateProductSchema }), productController.updateProduct);

// DELETE /products/:id (Admin, Warehouse can write)
router.delete('/:id', requireRole('Admin', 'Warehouse'), productController.deleteProduct);

// GET /products/:id/stock-movements (all authenticated roles can read)
router.get('/:id/stock-movements', validate({ query: stockMovementQuerySchema }), productController.getStockMovements);

// POST /products/:id/stock-movements (Admin, Warehouse can write)
router.post('/:id/stock-movements', requireRole('Admin', 'Warehouse'), validate({ body: createStockMovementSchema }), productController.createStockMovement);

export default router;
