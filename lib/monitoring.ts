/**
 * Simple logging utility for Next.js
 * Replacement for the original monitoring system
 */

export class Logger {
  constructor(private context: string) {}

  info(message: string, metadata?: any) {
    console.log(`[${this.context}] INFO: ${message}`, metadata || '');
  }

  debug(message: string, metadata?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.context}] DEBUG: ${message}`, metadata || '');
    }
  }

  warn(message: string, metadata?: any) {
    console.warn(`[${this.context}] WARN: ${message}`, metadata || '');
  }

  error(message: string, error?: Error | null, metadata?: any) {
    console.error(`[${this.context}] ERROR: ${message}`, {
      error: error?.message,
      stack: error?.stack,
      metadata
    });
  }
}