/**
 * OAuth Error Handler
 * 
 * Comprehensive error handling for OAuth flows including:
 * - GitHub OAuth specific errors
 * - User-friendly error messages
 * - Retry logic for transient errors
 * - Error recovery strategies
 */

import { OAuthError, OAuthErrorType } from './oauth-security';
import { AppError, ErrorType, logError } from './error-handling';

/**
 * OAuth flow error context
 */
export interface OAuthErrorContext {
  flow: 'sign_in' | 'link_account' | 'refresh_token' | 'profile_sync';
  provider: string;
  userId?: string;
  step?: string;
  attempt?: number;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * OAuth error recovery result
 */
export interface OAuthErrorRecovery {
  canRecover: boolean;
  recoveryAction?: 'retry' | 'refresh_token' | 'reauthorize' | 'manual_intervention';
  retryAfter?: number; // seconds
  userMessage: string;
  technicalMessage?: string;
}

/**
 * User-friendly error messages for different locales
 */
const ERROR_MESSAGES = {
  en: {
    [OAuthErrorType.INVALID_TOKEN]: 'Your GitHub connection has expired. Please sign in again.',
    [OAuthErrorType.EXPIRED_TOKEN]: 'Your GitHub session has expired. Please reconnect your account.',
    [OAuthErrorType.REVOKED_TOKEN]: 'GitHub access has been revoked. Please reconnect your account.',
    [OAuthErrorType.RATE_LIMITED]: 'Too many requests to GitHub. Please try again in a few minutes.',
    [OAuthErrorType.NETWORK_ERROR]: 'Connection error. Please check your internet connection and try again.',
    [OAuthErrorType.PROVIDER_ERROR]: 'GitHub is currently unavailable. Please try again later.',
    [OAuthErrorType.ENCRYPTION_ERROR]: 'Security error occurred. Please contact support.',
    [OAuthErrorType.ACCOUNT_LINKING_ERROR]: 'Unable to link GitHub account. Please try again or contact support.',
    [OAuthErrorType.INSUFFICIENT_PERMISSIONS]: 'GitHub account does not have required permissions. Please check your GitHub settings.',
    default: 'An error occurred with GitHub authentication. Please try again.'
  },
  es: {
    [OAuthErrorType.INVALID_TOKEN]: 'Tu conexión con GitHub ha expirado. Por favor, inicia sesión nuevamente.',
    [OAuthErrorType.EXPIRED_TOKEN]: 'Tu sesión de GitHub ha expirado. Por favor, reconecta tu cuenta.',
    [OAuthErrorType.REVOKED_TOKEN]: 'El acceso a GitHub ha sido revocado. Por favor, reconecta tu cuenta.',
    [OAuthErrorType.RATE_LIMITED]: 'Demasiadas solicitudes a GitHub. Por favor, inténtalo de nuevo en unos minutos.',
    [OAuthErrorType.NETWORK_ERROR]: 'Error de conexión. Por favor, verifica tu conexión a internet e inténtalo de nuevo.',
    [OAuthErrorType.PROVIDER_ERROR]: 'GitHub no está disponible actualmente. Por favor, inténtalo más tarde.',
    [OAuthErrorType.ENCRYPTION_ERROR]: 'Ocurrió un error de seguridad. Por favor, contacta al soporte.',
    [OAuthErrorType.ACCOUNT_LINKING_ERROR]: 'No se pudo vincular la cuenta de GitHub. Por favor, inténtalo de nuevo o contacta al soporte.',
    [OAuthErrorType.INSUFFICIENT_PERMISSIONS]: 'La cuenta de GitHub no tiene los permisos requeridos. Por favor, verifica tu configuración de GitHub.',
    default: 'Ocurrió un error con la autenticación de GitHub. Por favor, inténtalo de nuevo.'
  }
};

/**
 * OAuth Error Handler class
 */
export class OAuthErrorHandler {
  /**
   * Handle OAuth errors with context and recovery options
   */
  static handleError(
    error: Error | OAuthError,
    context: OAuthErrorContext,
    locale: string = 'en'
  ): OAuthErrorRecovery {
    // Log the error with context
    logError(error, { 
      oauthContext: context,
      timestamp: new Date().toISOString()
    });
    
    // Convert to OAuthError if needed
    const oauthError = this.normalizeError(error, context);
    
    // Determine recovery strategy
    const recovery = this.determineRecovery(oauthError, context);
    
    // Get user-friendly message
    const userMessage = this.getUserMessage(oauthError, locale);
    
    return {
      ...recovery,
      userMessage,
      technicalMessage: oauthError.message
    };
  }
  
