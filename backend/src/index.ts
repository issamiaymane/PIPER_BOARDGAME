import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { initializeDatabase, closeDatabase } from './services/database.js';
import { logger } from './utils/logger.js';
import routes from './api/routes/index.js';
import { globalErrorHandler, notFoundHandler } from './api/middleware/errorHandler.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/therapist', routes);

// 404 handler (after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// Initialize and start
initializeDatabase();

const server = app.listen(config.port, () => {
  logger.info(`Server running on http://localhost:${config.port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  server.close();
  closeDatabase();
  process.exit(0);
});
