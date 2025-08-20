/**
 * Authentication Error Handler and Recovery System
 * 
 * Comprehensive error handling for Supabase authentication failures including:
 * - Specific error classification and handling
 * - Automatic session recovery mechanisms
 * - User-friendly error messages
 * - Debugging utilities
 * - Recovery strategies for different error types
 */

import type { AuthError, Session, User } from '@supabase/supabase-js';
import { logError } from './error-handling';
import { AuthCookieManager } from './auth-cookie-manager';
import { supabase } from './supabase';
import { BrowserCompatibility, NetworkResilience } from './browser-compatibility';

/**
 * Authentication error types for classification
 */
export enum AuthErrorType {
  // Session-related errors
  SESSION_EXPIRED = 'session_expired',
  SESSION_INVALID = 'session_invalid',
  SESSION_CORRUPTED = 'session_corrupted',
  SESSION_MISMATCH = 'session_mismatch',
  
  // Cookie-related errors
  COOKIE_SYNC_FAILED = 'cookie_sync_failed',
  COOKIE_INVALID = 'cookie_invalid',
  COOKIE_MISSING = 'cookie_missing',
  COOKIES_DISABLED = 'cookies_disabled',
  
  // Authentication flow errors
  LOGIN_FAILED = 'login_failed',
  SIGNUP_FAILED = 'signup_failed',
  LOGOUT_FAILED = 'logout_failed',
  PASSWORD_RESET_FAILED = 'password_reset_failed',
  
  // OAuth-specific errors
  OAUTH_CALLBACK_FAILED = 'oauth_callback_failed',
  OAUTH_STATE_MISMATCH = 'oauth_state_mismatch',
  OAUTH_PROVIDER_ERROR = 'oauth_provider_error',
  
  // Network and connectivity errors
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  CONNECTION_ERROR = 'connection_error',
  OFFLINE_ERROR = 'offline_error',
  
  // Browser compatibility errors
  BROWSER_UNSUPPORTED = 'browser_unsupported',
  STORAGE_UNAVAILABLE = 'storage_unavailable',
  MOBILE_SPECIFIC_ERROR = 'mobile_specific_error',
  
  // Validation errors
  INVALID_CREDENTIALS = 'invalid_credentials',
  INVALID_EMAIL = 'invalid_email',
  WEAK_PASSWORD = 'weak_password',
  EMAIL_NOT_CONFIRMED = 'email_not_confirmed',
  
  // Rate limiting
  RATE_LIMITED = 'rate_limited',
  TOO_MANY_REQUESTS = 'too_many_requests',
  
  // Unknown/generic errors
  UNKNOWN_ERROR = 'unknown_error',
  INTERNAL_ERROR = 'internal_error'
}

/**
 * Authentication error context for debugging and recovery
 */
