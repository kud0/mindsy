/**
 * Authentication Debugging Utilities
 * 
 * Comprehensive debugging tools for authentication state issues including:
 * - Authentication state inspection
 * - Session validation debugging
 * - Cookie analysis
 * - Error tracking and reporting
 * - Performance monitoring
 * - Browser compatibility checks
 * - Network resilience testing
 * - Detailed logging for all authentication operations
 * - Support report generation
 * 
 * @see docs/auth-debugging-guide.md for usage documentation
 */

import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { AuthCookieManager } from './auth-cookie-manager';
import { AuthErrorHandler, type AuthStateDiagnosis } from './auth-error-handler';

/**
 * Debug log entry structure
 */
export interface AuthDebugLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  operation: string;
  success: boolean;
  duration?: number;
  error?: string;
  sessionState?: {
    exists: boolean;
    valid: boolean;
    userId?: string;
    expiresAt?: number;
  };
  cookieState?: {
    exists: boolean;
    valid: boolean;
    count: number;
  };
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

/**
 * Authentication performance metrics
 */
export interface AuthPerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  retryCount?: number;
  errorType?: string;
  sessionValidationTime?: number;
  cookieSyncTime?: number;
}

/**
 * Authentication state snapshot
 */
export interface AuthStateSnapshot {
  timestamp: number;
  supabaseSession: {
    exists: boolean;
    valid: boolean;
    userId?: string;
    email?: string;
    expiresAt?: number;
    provider?: string;
  };
  cookies: {
    exists: boolean;
    valid: boolean;
    accessToken?: boolean;
    refreshToken?: boolean;
  };
  localState: {
    isAuthenticated: boolean;
    userId?: string;
    isLoading: boolean;
    hasError: boolean;
    errorMessage?: string;
  };
  consistency: {
    stateConsistent: boolean;
    issues: string[];
  };
  environment: {
    userAgent: string;
    url: string;
    isSecure: boolean;
    cookiesEnabled: boolean;
  };
}

/**
 * Authentication Debugger class
 */
export class AuthDebugger {
  private static logs: AuthDebugLog[] = [];
  private static maxLogs = 100;
  private static performanceMetrics: AuthPerformanceMetrics[] = [];
  private static isDebugMode = false;
  private static isInitialized = false;
  
  /**
   * Enable or disable debug mode
   */
  static setDebugMode(enabled: boolean): void {
    this.isDebugMode = enabled;
    if (enabled) {
      console.log('[AuthDebugger] Debug mode enabled');
    }
  }
  
  /**
   * Check if debug mode is enabled
   */
  static isDebugEnabled(): boolean {
    return this.isDebugMode || (typeof window !== 'undefined' && window.location.search.includes('auth_debug=true'));
  }
  
