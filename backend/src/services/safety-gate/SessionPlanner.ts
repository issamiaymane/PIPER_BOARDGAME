import { ChildState, SafetyGateLevel, SessionConfig, InterventionType, Choice } from "./types.js";

export class SessionPlanner {

  // ============================================
  // ADAPT SESSION CONFIGURATION
  // ============================================

  adaptSessionConfig(
    safetyLevel: SafetyGateLevel,
    interventions: InterventionType[],
    state: ChildState
  ): SessionConfig {
    // Start with baseline defaults (GREEN level settings)
    const config: SessionConfig = {
      prompt_intensity: 2,
      avatar_tone: 'warm',
      max_retries: 2,
      max_task_time: 60,
      allow_skip: false,
      show_visual_cues: true,
      enable_audio_support: false,
      grownup_help_available: false,
      show_bubble_breathing: false
    };

    // ============================================
    // ADAPT BASED ON SAFETY LEVEL
    // ============================================

    switch (safetyLevel) {

      // ============================================
      // RED LEVEL ADAPTATIONS
      // ============================================

      case SafetyGateLevel.RED:
        config.prompt_intensity = 0;
        // Why? Child in crisis - no prompting

        config.avatar_tone = 'calm';
        // Why? Soothing tone only

        config.max_retries = 0;
        // Why? Don't continue task at all

        config.grownup_help_available = true;
        // Why? Adult needed immediately
        break;

      // ============================================
      // ORANGE LEVEL ADAPTATIONS
      // ============================================

      case SafetyGateLevel.ORANGE:
        config.prompt_intensity = 0;
        // Why? Minimal prompting - don't add pressure
        // Child is struggling significantly

        config.avatar_tone = 'calm';
        // Why? Extra calm, not just warm
        // Need soothing approach

        config.max_retries = 1;
        // Why? Only one more try allowed
        // Don't force repeated attempts when struggling
        // After 1 more try, move on

        config.max_task_time = 30;
        // Why? Shorten from 60s to 30s
        // Reduce sustained attention demand
        // Make success more achievable

        config.show_visual_cues = true;
        // Why? Keep visual support on
        // Maximum UDL supports

        config.enable_audio_support = true;
        // Why? Turn on audio help
        // Multiple modalities = better chance of success

        config.grownup_help_available = true;
        // Why? Adult may be needed soon
        // Proactive availability
        break;

      // ============================================
      // YELLOW LEVEL ADAPTATIONS
      // ============================================

      case SafetyGateLevel.YELLOW:
        config.prompt_intensity = 1;
        // Why? Reduced from 2, but not to 0
        // Gentle guidance still appropriate

        config.avatar_tone = 'calm';
        // Why? Shift from 'warm' to 'calm'
        // Early intervention in tone

        config.max_task_time = 45;
        // Why? Slightly shorter (60 -> 45)
        // Small adjustment, not drastic
        break;

      // ============================================
      // GREEN LEVEL (DEFAULT) - NO CHANGES
      // ============================================

      case SafetyGateLevel.GREEN:
        // Keep defaults - no changes needed
        break;
    }

    // ============================================
    // APPLY SPECIFIC INTERVENTIONS
    // ============================================

    // These apply regardless of safety level
    // They're based on specific interventions selected

    if (interventions.includes(InterventionType.ALLOW_SKIP)) {
      config.allow_skip = true;
      // Enables "Try different card" choice
      // Could be YELLOW or ORANGE level
    }

    if (interventions.includes(InterventionType.BUBBLE_BREATHING)) {
      config.show_bubble_breathing = true;
      // Makes bubble breathing a visible choice
      // Typically ORANGE level
    }

    if (interventions.includes(InterventionType.SHORTEN_TASK)) {
      config.max_task_time = Math.min(config.max_task_time, 45);
      // Ensures task is shortened even further if needed
      // Math.min: take whichever is shorter
      // Example: If already 30 (ORANGE), stays 30
      //          If 60 (YELLOW), becomes 45
    }

    return config;
  }

  // ============================================
  // BUILD CHOICES
  // ============================================

  buildChoices(
    interventions: InterventionType[],
    config: SessionConfig,
    safetyLevel: SafetyGateLevel = SafetyGateLevel.GREEN
  ): Choice[] {
    const choices: Choice[] = [];

    // ============================================
    // CHOICE 1: Regulation Activity (if needed)
    // ============================================

    if (config.show_bubble_breathing) {
      choices.push({
        id: 'bubble_breathing',
        label: 'Take calming breaths',
        icon: '🫧',
        action: 'START_REGULATION_ACTIVITY',
        priority: 1
      });
    }

    // ============================================
    // CHOICE 2: Skip Task (if allowed)
    // ============================================

    if (config.allow_skip) {
      choices.push({
        id: 'skip_task',
        label: 'Try a different card',
        icon: '⭐',
        action: 'SWITCH_ACTIVITY',
        priority: 2
      });
    }

    // ============================================
    // CHOICE 3: Retry (always available)
    // ============================================

    choices.push({
      id: 'retry',
      label: 'Try again',
      icon: '🔄',
      action: 'RETRY_TASK',
      priority: 3
    });

    // ============================================
    // CHOICE 4: Break (ORANGE+ only)
    // YELLOW level: only retry and skip options
    // ============================================

    if (safetyLevel >= SafetyGateLevel.ORANGE) {
      choices.push({
        id: 'break',
        label: 'Take a break',
        icon: '🎵',
        action: 'START_BREAK',
        priority: 4
      });
    }

    // ============================================
    // CHOICE 5: Grownup Help (if available)
    // ============================================

    if (config.grownup_help_available) {
      choices.push({
        id: 'grownup_help',
        label: 'Ask grownup for help',
        icon: '👋',
        action: 'CALL_GROWNUP',
        priority: 5
      });
    }

    // Sort by priority and return
    return choices.sort((a, b) => a.priority - b.priority);
  }

  // ============================================
  // SHOULD TRIGGER SCHEDULED BREAK?
  // ============================================

  shouldTriggerScheduledBreak(
    state: ChildState,
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
