import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/index.js';
import { initializeDatabase, closeDatabase } from './services/database.js';
import { logger } from './utils/logger.js';
import routes from './api/routes/index.js';
import { globalErrorHandler, notFoundHandler } from './api/middleware/errorHandler.js';
import { setupVoiceWebSocket } from './api/routes/voice.routes.js';
import { voiceSessionManager } from './services/voice/index.js';

// Frontend path (relative to backend in Docker: /app/backend -> /app/frontend/dist)
const FRONTEND_PATH = path.join(process.cwd(), '..', 'frontend', 'dist');

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

// Serve static frontend files (in production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(FRONTEND_PATH));

  // Serve index.html for root and any non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(FRONTEND_PATH, req.path.endsWith('.html') ? req.path : 'index.html'));
  });
}

// 404 handler (after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// Initialize and start
initializeDatabase();

const server = app.listen(config.port, () => {
  logger.info(`Server running on http://localhost:${config.port}`);
});

// Setup Voice WebSocket server
setupVoiceWebSocket(server);

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  voiceSessionManager.endAllSessions();
  server.close();
  closeDatabase();
  process.exit(0);
});
