import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes';
import customerRoutes from './modules/customers/customers.routes';
import productRoutes from './modules/products/products.routes';
import challanRoutes from './modules/challans/challans.routes';
import { errorHandler } from './middleware/errorHandler';
import { verifyDbConnection } from './config/db';
import { seedDatabase } from './scripts/seed';

dotenv.config({ override: false });

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS — dynamically reflect requesting origin so all Vercel URLs, previews, & local domains work seamlessly
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
}));

app.use(express.json());

// Global Anti-Caching Middleware to force immediate real-time response freshness
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Health Check
app.get('/health', async (req, res) => {
  const dbConnected = await verifyDbConnection();
  res.status(200).json({ status: 'ok', dbConnected, timestamp: new Date() });
});

// Combined API Router supporting both /... and /api/... prefix
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/challans', challanRoutes);

app.use('/api', apiRouter);
app.use('/', apiRouter);

// Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, async () => {
    console.log(`\n🚀 [Server] Mini ERP + CRM Portal backend listening on port ${PORT}`);
    try {
      await verifyDbConnection();
      await seedDatabase();
    } catch (err: any) {
      console.error('⚠️  [Server Initialization] Error auto-seeding database:', err.message);
    }
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n⚠️  [Server Warning] Port ${PORT} is currently occupied. Running port cleanup...\n`);
    } else {
      console.error(`\n🔴 [Server Error] ${err.message}\n`);
    }
  });
}

export default app;
