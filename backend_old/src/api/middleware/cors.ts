/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';

export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.header('Access-Control-Allow-Origin', config.cors.origin);
  res.header('Access-Control-Allow-Methods', config.cors.methods.join(', '));
  res.header('Access-Control-Allow-Headers', config.cors.allowedHeaders.join(', '));

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
};

export default corsMiddleware;