export interface AuthErrorContext {
  operation: 'login' | 'signup' | 'logout' | 'session_validation' | 'oauth_callback' | 'password_reset' | 'session_recovery';
  userAgent?: string;
  timestamp: number;
  retryCount: number;
  sessionExists?: boolean;
  cookiesValid?: boolean;
  userId?: string;
  email?: string;
  provider?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

/**
 * Authentication error recovery result
 */
export interface AuthErrorRecovery {
  canRecover: boolean;
  recoveryAction?: 'retry' | 'refresh_session' | 'clear_state' | 'reauth_required' | 'manual_intervention';
  retryAfter?: number; // seconds
  maxRetries?: number;
  userMessage: string;
  technicalMessage?: string;
  debugInfo?: Record<string, any>;
}

/**
 * Session recovery result
 */
export interface SessionRecoveryResult {
  success: boolean;
  session?: Session;
  user?: User;
  error?: string;
  recoveryMethod?: 'refresh' | 'revalidate' | 'clear_and_restart';
  debugInfo?: Record<string, any>;
}

/**
 * Authentication state diagnosis
 */
export interface AuthStateDiagnosis {
  supabaseSessionExists: boolean;
  supabaseSessionValid: boolean;
  cookiesExist: boolean;
  cookiesValid: boolean;
  localStateValid: boolean;
  stateConsistent: boolean;
  issues: string[];
  recommendations: string[];
  debugData: Record<string, any>;
}

/**
 * User-friendly error messages for different locales
 */
const ERROR_MESSAGES = {
  en: {
    [AuthErrorType.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
    [AuthErrorType.SESSION_INVALID]: 'Your session is invalid. Please sign in again.',
    [AuthErrorType.SESSION_CORRUPTED]: 'Your session data is corrupted. Please sign in again.',
    [AuthErrorType.SESSION_MISMATCH]: 'Session mismatch detected. Please sign in again.',
    [AuthErrorType.COOKIE_SYNC_FAILED]: 'Failed to synchronize your session. Please try again.',
    [AuthErrorType.COOKIE_INVALID]: 'Invalid session cookies. Please sign in again.',
    [AuthErrorType.COOKIE_MISSING]: 'Session cookies are missing. Please sign in again.',
    [AuthErrorType.COOKIES_DISABLED]: 'Cookies are disabled in your browser. Please enable cookies or use a different browser.',
    [AuthErrorType.LOGIN_FAILED]: 'Login failed. Please check your credentials and try again.',
    [AuthErrorType.SIGNUP_FAILED]: 'Account creation failed. Please try again.',
    [AuthErrorType.LOGOUT_FAILED]: 'Logout failed. Please try again.',
    [AuthErrorType.PASSWORD_RESET_FAILED]: 'Password reset failed. Please try again.',
    [AuthErrorType.OAUTH_CALLBACK_FAILED]: 'OAuth authentication failed. Please try again.',
    [AuthErrorType.OAUTH_STATE_MISMATCH]: 'OAuth security validation failed. Please try again.',
    [AuthErrorType.OAUTH_PROVIDER_ERROR]: 'OAuth provider error. Please try again later.',
    [AuthErrorType.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
    [AuthErrorType.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
    [AuthErrorType.CONNECTION_ERROR]: 'Connection error. Please check your internet connection.',
    [AuthErrorType.OFFLINE_ERROR]: 'You appear to be offline. Please check your internet connection and try again.',
    [AuthErrorType.BROWSER_UNSUPPORTED]: 'Your browser may not be fully supported. Please try a more recent browser version.',
    [AuthErrorType.STORAGE_UNAVAILABLE]: 'Browser storage is unavailable. Please check your privacy settings.',
    [AuthErrorType.MOBILE_SPECIFIC_ERROR]: 'There was an issue with the mobile authentication flow. Please try again.',
    [AuthErrorType.INVALID_CREDENTIALS]: 'Invalid email or password. Please check your credentials.',
    [AuthErrorType.INVALID_EMAIL]: 'Please enter a valid email address.',
    [AuthErrorType.WEAK_PASSWORD]: 'Password is too weak. Please choose a stronger password.',
    [AuthErrorType.EMAIL_NOT_CONFIRMED]: 'Please confirm your email address before signing in.',
    [AuthErrorType.RATE_LIMITED]: 'Too many attempts. Please wait a moment and try again.',
    [AuthErrorType.TOO_MANY_REQUESTS]: 'Too many requests. Please wait a few minutes and try again.',
    [AuthErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
    [AuthErrorType.INTERNAL_ERROR]: 'Internal error. Please contact support if this persists.'
  },
  es: {
    [AuthErrorType.SESSION_EXPIRED]: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
    [AuthErrorType.SESSION_INVALID]: 'Tu sesión es inválida. Por favor, inicia sesión nuevamente.',
    [AuthErrorType.SESSION_CORRUPTED]: 'Los datos de tu sesión están corruptos. Por favor, inicia sesión nuevamente.',
    [AuthErrorType.SESSION_MISMATCH]: 'Discrepancia de sesión detectada. Por favor, inicia sesión nuevamente.',
    [AuthErrorType.COOKIE_SYNC_FAILED]: 'Error al sincronizar tu sesión. Por favor, inténtalo de nuevo.',
    [AuthErrorType.COOKIE_INVALID]: 'Cookies de sesión inválidas. Por favor, inicia sesión nuevamente.',
    [AuthErrorType.COOKIE_MISSING]: 'Faltan las cookies de sesión. Por favor, inicia sesión nuevamente.',
    [AuthErrorType.COOKIES_DISABLED]: 'Las cookies están desactivadas en tu navegador. Por favor, activa las cookies o usa un navegador diferente.',
    [AuthErrorType.LOGIN_FAILED]: 'Error al iniciar sesión. Por favor, verifica tus credenciales e inténtalo de nuevo.',
    [AuthErrorType.SIGNUP_FAILED]: 'Error al crear la cuenta. Por favor, inténtalo de nuevo.',
    [AuthErrorType.LOGOUT_FAILED]: 'Error al cerrar sesión. Por favor, inténtalo de nuevo.',
    [AuthErrorType.PASSWORD_RESET_FAILED]: 'Error al restablecer la contraseña. Por favor, inténtalo de nuevo.',
    [AuthErrorType.OAUTH_CALLBACK_FAILED]: 'Error de autenticación OAuth. Por favor, inténtalo de nuevo.',
    [AuthErrorType.OAUTH_STATE_MISMATCH]: 'Error de validación de seguridad OAuth. Por favor, inténtalo de nuevo.',
    [AuthErrorType.OAUTH_PROVIDER_ERROR]: 'Error del proveedor OAuth. Por favor, inténtalo más tarde.',
    [AuthErrorType.NETWORK_ERROR]: 'Error de red. Por favor, verifica tu conexión e inténtalo de nuevo.',
    [AuthErrorType.TIMEOUT_ERROR]: 'Tiempo de espera agotado. Por favor, inténtalo de nuevo.',
    [AuthErrorType.CONNECTION_ERROR]: 'Error de conexión. Por favor, verifica tu conexión a internet.',
    [AuthErrorType.OFFLINE_ERROR]: 'Parece que estás sin conexión. Por favor, verifica tu conexión a internet e inténtalo de nuevo.',
    [AuthErrorType.BROWSER_UNSUPPORTED]: 'Es posible que tu navegador no sea totalmente compatible. Por favor, prueba con una versión más reciente del navegador.',
    [AuthErrorType.STORAGE_UNAVAILABLE]: 'El almacenamiento del navegador no está disponible. Por favor, verifica tu configuración de privacidad.',
    [AuthErrorType.MOBILE_SPECIFIC_ERROR]: 'Hubo un problema con el flujo de autenticación móvil. Por favor, inténtalo de nuevo.',
    [AuthErrorType.INVALID_CREDENTIALS]: 'Email o contraseña inválidos. Por favor, verifica tus credenciales.',
    [AuthErrorType.INVALID_EMAIL]: 'Por favor, ingresa una dirección de email válida.',
    [AuthErrorType.WEAK_PASSWORD]: 'La contraseña es muy débil. Por favor, elige una contraseña más fuerte.',
    [AuthErrorType.EMAIL_NOT_CONFIRMED]: 'Por favor, confirma tu dirección de email antes de iniciar sesión.',
    [AuthErrorType.RATE_LIMITED]: 'Demasiados intentos. Por favor, espera un momento e inténtalo de nuevo.',
    [AuthErrorType.TOO_MANY_REQUESTS]: 'Demasiadas solicitudes. Por favor, espera unos minutos e inténtalo de nuevo.',
    [AuthErrorType.UNKNOWN_ERROR]: 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.',
    [AuthErrorType.INTERNAL_ERROR]: 'Error interno. Por favor, contacta al soporte si esto persiste.'
  }
};

/**
 * Authentication Error Handler class
 */
export class AuthErrorHandler {
  /**
   * Handle authentication errors with context and recovery options
   */
  static handleError(
    error: Error | AuthError,
    context: AuthErrorContext,
    locale: string = 'en'
  ): AuthErrorRecovery {
    // Log the error with context
    logError(error, { 
      authContext: context,
      timestamp: new Date().toISOString()
    });
    
    // Classify the error
    const errorType = this.classifyError(error, context);
    
    // Determine recovery strategy
    const recovery = this.determineRecovery(errorType, context);
    
    // Get user-friendly message
    const userMessage = this.getUserMessage(errorType, locale);
    
    return {
      ...recovery,
      userMessage,
      technicalMessage: error.message,
      debugInfo: {
        errorType,
        originalError: error.name,
        context
      }
    };
  }
  
  /**
   * Classify error based on message, type, and context
   */
  private static classifyError(error: Error | AuthError, context: AuthErrorContext): AuthErrorType {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name?.toLowerCase() || '';
    
    // Check if browser is offline first
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      return AuthErrorType.OFFLINE_ERROR;
    }
    
    // Network and connectivity errors (check first to avoid being overridden by operation-specific logic)
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorName.includes('networkerror')) {
      return AuthErrorType.NETWORK_ERROR;
    }
    
    if (errorMessage.includes('timeout') || errorName.includes('timeouterror')) {
      return AuthErrorType.TIMEOUT_ERROR;
    }
    
    if (errorMessage.includes('connection') || errorMessage.includes('connect')) {
      return AuthErrorType.CONNECTION_ERROR;
    }
    
    // Browser compatibility issues
    if (typeof window !== 'undefined') {
      const browserInfo = BrowserCompatibility.getBrowserInfo();
      
      // Check for cookie issues
      if (!browserInfo.supportsCookies || errorMessage.includes('cookie') || errorMessage.includes('cookies disabled')) {
        return AuthErrorType.COOKIES_DISABLED;
      }
      
      // Check for unsupported browser
      if (!BrowserCompatibility.isBrowserSupported()) {
        return AuthErrorType.BROWSER_UNSUPPORTED;
      }
      
      // Check for storage issues
      if ((!browserInfo.supportsLocalStorage && !browserInfo.supportsSessionStorage) || 
          errorMessage.includes('storage') || errorMessage.includes('quota')) {
        return AuthErrorType.STORAGE_UNAVAILABLE;
      }
      
      // Mobile-specific issues
      if (browserInfo.isMobile && (
          errorMessage.includes('mobile') || 
          errorMessage.includes('touch') || 
          errorMessage.includes('ios') || 
          errorMessage.includes('android'))) {
        return AuthErrorType.MOBILE_SPECIFIC_ERROR;
      }
    }
    
    // Rate limiting (check early to avoid being overridden)
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      if (errorMessage.includes('requests')) {
        return AuthErrorType.TOO_MANY_REQUESTS;
      }
      return AuthErrorType.RATE_LIMITED;
    }
    
    // Session-related errors
    if (errorMessage.includes('jwt') || errorMessage.includes('expired') || errorMessage.includes('token') || errorMessage.includes('session')) {
      if (errorMessage.includes('expired')) {
        return AuthErrorType.SESSION_EXPIRED;
      }
      if (errorMessage.includes('invalid') || errorMessage.includes('malformed')) {
        return AuthErrorType.SESSION_INVALID;
      }
      if (errorMessage.includes('corrupted') || errorMessage.includes('corrupt')) {
        return AuthErrorType.SESSION_CORRUPTED;
      }
      return AuthErrorType.SESSION_CORRUPTED;
    }
    
    // Cookie-related errors
    if (errorMessage.includes('cookie') || context.cookiesValid === false) {
      if (errorMessage.includes('sync')) {
        return AuthErrorType.COOKIE_SYNC_FAILED;
      }
      if (errorMessage.includes('invalid')) {
        return AuthErrorType.COOKIE_INVALID;
      }
      return AuthErrorType.COOKIE_MISSING;
    }
    
    // OAuth-specific errors
    if (context.operation === 'oauth_callback') {
      if (errorMessage.includes('state') || errorMessage.includes('csrf')) {
        return AuthErrorType.OAUTH_STATE_MISMATCH;
      }
      if (errorMessage.includes('provider') || errorMessage.includes('github') || errorMessage.includes('oauth')) {
        return AuthErrorType.OAUTH_PROVIDER_ERROR;
      }
      return AuthErrorType.OAUTH_CALLBACK_FAILED;
    }
    
    // Check for specific HTTP status codes if available
    const status = (error as any).status || (error as any).statusCode;
    if (status) {
      switch (status) {
        case 401:
          return AuthErrorType.INVALID_CREDENTIALS;
        case 429:
          return AuthErrorType.RATE_LIMITED;
        case 500:
        case 502:
        case 503:
        case 504:
          return AuthErrorType.INTERNAL_ERROR;
        case 408:
          return AuthErrorType.TIMEOUT_ERROR;
      }
    }
    
    // Authentication flow errors (check after network/rate limiting)
    if (context.operation === 'login') {
      if (errorMessage.includes('invalid_credentials') || errorMessage.includes('invalid login')) {
        return AuthErrorType.INVALID_CREDENTIALS;
      }
      if (errorMessage.includes('email_not_confirmed')) {
        return AuthErrorType.EMAIL_NOT_CONFIRMED;
      }
      return AuthErrorType.LOGIN_FAILED;
    }
    
    if (context.operation === 'signup') {
      if (errorMessage.includes('email') && errorMessage.includes('invalid')) {
        return AuthErrorType.INVALID_EMAIL;
      }
      if (errorMessage.includes('password') && (errorMessage.includes('weak') || errorMessage.includes('short'))) {
        return AuthErrorType.WEAK_PASSWORD;
      }
      return AuthErrorType.SIGNUP_FAILED;
    }
    
    if (context.operation === 'logout') {
      return AuthErrorType.LOGOUT_FAILED;
    }
    
    if (context.operation === 'password_reset') {
      return AuthErrorType.PASSWORD_RESET_FAILED;
    }
    
    // Default classification
    if (errorName.includes('error') && !errorMessage.includes('unknown')) {
      return AuthErrorType.INTERNAL_ERROR;
    }
    
    return AuthErrorType.UNKNOWN_ERROR;
  }
  
  /**
   * Determine recovery strategy based on error type and context
   */
  private static determineRecovery(errorType: AuthErrorType, context: AuthErrorContext): Omit<AuthErrorRecovery, 'userMessage' | 'technicalMessage' | 'debugInfo'> {
    const attempt = context.retryCount || 1;
    const maxRetries = 3;
    
    switch (errorType) {
      case AuthErrorType.OFFLINE_ERROR:
        // For offline errors, wait until online before retrying
        return {
          canRecover: true,
          recoveryAction: 'retry',
          retryAfter: 5, // Check again in 5 seconds
          maxRetries: 12 // Try for up to 1 minute (12 * 5s)
        };
        
      case AuthErrorType.NETWORK_ERROR:
      case AuthErrorType.CONNECTION_ERROR:
      case AuthErrorType.TIMEOUT_ERROR:
        if (attempt < maxRetries) {
          // Use exponential backoff with jitter for network issues
          const baseDelay = Math.min(Math.pow(2, attempt), 30);
          const jitter = baseDelay * 0.2 * Math.random(); // Add up to 20% jitter
          
          return {
            canRecover: true,
            recoveryAction: 'retry',
            retryAfter: baseDelay + jitter,
            maxRetries
          };
        }
        return { canRecover: false };
        
      case AuthErrorType.COOKIES_DISABLED:
      case AuthErrorType.STORAGE_UNAVAILABLE:
        // These require user intervention, can't auto-recover
        return { 
          canRecover: false,
          recoveryAction: 'manual_intervention'
        };
        
      case AuthErrorType.BROWSER_UNSUPPORTED:
        // Can't recover automatically, user needs to switch browsers
        return { 
          canRecover: false,
          recoveryAction: 'manual_intervention'
        };
        
      case AuthErrorType.MOBILE_SPECIFIC_ERROR:
        // For mobile-specific issues, try a few times with longer delays
        if (attempt < 2) {
          return {
            canRecover: true,
            recoveryAction: 'retry',
            retryAfter: 3,
            maxRetries: 2
          };
        }
        return { canRecover: false };
      
      case AuthErrorType.RATE_LIMITED:
      case AuthErrorType.TOO_MANY_REQUESTS:
        return {
          canRecover: true,
          recoveryAction: 'retry',
          retryAfter: errorType === AuthErrorType.TOO_MANY_REQUESTS ? 300 : 60, // 5 min for too many requests, 1 min for rate limit
          maxRetries: 1
        };
      
      case AuthErrorType.SESSION_EXPIRED:
      case AuthErrorType.SESSION_INVALID:
        return {
          canRecover: true,
          recoveryAction: 'refresh_session',
          maxRetries: 1
        };
      
      case AuthErrorType.SESSION_CORRUPTED:
      case AuthErrorType.SESSION_MISMATCH:
      case AuthErrorType.COOKIE_SYNC_FAILED:
      case AuthErrorType.COOKIE_INVALID:
      case AuthErrorType.COOKIE_MISSING:
        return {
          canRecover: true,
          recoveryAction: 'clear_state',
          maxRetries: 1
        };
      
      case AuthErrorType.LOGIN_FAILED:
      case AuthErrorType.SIGNUP_FAILED:
      case AuthErrorType.LOGOUT_FAILED:
      case AuthErrorType.PASSWORD_RESET_FAILED:
        if (attempt < maxRetries) {
          return {
            canRecover: true,
            recoveryAction: 'retry',
            retryAfter: 2,
            maxRetries
          };
        }
        return { canRecover: false };
      
      case AuthErrorType.OAUTH_CALLBACK_FAILED:
      case AuthErrorType.OAUTH_PROVIDER_ERROR:
        if (attempt < 2) {
          return {
            canRecover: true,
            recoveryAction: 'retry',
            retryAfter: 5,
            maxRetries: 2
          };
        }
        return { canRecover: false };
      
      case AuthErrorType.OAUTH_STATE_MISMATCH:
        return {
          canRecover: true,
          recoveryAction: 'clear_state',
          maxRetries: 1
        };
      
      case AuthErrorType.INVALID_CREDENTIALS:
      case AuthErrorType.INVALID_EMAIL:
      case AuthErrorType.WEAK_PASSWORD:
      case AuthErrorType.EMAIL_NOT_CONFIRMED:
        return {
          canRecover: false,
          recoveryAction: 'manual_intervention'
        };
      
      case AuthErrorType.INTERNAL_ERROR:
        if (attempt < 2) {
          return {
            canRecover: true,
            recoveryAction: 'retry',
            retryAfter: 10,
            maxRetries: 2
          };
        }
        return {
          canRecover: false,
          recoveryAction: 'manual_intervention'
        };
      
      case AuthErrorType.UNKNOWN_ERROR:
        if (attempt < 2) {
          return {
            canRecover: true,
            recoveryAction: 'clear_state',
            maxRetries: 2
          };
        }
        return { canRecover: false };
      
      default:
        return { canRecover: false };
    }
  }
  
  /**
   * Get user-friendly error message
   */
  private static getUserMessage(errorType: AuthErrorType, locale: string = 'en'): string {
    const messages = ERROR_MESSAGES[locale as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.en;
    return messages[errorType] || messages[AuthErrorType.UNKNOWN_ERROR];
  }
  
  /**
   * Attempt automatic session recovery with network resilience
   */
  static async attemptSessionRecovery(context: AuthErrorContext): Promise<SessionRecoveryResult> {
    console.log('[AuthErrorHandler] Attempting session recovery...', context);
    
    try {
      // Check if we're online first
      if (typeof window !== 'undefined' && !BrowserCompatibility.isOnline()) {
        console.log('[AuthErrorHandler] Device is offline, waiting for connection...');
        
        // Return a special result for offline state
        return {
          success: false,
          error: 'Device is offline',
          recoveryMethod: 'waiting_for_online',
          debugInfo: {
            networkStatus: BrowserCompatibility.getNetworkStatus(),
            browserInfo: BrowserCompatibility.getBrowserInfo()
          }
        };
      }
      
      // Use network resilience for session refresh
      try {
        // First, try to refresh the current session with retry capability
        const { data: refreshData, error: refreshError } = await NetworkResilience.executeWithRetry(
          () => supabase.auth.refreshSession(),
          {
            maxRetries: 2,
            initialBackoffMs: 1000
          }
        );
        
        if (!refreshError && refreshData.session) {
          console.log('[AuthErrorHandler] Session refresh successful');
          
          // Sync cookies with refreshed session
          const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(refreshData.session);
          
          return {
            success: true,
            session: refreshData.session,
            user: refreshData.user,
            recoveryMethod: 'refresh',
            debugInfo: {
              cookiesSynced,
              sessionId: refreshData.session.access_token.substring(0, 10) + '...',
              browserInfo: BrowserCompatibility.getBrowserInfo().name
            }
          };
        }
        
        // If refresh fails, try to get the current session
        const { data: sessionData, error: sessionError } = await NetworkResilience.executeWithRetry(
          () => supabase.auth.getSession(),
          {
            maxRetries: 1,
            initialBackoffMs: 500
          }
        );
        
        if (!sessionError && sessionData.session) {
          console.log('[AuthErrorHandler] Current session found, attempting revalidation');
          
          // Check if session is still valid
          const now = Math.floor(Date.now() / 1000);
          if (sessionData.session.expires_at && sessionData.session.expires_at > now) {
            // Session is valid, sync cookies
            const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(sessionData.session);
            
            return {
              success: true,
              session: sessionData.session,
              user: sessionData.session.user,
              recoveryMethod: 'revalidate',
              debugInfo: {
                cookiesSynced,
                sessionId: sessionData.session.access_token.substring(0, 10) + '...',
                expiresAt: sessionData.session.expires_at,
                browserInfo: BrowserCompatibility.getBrowserInfo().name
              }
            };
          }
        }
        
        // No valid session available, clear everything
        console.log('[AuthErrorHandler] No valid session available, clearing state');
        AuthCookieManager.clearAuthCookies();
        
        return {
          success: false,
          error: 'No valid session available for recovery',
          recoveryMethod: 'clear_and_restart',
          debugInfo: {
            refreshError: refreshError?.message,
            sessionError: sessionError?.message,
            browserInfo: BrowserCompatibility.getBrowserInfo().name,
            cookiesEnabled: BrowserCompatibility.areCookiesEnabled()
          }
        };
      } catch (networkError) {
        // Handle network errors during recovery
        console.error('[AuthErrorHandler] Network error during session recovery:', networkError);
        
        return {
          success: false,
          error: 'Network error during recovery',
          recoveryMethod: 'retry_when_online',
          debugInfo: {
            networkError: networkError instanceof Error ? networkError.message : 'Unknown network error',
            networkStatus: BrowserCompatibility.getNetworkStatus(),
            browserInfo: BrowserCompatibility.getBrowserInfo().name
          }
        };
      }
    } catch (error) {
      console.error('[AuthErrorHandler] Session recovery failed:', error);
      
      // Clear potentially corrupted state
      AuthCookieManager.clearAuthCookies();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown recovery error',
        recoveryMethod: 'clear_and_restart',
        debugInfo: {
          unexpectedError: true,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          browserInfo: typeof window !== 'undefined' ? BrowserCompatibility.getBrowserInfo().name : 'server',
          cookiesEnabled: typeof window !== 'undefined' ? BrowserCompatibility.areCookiesEnabled() : false
        }
      };
    }
  }
  
  /**
   * Diagnose authentication state issues with browser compatibility checks
   */
  static async diagnoseAuthState(): Promise<AuthStateDiagnosis> {
    const diagnosis: AuthStateDiagnosis = {
      supabaseSessionExists: false,
      supabaseSessionValid: false,
      cookiesExist: false,
      cookiesValid: false,
      localStateValid: false,
      stateConsistent: false,
      issues: [],
      recommendations: [],
      debugData: {}
    };
    
    try {
      // Check browser compatibility first
      if (typeof window !== 'undefined') {
        const browserInfo = BrowserCompatibility.getBrowserInfo();
        diagnosis.debugData.browserInfo = browserInfo;
        diagnosis.debugData.networkStatus = BrowserCompatibility.getNetworkStatus();
        
        // Check if browser is supported
        if (!BrowserCompatibility.isBrowserSupported()) {
          diagnosis.issues.push('Browser may not be fully supported');
          diagnosis.recommendations.push('Try using a more recent browser version');
        }
        
        // Check if cookies are enabled
        if (!browserInfo.supportsCookies) {
          diagnosis.issues.push('Cookies are disabled in the browser');
          diagnosis.recommendations.push('Enable cookies in browser settings or use a different browser');
        }
        
        // Check if we're online
        if (!BrowserCompatibility.isOnline()) {
          diagnosis.issues.push('Device is currently offline');
          diagnosis.recommendations.push('Connect to the internet and try again');
        }
        
        // Check if storage is available
        if (!browserInfo.supportsLocalStorage && !browserInfo.supportsSessionStorage) {
          diagnosis.issues.push('Browser storage is unavailable');
          diagnosis.recommendations.push('Check browser privacy settings or use a different browser');
        }
        
        // Check for mobile-specific issues
        if (browserInfo.isMobile) {
          diagnosis.debugData.isMobileDevice = true;
          // No specific issues to add yet, just tracking for debugging
        }
      }
      
      // Check Supabase session
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        diagnosis.supabaseSessionExists = !!session;
        diagnosis.debugData.sessionError = sessionError?.message;
        
        if (session) {
          // Check if session is valid (not expired)
          const now = Math.floor(Date.now() / 1000);
          diagnosis.supabaseSessionValid = !session.expires_at || session.expires_at > now;
          diagnosis.debugData.sessionExpiresAt = session.expires_at;
          diagnosis.debugData.sessionUserId = session.user?.id;
          
          if (!diagnosis.supabaseSessionValid) {
            diagnosis.issues.push('Supabase session is expired');
            diagnosis.recommendations.push('Refresh the session or re-authenticate');
          }
        } else {
          diagnosis.issues.push('No Supabase session found');
          diagnosis.recommendations.push('User needs to sign in');
        }
      } catch (sessionError) {
        diagnosis.issues.push(`Error checking Supabase session: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`);
        diagnosis.debugData.supabaseSessionError = sessionError instanceof Error ? sessionError.message : 'Unknown error';
        
        // Check if this is a network error
        if (sessionError instanceof Error && 
            (sessionError.message.toLowerCase().includes('network') || 
             sessionError.message.toLowerCase().includes('fetch'))) {
          diagnosis.recommendations.push('Check network connection and try again');
        } else {
          diagnosis.recommendations.push('Try signing in again');
        }
      }
      
      // Check cookies
      try {
        diagnosis.cookiesExist = await AuthCookieManager.hasAuthCookies();
        diagnosis.cookiesValid = await AuthCookieManager.hasValidAuthCookies();
        diagnosis.debugData.cookiesExist = diagnosis.cookiesExist;
        diagnosis.debugData.cookiesValid = diagnosis.cookiesValid;
        
        if (diagnosis.cookiesExist && !diagnosis.cookiesValid) {
          diagnosis.issues.push('Auth cookies exist but are invalid');
          diagnosis.recommendations.push('Clear and regenerate auth cookies');
        } else if (!diagnosis.cookiesExist && diagnosis.supabaseSessionExists) {
          diagnosis.issues.push('Supabase session exists but cookies are missing');
          diagnosis.recommendations.push('Synchronize cookies with Supabase session');
        }
      } catch (cookieError) {
        diagnosis.issues.push(`Error checking cookies: ${cookieError instanceof Error ? cookieError.message : 'Unknown error'}`);
        diagnosis.debugData.cookieError = cookieError instanceof Error ? cookieError.message : 'Unknown error';
        
        if (typeof window !== 'undefined' && !BrowserCompatibility.areCookiesEnabled()) {
          diagnosis.recommendations.push('Enable cookies in browser settings');
        } else {
          diagnosis.recommendations.push('Clear browser cookies and try again');
        }
      }
      
      // Check state consistency
      diagnosis.stateConsistent = (
        (diagnosis.supabaseSessionExists && diagnosis.supabaseSessionValid && diagnosis.cookiesValid) ||
        (!diagnosis.supabaseSessionExists && !diagnosis.cookiesExist)
      );
      
      if (!diagnosis.stateConsistent) {
        diagnosis.issues.push('Authentication state is inconsistent');
        diagnosis.recommendations.push('Perform session recovery or clear all auth state');
      }
      
      // Overall local state validity
      diagnosis.localStateValid = diagnosis.stateConsistent && diagnosis.supabaseSessionValid;
      
    } catch (error) {
      diagnosis.issues.push(`Error during diagnosis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      diagnosis.recommendations.push('Clear all authentication state and restart');
      diagnosis.debugData.diagnosisError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    return diagnosis;
  }
  
  /**
   * Create retry function with exponential backoff
   */
  static createRetryFunction<T>(
    operation: () => Promise<T>,
    context: AuthErrorContext,
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
            retryCount: attempt
          });
          
          // If we can't recover or this is the last attempt, throw
          if (!errorRecovery.canRecover || attempt === maxRetries) {
            throw lastError;
          }
          
          // If recovery suggests retry, wait and continue
          if (errorRecovery.recoveryAction === 'retry' && errorRecovery.retryAfter) {
            // For tests, use a minimal delay to avoid timeouts
            const delay = import.meta.env.TEST ? 1 : errorRecovery.retryAfter! * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
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
   * Clear corrupted authentication state
   */
  static async clearCorruptedState(): Promise<void> {
    console.log('[AuthErrorHandler] Clearing corrupted authentication state...');
    
    try {
      // Clear cookies
      AuthCookieManager.clearAuthCookies();
      
      // Clear any OAuth state
      if (typeof window !== 'undefined' && window.sessionStorage && window.localStorage) {
        window.sessionStorage.removeItem('oauth_state');
        window.sessionStorage.removeItem('oauth_linking');
        window.localStorage.removeItem('supabase.auth.token');
      }
      
      // Sign out from Supabase (this will trigger auth state change)
      await supabase.auth.signOut();
      
      console.log('[AuthErrorHandler] Corrupted state cleared successfully');
    } catch (error) {
      console.error('[AuthErrorHandler] Error clearing corrupted state:', error);
      // Continue anyway - we want to clear as much as possible
    }
  }
}