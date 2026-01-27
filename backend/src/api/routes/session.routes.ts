/**
 * Session Routes
 * Handles gameplay session management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticateChild } from '../middleware/childAuth.js';
import { authenticate } from '../middleware/auth.js';
import { getStudentById } from '../../services/student/index.js';
import {
  gameplaySessionManager,
  getSessionById,
  getSessionHistoryByChild,
  getSessionHistoryForTherapist,
  getSessionWithResponses,
  getActiveSessionsForTherapist,
} from '../../services/session/index.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Child Endpoints (require child authentication)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/session/start
 * Start a new gameplay session
 */
router.post('/start', authenticateChild, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const childId = req.child!.child_id;
    const { categories, theme, character, voiceSessionId } = req.body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      throw ApiError.badRequest('Categories are required');
    }

    // Start gameplay session
    const session = await gameplaySessionManager.startGameplaySession(
      voiceSessionId || `http_${Date.now()}`,
      childId,
      categories,
      theme,
      character
    );

    res.json({
      success: true,
      sessionId: session.id,
      session: {
        id: session.id,
        started_at: session.started_at,
        categories_selected: JSON.parse(session.categories_selected),
        theme: session.theme,
        character: session.character,
        status: session.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/session/:id/end
 * End a gameplay session
 */
router.post('/:id/end', authenticateChild, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = parseInt(req.params.id);
    const childId = req.child!.child_id;
    const { finalScore, boardPosition, status, voiceSessionId } = req.body;

    // Verify session belongs to this child
    const session = getSessionById(sessionId);
    if (!session) {
      throw ApiError.notFound('Session not found');
    }
    if (session.child_id !== childId) {
      throw ApiError.forbidden('Not authorized to end this session');
    }

    // End the session
    gameplaySessionManager.endGameplaySession(
      voiceSessionId || `http_${sessionId}`,
      finalScore || session.final_score,
      boardPosition || session.final_board_position,
      status || 'completed'
    );

    // Get updated session
    const updatedSession = getSessionById(sessionId);

    res.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/session/active
 * Get child's active session (if any)
 */
router.get('/active', authenticateChild, (req: Request, res: Response, next: NextFunction) => {
  try {
    const childId = req.child!.child_id;
    const hasActive = gameplaySessionManager.hasActiveSession(childId);

    res.json({
      hasActiveSession: hasActive,
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Therapist Endpoints (require therapist authentication)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/session/therapist/active
 * Get all active sessions for therapist's children
 */
router.get('/therapist/active', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const therapistId = req.therapist!.therapist_id;
    const sessions = gameplaySessionManager.getActiveSessionsForTherapist(therapistId);

    res.json({
      sessions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/session/therapist/history
 * Get session history for therapist (optionally filtered by child)
 */
router.get('/therapist/history', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const therapistId = req.therapist!.therapist_id;
    const childId = req.query.childId ? parseInt(req.query.childId as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    let sessions;
    if (childId) {
      // Verify child belongs to therapist
      const child = getStudentById(childId);
      if (!child || child.therapist_id !== therapistId) {
        throw ApiError.notFound('Child not found');
      }
      sessions = getSessionHistoryByChild(childId, limit);
    } else {
      sessions = getSessionHistoryForTherapist(therapistId, limit);
    }

    // Add child names to sessions
    const enrichedSessions = sessions.map(session => {
      const child = getStudentById(session.child_id);
      return {
        ...session,
        child_name: child ? `${child.first_name} ${child.last_name}` : 'Unknown',
      };
    });

    res.json({
      sessions: enrichedSessions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/session/therapist/:id
 * Get detailed session with all responses
 */
router.get('/therapist/:id', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const therapistId = req.therapist!.therapist_id;
    const sessionId = parseInt(req.params.id);

    const data = getSessionWithResponses(sessionId);
    if (!data) {
      throw ApiError.notFound('Session not found');
    }

    // Verify session belongs to therapist's child
    if (data.session.therapist_id !== therapistId) {
      throw ApiError.forbidden('Not authorized to view this session');
    }

    // Get child info
    const child = getStudentById(data.session.child_id);

    // Parse JSON fields
    const enrichedSession = {
      ...data.session,
      categories_selected: JSON.parse(data.session.categories_selected),
      child_name: child ? `${child.first_name} ${child.last_name}` : 'Unknown',
    };

    const enrichedResponses = data.responses.map(response => ({
      ...response,
      signals_detected: response.signals_detected ? JSON.parse(response.signals_detected) : [],
      is_correct: Boolean(response.is_correct),
    }));

    res.json({
      session: {
        ...enrichedSession,
        responses: enrichedResponses,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
