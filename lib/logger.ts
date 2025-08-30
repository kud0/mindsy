/**
 * Simple logging utility for development
 * Suppresses logs in production unless critical
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  // Always log critical errors
  error: (message: string, ...args: any[]) => {
    console.error(message, ...args);
  },

  // Only log warnings in development
  warn: (message: string, ...args: any[]) => {
    if (isDev) {
      console.warn(message, ...args);
    }
  },

  // Only log info in development
  info: (message: string, ...args: any[]) => {
    if (isDev) {
      console.log(message, ...args);
    }
  },

  // Only log debug in development
  debug: (message: string, ...args: any[]) => {
    if (isDev) {
      console.log(message, ...args);
    }
  }
};