  /**
   * Log authentication operation
   */
  static log(
    operation: string,
    success: boolean,
    data?: Record<string, any>,
    error?: string,
    level: 'info' | 'warn' | 'error' | 'debug' = 'info'
  ): void {
    const logEntry: AuthDebugLog = {
      timestamp: Date.now(),
      level,
      operation,
      success,
      error,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      additionalData: data
    };
    
    // Add to logs array
    this.logs.push(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Console log if debug mode is enabled
    if (this.isDebugEnabled()) {
      const logMessage = `[AuthDebugger] ${operation}: ${success ? 'SUCCESS' : 'FAILED'}`;
      const logData = { ...logEntry };
      
      switch (level) {
        case 'error':
          console.error(logMessage, logData);
          break;
        case 'warn':
          console.warn(logMessage, logData);
          break;
        case 'debug':
          console.debug(logMessage, logData);
          break;
        default:
          console.log(logMessage, logData);
      }
    }
  }
  
  /**
   * Log authentication operation with session and cookie state
   */
  static async logWithState(
    operation: string,
    success: boolean,
    data?: Record<string, any>,
    error?: string,
    level: 'info' | 'warn' | 'error' | 'debug' = 'info'
  ): Promise<void> {
    try {
      // Get current session state
      const { data: { session } } = await supabase.auth.getSession();
      const sessionState = session ? {
        exists: true,
        valid: !session.expires_at || session.expires_at > Math.floor(Date.now() / 1000),
        userId: session.user?.id,
        expiresAt: session.expires_at
      } : { exists: false, valid: false };
      
      // Get cookie state
      const cookiesExist = await AuthCookieManager.hasAuthCookies();
      const cookiesValid = await AuthCookieManager.hasValidAuthCookies();
      const cookieState = {
        exists: cookiesExist,
        valid: cookiesValid,
        count: cookiesExist ? 2 : 0 // Assuming access + refresh tokens
      };
      
      // Create enhanced log entry
      const logEntry: AuthDebugLog = {
        timestamp: Date.now(),
        level,
        operation,
        success,
        error,
        sessionState,
        cookieState,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        additionalData: data
      };
      
      // Add to logs
      this.logs.push(logEntry);
      
      // Keep only recent logs
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
      
      // Console log if debug mode is enabled
      if (this.isDebugEnabled()) {
        const logMessage = `[AuthDebugger] ${operation}: ${success ? 'SUCCESS' : 'FAILED'}`;
        
        switch (level) {
          case 'error':
            console.error(logMessage, logEntry);
            break;
          case 'warn':
            console.warn(logMessage, logEntry);
            break;
          case 'debug':
            console.debug(logMessage, logEntry);
            break;
          default:
            console.log(logMessage, logEntry);
        }
      }
    } catch (debugError) {
      // Fallback to simple logging if state inspection fails
      this.log(operation, success, data, error, level);
      console.warn('[AuthDebugger] Failed to inspect auth state:', debugError);
    }
  }
  
  /**
   * Start performance monitoring for an operation
   */
  static startPerformanceMonitoring(operation: string): (success: boolean, additionalData?: Record<string, any>) => AuthPerformanceMetrics {
    const startTime = performance.now();
    
    return (success: boolean, additionalData?: Record<string, any>): AuthPerformanceMetrics => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const metrics: AuthPerformanceMetrics = {
        operation,
        startTime,
        endTime,
        duration,
        success,
        ...additionalData
      };
      
      this.performanceMetrics.push(metrics);
      
      // Keep only recent metrics
      if (this.performanceMetrics.length > this.maxLogs) {
        this.performanceMetrics = this.performanceMetrics.slice(-this.maxLogs);
      }
      
      // Log performance if debug mode is enabled
      if (this.isDebugEnabled()) {
        console.log(`[AuthDebugger] Performance: ${operation} took ${duration.toFixed(2)}ms`, metrics);
      }
      
      return metrics;
    };
  }
  
  /**
   * Get all debug logs
   */
  static getDebugLogs(): AuthDebugLog[] {
    return [...this.logs];
  }
  
  /**
   * Get performance metrics
   */
  static getPerformanceMetrics(): AuthPerformanceMetrics[] {
    return [...this.performanceMetrics];
  }
  
  /**
   * Get recent error logs
   */
  static getErrorLogs(limit: number = 10): AuthDebugLog[] {
    return this.logs
      .filter(log => log.level === 'error' || !log.success)
      .slice(-limit);
  }
  
  /**
   * Export debug data as JSON string
   */
  static exportDebugData(): string {
    const debugData = {
      timestamp: Date.now(),
      logs: this.logs,
      performanceMetrics: this.performanceMetrics,
      environment: {
        userAgent: typeof window !== 'undefined' && window.navigator ? window.navigator.userAgent : 'N/A',
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
        cookiesEnabled: typeof window !== 'undefined' && window.navigator ? window.navigator.cookieEnabled : false,
        isSecure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : false
      }
    };
    
    return JSON.stringify(debugData, null, 2);
  }
  
  /**
   * Clear all debug data
   */
  static clearDebugData(): void {
    this.logs = [];
    this.performanceMetrics = [];
    console.log('[AuthDebugger] Debug data cleared');
  }
  