  /**
   * Convert any error to OAuthError with proper classification
   */
  private static normalizeError(error: Error | OAuthError, context: OAuthErrorContext): OAuthError {
    if (error instanceof OAuthError) {
      return error;
    }
    
    // Classify error based on message and context
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('jwt') || errorMessage.includes('token') || errorMessage.includes('expired')) {
      return new OAuthError(
        error.message,
        OAuthErrorType.EXPIRED_TOKEN,
        context.provider,
        401
      );
    }
    
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return new OAuthError(
        error.message,
        OAuthErrorType.RATE_LIMITED,
        context.provider,
        429
      );
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return new OAuthError(
        error.message,
        OAuthErrorType.NETWORK_ERROR,
        context.provider,
        503
      );
    }
    
    if (errorMessage.includes('revoked') || errorMessage.includes('unauthorized')) {
      return new OAuthError(
        error.message,
        OAuthErrorType.REVOKED_TOKEN,
        context.provider,
        401
      );
    }
    
    if (errorMessage.includes('permission') || errorMessage.includes('scope')) {
      return new OAuthError(
        error.message,
        OAuthErrorType.INSUFFICIENT_PERMISSIONS,
        context.provider,
        403
      );
    }
    
    if (errorMessage.includes('encrypt') || errorMessage.includes('decrypt')) {
      return new OAuthError(
        error.message,
        OAuthErrorType.ENCRYPTION_ERROR,
        context.provider,
        500
      );
    }
    
    if (context.flow === 'link_account') {
      return new OAuthError(
        error.message,
        OAuthErrorType.ACCOUNT_LINKING_ERROR,
        context.provider,
        400
      );
    }
    
