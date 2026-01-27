/**
 * Child Authentication Middleware
 * Authenticates children using JWT tokens
 */

import { Request, Response, NextFunction } from 'express';
import { verifyChildToken } from '../../services/student/index.js';

export function authenticateChild(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const decoded = verifyChildToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.child = { child_id: decoded.child_id };
  next();
}