  /**
   * Take a comprehensive snapshot of current authentication state
   */
  static async takeStateSnapshot(): Promise<AuthStateSnapshot> {
    const timestamp = Date.now();
    
    try {
      // Get Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      const supabaseSession = session ? {
        exists: true,
        valid: !session.expires_at || session.expires_at > Math.floor(Date.now() / 1000),
        userId: session.user?.id,
        email: session.user?.email,
        expiresAt: session.expires_at,
        provider: session.user?.app_metadata?.provider
      } : { exists: false, valid: false };
      
      // Get cookie state
      const cookiesExist = await AuthCookieManager.hasAuthCookies();
      const cookiesValid = await AuthCookieManager.hasValidAuthCookies();
      
      const cookies = {
        exists: cookiesExist,
        valid: cookiesValid,
        accessToken: cookiesExist, // Simplified - assume if cookies exist, both tokens exist
        refreshToken: cookiesExist
      };
      
      // Get local state (this would need to be passed in or accessed from store)
      const localState = {
        isAuthenticated: !!session,
        userId: session?.user?.id,
        isLoading: false, // Would need to get from actual store
        hasError: !!sessionError,
        errorMessage: sessionError?.message
      };
      
      // Check consistency
      const stateConsistent = (
        (supabaseSession.exists && supabaseSession.valid && cookies.valid) ||
        (!supabaseSession.exists && !cookies.exists)
      );
      
      const issues: string[] = [];
      if (!stateConsistent) {
        if (supabaseSession.exists && !cookies.exists) {
          issues.push('Session exists but cookies missing');
        }
        if (!supabaseSession.exists && cookies.exists) {
          issues.push('Cookies exist but no session');
        }
        if (supabaseSession.exists && !supabaseSession.valid) {
          issues.push('Session exists but is expired');
        }
        if (cookies.exists && !cookies.valid) {
          issues.push('Cookies exist but are invalid');
        }
      }
      
      const consistency = {
        stateConsistent,
        issues
      };
      
      // Environment info
      const environment = {
        userAgent: typeof window !== 'undefined' && window.navigator ? window.navigator.userAgent : 'N/A',
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
        isSecure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : false,
        cookiesEnabled: typeof window !== 'undefined' && window.navigator ? window.navigator.cookieEnabled : false
      };
      
      const snapshot: AuthStateSnapshot = {
        timestamp,
        supabaseSession,
        cookies,
        localState,
        consistency,
        environment
      };
      
      // Log the snapshot if debug mode is enabled
      if (this.isDebugEnabled()) {
        console.log('[AuthDebugger] State snapshot taken:', snapshot);
      }
      
      return snapshot;
    } catch (error) {
      console.error('[AuthDebugger] Error taking state snapshot:', error);
      
      // Return minimal snapshot with error info
      return {
        timestamp,
        supabaseSession: { exists: false, valid: false },
        cookies: { exists: false, valid: false, accessToken: false, refreshToken: false },
        localState: { isAuthenticated: false, isLoading: false, hasError: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' },
        consistency: { stateConsistent: false, issues: ['Error taking snapshot'] },
        environment: {
          userAgent: typeof window !== 'undefined' && window.navigator ? window.navigator.userAgent : 'N/A',
          url: typeof window !== 'undefined' ? window.location.href : 'N/A',
          isSecure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : false,
          cookiesEnabled: typeof window !== 'undefined' && window.navigator ? window.navigator.cookieEnabled : false
        }
      };
    }
  }
  
  /**
   * Run comprehensive authentication diagnostics
   */
  static async runDiagnostics(): Promise<{
    diagnosis: AuthStateDiagnosis;
    snapshot: AuthStateSnapshot;
    recentErrors: AuthDebugLog[];
    performanceIssues: AuthPerformanceMetrics[];
  }> {
    console.log('[AuthDebugger] Running comprehensive authentication diagnostics...');
    
    const startTime = performance.now();
    
    try {
      // Run diagnosis
      const diagnosis = await AuthErrorHandler.diagnoseAuthState();
      
      // Take state snapshot
      const snapshot = await this.takeStateSnapshot();
      
      // Get recent errors
      const recentErrors = this.getErrorLogs(5);
      
      // Find performance issues (operations taking > 1 second)
      const performanceIssues = this.performanceMetrics.filter(metric => metric.duration > 1000);
      
      const endTime = performance.now();
      const diagnosticsDuration = endTime - startTime;
      
      const results = {
        diagnosis,
        snapshot,
        recentErrors,
        performanceIssues
      };
      
      // Log diagnostics completion
      this.log('diagnostics_completed', true, {
        duration: diagnosticsDuration,
        issuesFound: diagnosis.issues.length,
        performanceIssues: performanceIssues.length,
        recentErrors: recentErrors.length
      });
      
      if (this.isDebugEnabled()) {
        console.log('[AuthDebugger] Diagnostics completed:', results);
      }
      
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.log('diagnostics_failed', false, undefined, errorMessage, 'error');
      
      throw new Error(`Diagnostics failed: ${errorMessage}`);
    }
  }
  
  /**
   * Monitor authentication operations with automatic logging
   */
  static async monitorOperation<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const endPerformanceMonitoring = this.startPerformanceMonitoring(operation);
    
