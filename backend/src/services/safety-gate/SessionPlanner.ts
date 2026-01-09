import { State, Level, SessionConfig } from "./types.js";

export class SessionPlanner {

  // ============================================
  // ADAPT SESSION CONFIGURATION
  // ============================================

  adaptSessionConfig(safetyLevel: Level): SessionConfig {
    // Start with baseline defaults (GREEN level settings)
    const config: SessionConfig = {
      promptIntensity: 2,
      avatarTone: 'warm',
      maxTaskTime: 60,
      inactivityTimeout: 30 // 30 seconds before "are you there?" prompt
    };

    // ============================================
    // ADAPT BASED ON SAFETY LEVEL
    // ============================================

    switch (safetyLevel) {

      // ============================================
      // RED LEVEL ADAPTATIONS
      // ============================================

      case Level.RED:
        config.promptIntensity = 0;
        // Why? Child in crisis - no prompting

        config.avatarTone = 'calm';
        // Why? Soothing tone only

        config.inactivityTimeout = 15;
        // Why? Check in quickly (15s) when child is in crisis
        // Faster check-ins show presence without being intrusive
        break;

      // ============================================
      // ORANGE LEVEL ADAPTATIONS
      // ============================================

      case Level.ORANGE:
        config.promptIntensity = 0;
        // Why? Minimal prompting - don't add pressure
        // Child is struggling significantly

        config.avatarTone = 'calm';
        // Why? Extra calm, not just warm
        // Need soothing approach

        config.maxTaskTime = 30;
        // Why? Shorten from 60s to 30s
        // Reduce sustained attention demand
        // Make success more achievable

        config.inactivityTimeout = 20;
        // Why? Shorter timeout (20s) when struggling
        // More frequent gentle check-ins without being pushy
        // Avoids collision with maxTaskTime (30s)
        break;

      // ============================================
      // YELLOW LEVEL ADAPTATIONS
      // ============================================

      case Level.YELLOW:
        config.promptIntensity = 1;
        // Why? Reduced from 2, but not to 0
        // Gentle guidance still appropriate

        config.avatarTone = 'calm';
        // Why? Shift from 'warm' to 'calm'
        // Early intervention in tone

        config.maxTaskTime = 45;
        // Why? Slightly shorter (60 -> 45)
        // Small adjustment, not drastic

        config.inactivityTimeout = 25;
        // Why? Slightly shorter (30 -> 25s)
        // Earlier check-in when showing signs of difficulty
        break;

      // ============================================
      // GREEN LEVEL (DEFAULT) - NO CHANGES
      // ============================================

      case Level.GREEN:
        // Keep defaults - no changes needed
        break;
    }

    return config;
  }

  // ============================================
  // SHOULD TRIGGER SCHEDULED BREAK?
  // ============================================

  shouldTriggerScheduledBreak(
    state: State,
    sessionDuration: number
  ): boolean {
    // Break every 1/3 of session
    const breakInterval = sessionDuration / 3;
    // Example: 450 second session (7.5 minutes)
    // breakInterval = 450 / 3 = 150 seconds
    // Breaks at: 150s (2.5 min), 300s (5 min)
    return state.timeSinceBreak >= breakInterval;
  }
}
