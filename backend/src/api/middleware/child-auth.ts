/**
 * Child Authentication Middleware
 * JWT authentication for child/student accounts
 */

import { Request, Response, NextFunction } from 'express';
import { verifyChildToken } from '../../services/piper/auth/child.service';
import { ChildJWTPayload } from '../../types/piper';

/**
 * Authenticate child requests
 * Verifies JWT token and attaches child info to request
 */
export function authenticateChild(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyChildToken(token);

    req.child = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Type guard to check if request has child
 */
export function hasChild(
  req: Request
): req is Request & { child: ChildJWTPayload } {
  return req.child !== undefined;
}

export default authenticateChild;
