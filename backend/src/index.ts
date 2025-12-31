import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { initializeDatabase, closeDatabase } from './services/database.js';
import { logger } from './utils/logger.js';
import therapistRoutes from './api/routes/therapist.routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/therapist', therapistRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

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