    // Default to provider error
    return new OAuthError(
      error.message,
      OAuthErrorType.PROVIDER_ERROR,
      context.provider,
      500
    );
  }
  
  /**
   * Determine recovery strategy based on error type and context
   */
  private static determineRecovery(error: OAuthError, context: OAuthErrorContext): Omit<OAuthErrorRecovery, 'userMessage'> {
    const attempt = context.attempt || 1;
    const maxRetries = 3;
    
    switch (error.oauthErrorType) {
      case OAuthErrorType.NETWORK_ERROR:
        if (attempt < maxRetries) {
          return {
            canRecover: true,
            recoveryAction: 'retry',
            retryAfter: Math.min(Math.pow(2, attempt), 30) // Exponential backoff, max 30s
          };
        }
        return { canRecover: false };
      
      case OAuthErrorType.RATE_LIMITED:
        return {
          canRecover: true,
          recoveryAction: 'retry',
          retryAfter: 300 // 5 minutes for rate limits
        };
      
      case OAuthErrorType.EXPIRED_TOKEN:
        if (context.flow === 'refresh_token') {
          // If refresh failed, need reauthorization
          return {
            canRecover: true,
            recoveryAction: 'reauthorize'
          };
        }
        return {
          canRecover: true,
          recoveryAction: 'refresh_token'
        };
      
      case OAuthErrorType.INVALID_TOKEN:
      case OAuthErrorType.REVOKED_TOKEN:
        return {
          canRecover: true,
          recoveryAction: 'reauthorize'
        };
      
      case OAuthErrorType.PROVIDER_ERROR:
        if (attempt < maxRetries) {
          return {
            canRecover: true,
            recoveryAction: 'retry',
            retryAfter: 60 // 1 minute for provider errors
          };
        }
        return { canRecover: false };
      
      case OAuthErrorType.INSUFFICIENT_PERMISSIONS:
        return {
          canRecover: true,
          recoveryAction: 'reauthorize'
        };
      
      case OAuthErrorType.ENCRYPTION_ERROR:
      case OAuthErrorType.ACCOUNT_LINKING_ERROR:
        return {
          canRecover: false,
          recoveryAction: 'manual_intervention'
        };
      
      default:
        return { canRecover: false };
    }
  }
  
  /**
   * Get user-friendly error message
   */
  private static getUserMessage(error: OAuthError, locale: string = 'en'): string {
    const messages = ERROR_MESSAGES[locale as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.en;
    return messages[error.oauthErrorType] || messages.default;
  }
  
  /**
   * Handle GitHub API specific errors
   */
  static handleGitHubApiError(response: Response, context: OAuthErrorContext): OAuthError {
    const status = response.status;
    
    switch (status) {
      case 401:
        return new OAuthError(
          'GitHub authentication failed',
          OAuthErrorType.INVALID_TOKEN,
          'github',
          401
        );
      
      case 403:
        if (response.headers.get('x-ratelimit-remaining') === '0') {
          const resetTime = response.headers.get('x-ratelimit-reset');
          const retryAfter = resetTime ? parseInt(resetTime) - Math.floor(Date.now() / 1000) : 3600;
          
          return new OAuthError(
            'GitHub API rate limit exceeded',
            OAuthErrorType.RATE_LIMITED,
            'github',
            429,
            { retryAfter }
          );
        }
        
        return new OAuthError(
          'Insufficient GitHub permissions',
          OAuthErrorType.INSUFFICIENT_PERMISSIONS,
          'github',
          403
        );
      
      case 404:
        return new OAuthError(
          'GitHub resource not found',
          OAuthErrorType.PROVIDER_ERROR,
          'github',
          404
        );
      
      case 422:
        return new OAuthError(
          'Invalid GitHub request',
          OAuthErrorType.PROVIDER_ERROR,
          'github',
          422
        );
      
      case 500:
      case 502:
      case 503:
      case 504:
        return new OAuthError(
          'GitHub service unavailable',
          OAuthErrorType.PROVIDER_ERROR,
          'github',
          503
        );
      
      default:
        return new OAuthError(
          `GitHub API error: ${status}`,
          OAuthErrorType.PROVIDER_ERROR,
          'github',
          status
        );
    }
  }
  
  /**
   * Create retry function with exponential backoff
   */
  static createRetryFunction<T>(
    operation: () => Promise<T>,
    context: OAuthErrorContext,
    maxRetries: number = 3
  ): () => Promise<T> {
    return async (): Promise<T> => {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          
          const errorRecovery = this.handleError(lastError, {
            ...context,
            attempt
          });
          
          // If we can't recover or this is the last attempt, throw
          if (!errorRecovery.canRecover || attempt === maxRetries) {
            throw lastError;
          }
          
          // If recovery suggests retry, wait and continue
          if (errorRecovery.recoveryAction === 'retry' && errorRecovery.retryAfter) {
            await new Promise(resolve => setTimeout(resolve, errorRecovery.retryAfter! * 1000));
          } else {
            // For non-retry recovery actions, throw immediately
            throw lastError;
          }
        }
      }
      
      throw lastError!;
    };
  }
  
  /**
   * Validate OAuth state parameter to prevent CSRF attacks
   */
  static validateOAuthState(receivedState: string, expectedState: string): boolean {
    if (!receivedState || !expectedState) {
      return false;
    }
    
    // Use constant-time comparison to prevent timing attacks
    if (receivedState.length !== expectedState.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < receivedState.length; i++) {
      result |= receivedState.charCodeAt(i) ^ expectedState.charCodeAt(i);
    }
    
    return result === 0;
  }
  
  /**
   * Generate secure OAuth state parameter
   */
  static generateOAuthState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}