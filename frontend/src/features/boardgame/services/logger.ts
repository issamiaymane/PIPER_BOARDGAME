/**
 * Logger Utility
 * Centralized logging for voice services with configurable levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Default config - can be changed at runtime
const config: LoggerConfig = {
  enabled: true,
  minLevel: 'info' // Set to 'debug' for verbose logging
};

/**
 * Create a namespaced logger for a specific service
 */
function createLogger(namespace: string) {
  const prefix = `[${namespace}]`;

  const shouldLog = (level: LogLevel): boolean => {
    return config.enabled && LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
  };

  return {
    debug: (...args: unknown[]) => {
      if (shouldLog('debug')) {
        console.log(prefix, ...args);
      }
    },
    info: (...args: unknown[]) => {
      if (shouldLog('info')) {
        console.log(prefix, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (shouldLog('warn')) {
        console.warn(prefix, ...args);
      }
    },
    error: (...args: unknown[]) => {
      if (shouldLog('error')) {
        console.error(prefix, ...args);
      }
    }
  };
}

// Pre-created loggers for each service
export const voiceLogger = createLogger('Voice');
export const audioLogger = createLogger('Audio');
export const gameLogger = createLogger('Game');

// Config functions for runtime control
export const loggerConfig = {
  enable: () => { config.enabled = true; },
  disable: () => { config.enabled = false; },
  setLevel: (level: LogLevel) => { config.minLevel = level; }
};
