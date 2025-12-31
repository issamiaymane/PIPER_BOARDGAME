/**
 * PIPER Authentication Middleware
 * JWT-based authentication for PIPER endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../services/piper/auth/therapist.service';
import { JWTPayload } from '../../types/piper';

/**
 * Middleware to authenticate PIPER requests
 * Extracts JWT from Authorization header and validates it
 */
export function authenticatePiper(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Expect format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Invalid authorization format' });
      return;
    }

    const token = parts[1];

    // Verify token
    const payload = verifyToken(token);

    // Attach therapist info to request
    req.therapist = payload;

    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    res.status(401).json({ error: message });
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated users
 */
export function optionalAuthPiper(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      req.therapist = verifyToken(token);
    }

    next();
  } catch {
    // Token invalid, but that's okay for optional auth
    next();
  }
}

/**
 * Type guard to check if request has therapist
 */
export function hasTherapist(req: Request): req is Request & { therapist: JWTPayload } {
  return req.therapist !== undefined;
}

export default authenticatePiper;
