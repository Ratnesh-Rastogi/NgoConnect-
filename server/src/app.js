import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import ngoRoutes from './routes/ngoRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// Cookie parser for parsing httpOnly JWT cookies
app.use(cookieParser());

// CORS allowlist configuration with credentials support
const allowedOrigins = Array.from(
  new Set([config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean))
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no origin header, e.g. server-to-server, curl, Supertest)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: Origin ${origin} is not in the allowlist.`));
    },
    credentials: true
  })
);

// Body parser with strictly enforced size limit (100kb) to prevent payload abuse
app.use(express.json({ limit: '100kb' }));

// API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', platform: 'NGOConnect AI', timestamp: new Date().toISOString() });
});

// Mount domain routes
app.use('/api/auth', authRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler for unmatched routes conforming to { error: message }
app.use((req, res) => {
  res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` });
});

// Central error handler
app.use(errorHandler);

export default app;
