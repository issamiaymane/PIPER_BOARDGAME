/**
 * Application Configuration
 * Centralized configuration management
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Paths
  frontendPath: path.join(process.cwd(), '..', 'frontend'),

  // API Keys
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },

  // CORS
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // Audio
  audio: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['wav', 'mp3', 'webm', 'ogg'],
  },
};

export default config;