    try {
      const result = await fn();
      endPerformanceMonitoring(true);
      this.log(operation, true);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
      endPerformanceMonitoring(false, { errorType });
      this.log(operation, false, undefined, errorMessage, 'error');
      throw error;
    }
  }
  
  /**
   * Create a debug report for support
   */
  static async createSupportReport(): Promise<string> {
    const diagnostics = await this.runDiagnostics();
    
    const report = {
      timestamp: new Date().toISOString(),
      version: '1.0.0', // Would be replaced with actual app version
      diagnostics,
      debugData: {
        logs: this.logs.slice(-20), // Last 20 logs
        performanceMetrics: this.performanceMetrics.slice(-10) // Last 10 metrics
      }
    };
    
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * Validate authentication flow step by step
   */
  static async validateAuthFlow(): Promise<{
    steps: Array<{ step: string; success: boolean; error?: string; duration: number }>;
    overallSuccess: boolean;
  }> {
    const steps: Array<{ step: string; success: boolean; error?: string; duration: number }> = [];
    
    // Step 1: Check Supabase connection
    const step1Start = performance.now();
    try {
      await supabase.auth.getSession();
      steps.push({
        step: 'supabase_connection',
        success: true,
        duration: performance.now() - step1Start
      });
    } catch (error) {
      steps.push({
        step: 'supabase_connection',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - step1Start
      });
    }
    
    // Step 2: Check cookie functionality
    const step2Start = performance.now();
    try {
      await AuthCookieManager.hasAuthCookies();
      steps.push({
        step: 'cookie_functionality',
        success: true,
        duration: performance.now() - step2Start
      });
    } catch (error) {
      steps.push({
        step: 'cookie_functionality',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - step2Start
      });
    }
    
    // Step 3: Check session validation
    const step3Start = performance.now();
    try {
      const diagnosis = await AuthErrorHandler.diagnoseAuthState();
      steps.push({
        step: 'session_validation',
        success: diagnosis.stateConsistent,
        error: diagnosis.issues.length > 0 ? diagnosis.issues.join(', ') : undefined,
        duration: performance.now() - step3Start
      });
    } catch (error) {
      steps.push({
        step: 'session_validation',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - step3Start
      });
    }
    
    const overallSuccess = steps.every(step => step.success);
    
    // Log the validation results
    this.log('auth_flow_validation', overallSuccess, { steps });
    
    return { steps, overallSuccess };
  }
  
  /**
   * Initialize the AuthDebugger and expose it to the window object for easier debugging
   * This should be called in the main application initialization
   */
  static initialize(): void {
    if (this.isInitialized) {
      return;
    }
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Expose the AuthDebugger to the window object
      (window as any).AuthDebugger = {
        takeStateSnapshot: this.takeStateSnapshot.bind(this),
        runDiagnostics: this.runDiagnostics.bind(this),
        validateAuthFlow: this.validateAuthFlow.bind(this),
        getDebugLogs: this.getDebugLogs.bind(this),
        getErrorLogs: this.getErrorLogs.bind(this),
        getPerformanceMetrics: this.getPerformanceMetrics.bind(this),
        exportDebugData: this.exportDebugData.bind(this),
        clearDebugData: this.clearDebugData.bind(this),
        createSupportReport: this.createSupportReport.bind(this),
        setDebugMode: this.setDebugMode.bind(this)
      };
      
      // Check if debug mode should be enabled from URL
      if (window.location.search.includes('auth_debug=true')) {
        this.setDebugMode(true);
        console.log('[AuthDebugger] Debug mode enabled via URL parameter');
        console.log('[AuthDebugger] Use window.AuthDebugger to access debugging tools');
      }
    }
    
    this.isInitialized = true;
    this.log('debugger_initialized', true);
  }
  
  /**
   * Track detailed metrics for an authentication flow
   * This provides more comprehensive tracking than monitorOperation
   */
  static trackAuthFlow(
    flowType: 'login' | 'signup' | 'oauth' | 'logout' | 'password_reset' | 'session_refresh',
    provider?: 'email' | 'github' | 'google' | 'facebook' | 'apple' | string
  ): {
    stepComplete: (step: string, success: boolean, data?: Record<string, any>) => void;
    flowComplete: (success: boolean, data?: Record<string, any>) => AuthPerformanceMetrics;
  } {
    const startTime = performance.now();
    const steps: Array<{
      step: string;
      startTime: number;
      endTime: number;
      duration: number;
      success: boolean;
      data?: Record<string, any>;
    }> = [];
    
    // Log flow start
    this.log(`${flowType}_flow_started`, true, { provider });
    
    return {
      // Track completion of individual steps in the flow
      stepComplete: (step: string, success: boolean, data?: Record<string, any>) => {
        const stepEndTime = performance.now();
        const stepInfo = {
          step,
          startTime: steps.length > 0 ? steps[steps.length - 1].endTime : startTime,
          endTime: stepEndTime,
          duration: steps.length > 0 ? stepEndTime - steps[steps.length - 1].endTime : stepEndTime - startTime,
          success,
          data
        };
        
        steps.push(stepInfo);
        
        // Log step completion
        this.log(`${flowType}_${step}`, success, {
          duration: stepInfo.duration,
          ...data
        });
      },
      
      // Complete the entire flow and return metrics
      flowComplete: (success: boolean, data?: Record<string, any>): AuthPerformanceMetrics => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        const metrics: AuthPerformanceMetrics = {
          operation: `${flowType}_flow${provider ? `_${provider}` : ''}`,
          startTime,
          endTime,
          duration,
          success,
          steps,
          ...data
        };
        
        // Add to performance metrics
        this.performanceMetrics.push(metrics);
        
        // Keep only recent metrics
        if (this.performanceMetrics.length > this.maxLogs) {
          this.performanceMetrics = this.performanceMetrics.slice(-this.maxLogs);
        }
        
        // Log flow completion
        this.log(`${flowType}_flow_completed`, success, {
          duration,
          stepCount: steps.length,
          successfulSteps: steps.filter(s => s.success).length,
          ...data
        });
        
        // Log performance if debug mode is enabled
        if (this.isDebugEnabled()) {
          console.log(`[AuthDebugger] ${flowType} flow ${success ? 'succeeded' : 'failed'} in ${duration.toFixed(2)}ms`, metrics);
        }
        
        return metrics;
      }
    };
  }
  
  /**
   * Get browser and environment information for debugging
   */
  static getEnvironmentInfo(): Record<string, any> {
    if (typeof window === 'undefined') {
      return { environment: 'server' };
    }
    
    return {
      environment: 'browser',
      userAgent: window.navigator.userAgent,
      language: window.navigator.language,
      cookiesEnabled: window.navigator.cookieEnabled,
      onLine: window.navigator.onLine,
      url: window.location.href,
      isSecure: window.location.protocol === 'https:',
      screenSize: {
        width: window.screen.width,
        height: window.screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: new Date().toISOString(),
      timezoneOffset: new Date().getTimezoneOffset()
    };
  }
  
  /**
   * Check for common authentication issues and provide solutions
   */
  static async checkCommonIssues(): Promise<{
    issues: Array<{ issue: string; severity: 'high' | 'medium' | 'low'; solution: string }>;
    hasIssues: boolean;
  }> {
    const issues: Array<{ issue: string; severity: 'high' | 'medium' | 'low'; solution: string }> = [];
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return { issues, hasIssues: false };
    }
    
    // Check if cookies are enabled
    if (!window.navigator.cookieEnabled) {
      issues.push({
        issue: 'Cookies are disabled in your browser',
        severity: 'high',
        solution: 'Enable cookies in your browser settings to allow authentication to work properly'
      });
    }
    
    // Check if we're online
    if (!window.navigator.onLine) {
      issues.push({
        issue: 'You are currently offline',
        severity: 'high',
        solution: 'Connect to the internet to authenticate'
      });
    }
    
    // Check if using HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      issues.push({
        issue: 'Not using secure connection (HTTPS)',
        severity: 'medium',
        solution: 'Use HTTPS for secure authentication'
      });
    }
    
    // Check for private/incognito mode
    try {
      const testKey = `auth_test_${Date.now()}`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (e) {
      issues.push({
        issue: 'Browser may be in private/incognito mode or storage is restricted',
        severity: 'medium',
        solution: 'Try using normal browsing mode or adjust browser storage permissions'
      });
    }
    
    // Check for session/cookie state consistency
    try {
      const snapshot = await this.takeStateSnapshot();
      if (!snapshot.consistency.stateConsistent) {
        issues.push({
          issue: `Authentication state inconsistency: ${snapshot.consistency.issues.join(', ')}`,
          severity: 'high',
          solution: 'Clear browser cookies and local storage, then log in again'
        });
      }
    } catch (e) {
      // If we can't check state, add a generic issue
      issues.push({
        issue: 'Unable to verify authentication state',
        severity: 'medium',
        solution: 'Try clearing browser cookies and local storage, then log in again'
      });
    }
    
    return {
      issues,
      hasIssues: issues.length > 0
    };
  }
}