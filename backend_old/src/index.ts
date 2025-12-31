import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Speech Therapy AI - Main Entry Point
 */

export const version = '1.0.0';

// Start the API server
import './api/server';
