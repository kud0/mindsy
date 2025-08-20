import type { Session } from '@supabase/supabase-js';
import { BrowserCompatibility, MemoryStorage, NetworkResilience } from './browser-compatibility';

/**
 * Configuration for authentication cookies
 */
interface CookieConfig {
  name: string;
  value: string;
  maxAge: number;
  secure: boolean;
  sameSite: 'Lax' | 'Strict' | 'None';
  domain?: string;
  path: string;
}

/**
 * Result of cookie validation
 */
interface CookieValidation {
  accessTokenPresent: boolean;
  refreshTokenPresent: boolean;
  tokensValid: boolean;
  expirationValid: boolean;
  securityAttributesCorrect: boolean;
  errors: string[];
}

/**
 * Debug log entry for cookie operations
 */
interface CookieDebugLog {
  timestamp: number;
  operation: string;
  success: boolean;
  error?: string;
  cookieNames?: string[];
  environment?: string;
  userAgent?: string;
}

/**
 * Session persistence metadata
 */
interface SessionPersistenceMetadata {
  lastValidated: number;
  lastSynced: number;
  browserTabId: string;
  validationCount: number;
  syncCount: number;
}

/**
 * Cross-tab synchronization event
 */
interface SessionSyncEvent {
  type: 'session_update' | 'session_clear' | 'validation_request' | 'validation_response';
  tabId: string;
  timestamp: number;
  data?: any;
}

/**
 * Enhanced cookie manager for authentication with synchronous operations and validation
 */
export class AuthCookieManager {
  private static readonly ACCESS_TOKEN_COOKIE = 'sb-access-token';
  private static readonly REFRESH_TOKEN_COOKIE = 'sb-refresh-token';
  private static readonly PERSISTENCE_METADATA_KEY = 'sb-session-metadata';
  private static readonly ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
  private static readonly REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
  private static readonly SYNC_CHANNEL = 'auth-session-sync';
  private static readonly FALLBACK_STORAGE_KEY = 'sb-auth-tokens';
  
  private static debugLogs: CookieDebugLog[] = [];
  private static readonly MAX_DEBUG_LOGS = 100;
  private static tabId: string = '';
  private static broadcastChannel: BroadcastChannel | null = null;
  private static sessionValidationInterval: number | null = null;
  private static fallbackStorageMechanism: 'localStorage' | 'sessionStorage' | 'memory' | null = null;

  /**
   * Get environment-specific cookie configuration
   */
  private static getEnvironmentConfig(): { secure: boolean; domain?: string; sameSite: 'Lax' | 'Strict' | 'None' } {
    if (typeof window === 'undefined') {
      // Server-side fallback
      return {
        secure: true,
        sameSite: 'Lax'
      };
    }

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isProduction = protocol === 'https:' && !isLocalhost;
    
    // Get browser info for better compatibility
    const browserInfo = BrowserCompatibility.getBrowserInfo();

    // Log environment detection
    this.log('environment_detection', {
      hostname,
      protocol,
      isLocalhost,
      isProduction,
      browser: browserInfo.name,
      isMobile: browserInfo.isMobile,
      cookiesEnabled: browserInfo.supportsCookies
    });

    // Safari has stricter cookie policies, especially in ITP (Intelligent Tracking Prevention)
    const isSafari = browserInfo.name === 'Safari';
    
    // Mobile browsers may have different cookie handling
    const isMobile = browserInfo.isMobile;
    
    // Determine appropriate sameSite value based on browser
    let sameSite: 'Lax' | 'Strict' | 'None' = 'Lax';
    
    // For OAuth flows, we need to ensure cookies work with redirects
    // Some older browsers don't support 'None', so we use 'Lax' for them
    if (isProduction) {
      // In production, use stricter settings except for OAuth flows
      sameSite = 'Lax';
    } else {
      // In development, be more permissive
      sameSite = 'Lax';
    }
    
    // For cross-origin requests in modern browsers, we need 'None' + secure
    if (isProduction && !isSafari && !isMobile) {
      sameSite = 'None';
    }

    return {
      secure: isProduction || protocol === 'https:',
      domain: isProduction ? hostname : undefined,
      sameSite
    };
  }

  /**
   * Create cookie configuration for a specific token
   */
  private static createCookieConfig(name: string, value: string, maxAge: number): CookieConfig {
    const envConfig = this.getEnvironmentConfig();
    
    return {
      name,
      value,
      maxAge,
      path: '/',
      ...envConfig
    };
  }

  /**
   * Format cookie string from configuration
   */
  private static formatCookieString(config: CookieConfig): string {
    let cookieString = `${config.name}=${config.value}; path=${config.path}; max-age=${config.maxAge}; SameSite=${config.sameSite}`;
    
    if (config.secure) {
      cookieString += '; Secure';
    }
    
    if (config.domain) {
      cookieString += `; Domain=${config.domain}`;
    }
    
    return cookieString;
  }

  /**
   * Set authentication cookies synchronously with validation
   * Includes fallback mechanisms for when cookies are disabled
   */
  static async setAuthCookies(accessToken: string, refreshToken: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      if (typeof window === 'undefined') {
        this.log('set_auth_cookies', { success: false, error: 'Not in browser environment' });
        return false;
      }

      if (!accessToken || !refreshToken) {
        this.log('set_auth_cookies', { success: false, error: 'Missing tokens' });
        return false;
      }
      
      // Check if cookies are enabled
      const cookiesEnabled = BrowserCompatibility.areCookiesEnabled();
      
      if (cookiesEnabled) {
        // Primary approach: Use cookies
        // Create cookie configurations
        const accessConfig = this.createCookieConfig(
          this.ACCESS_TOKEN_COOKIE,
          accessToken,
          this.ACCESS_TOKEN_MAX_AGE
        );
        
        const refreshConfig = this.createCookieConfig(
          this.REFRESH_TOKEN_COOKIE,
          refreshToken,
          this.REFRESH_TOKEN_MAX_AGE
        );

        // Set cookies synchronously
        document.cookie = this.formatCookieString(accessConfig);
        document.cookie = this.formatCookieString(refreshConfig);

        // Validate cookies were set correctly
        const validation = await this.validateCookies();
        
        if (!validation.accessTokenPresent || !validation.refreshTokenPresent) {
          this.log('set_auth_cookies', { 
            success: false, 
            error: 'Cookie validation failed after setting',
            validation
          });
          
          // Cookies failed, try fallback storage
          return this.setTokensInFallbackStorage(accessToken, refreshToken);
        }

        // Verify token values match what we set
        const storedAccessToken = this.getCookie(this.ACCESS_TOKEN_COOKIE);
        const storedRefreshToken = this.getCookie(this.REFRESH_TOKEN_COOKIE);

        if (storedAccessToken !== accessToken || storedRefreshToken !== refreshToken) {
          this.log('set_auth_cookies', { 
            success: false, 
            error: 'Token values do not match after setting',
            expected: { accessToken: accessToken.substring(0, 10) + '...', refreshToken: refreshToken.substring(0, 10) + '...' },
            actual: { 
              accessToken: storedAccessToken?.substring(0, 10) + '...', 
              refreshToken: storedRefreshToken?.substring(0, 10) + '...' 
            }
          });
          
          // Cookies failed, try fallback storage
          return this.setTokensInFallbackStorage(accessToken, refreshToken);
        }

        const duration = Date.now() - startTime;
        this.log('set_auth_cookies', { 
          success: true, 
          duration,
          cookieNames: [this.ACCESS_TOKEN_COOKIE, this.REFRESH_TOKEN_COOKIE]
        });

        return true;
      } else {
        // Cookies disabled, use fallback storage
        this.log('set_auth_cookies', { 
          success: false, 
          error: 'Cookies are disabled in browser',
          usingFallback: true
        });
        
        return this.setTokensInFallbackStorage(accessToken, refreshToken);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('set_auth_cookies', { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });
      
      // Try fallback storage as last resort
      return this.setTokensInFallbackStorage(accessToken, refreshToken);
    }
  }
  
  /**
   * Set tokens in fallback storage when cookies are disabled or fail
   */
  private static setTokensInFallbackStorage(accessToken: string, refreshToken: string): boolean {
    try {
      // Determine best available storage mechanism
      if (!this.fallbackStorageMechanism) {
        this.fallbackStorageMechanism = BrowserCompatibility.getStorageMechanism();
      }
      
      const tokens = {
        accessToken,
        refreshToken,
        expires: Date.now() + (this.ACCESS_TOKEN_MAX_AGE * 1000)
      };
      
      const tokensJson = JSON.stringify(tokens);
      
      switch (this.fallbackStorageMechanism) {
        case 'localStorage':
          window.localStorage.setItem(this.FALLBACK_STORAGE_KEY, tokensJson);
          break;
        case 'sessionStorage':
          window.sessionStorage.setItem(this.FALLBACK_STORAGE_KEY, tokensJson);
          break;
        case 'memory':
          MemoryStorage.setItem(this.FALLBACK_STORAGE_KEY, tokensJson);
          break;
        default:
          this.log('set_fallback_storage', { 
            success: false, 
            error: 'No available storage mechanism'
          });
          return false;
      }
      
      this.log('set_fallback_storage', { 
        success: true, 
        mechanism: this.fallbackStorageMechanism
      });
      
      return true;
    } catch (error) {
      this.log('set_fallback_storage', { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Clear authentication cookies and fallback storage
   */
  static clearAuthCookies(): void {
    try {
      if (typeof window === 'undefined') {
        this.log('clear_auth_cookies', { success: false, error: 'Not in browser environment' });
        return;
      }

      // Clear cookies if they're enabled
      if (BrowserCompatibility.areCookiesEnabled()) {
        const envConfig = this.getEnvironmentConfig();
        
        // Create expiration cookie strings with multiple variations to ensure complete cleanup
        const expiredDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
        const cookieNames = [this.ACCESS_TOKEN_COOKIE, this.REFRESH_TOKEN_COOKIE];
        
        cookieNames.forEach(cookieName => {
          // Clear with current environment config
          let cookieString = `${cookieName}=; path=/; expires=${expiredDate}; SameSite=${envConfig.sameSite}`;
          if (envConfig.secure) cookieString += '; Secure';
          if (envConfig.domain) cookieString += `; Domain=${envConfig.domain}`;
          document.cookie = cookieString;
          
          // Clear with different SameSite values to cover all cases
          const sameSiteValues = ['Lax', 'Strict', 'None'];
          sameSiteValues.forEach(sameSite => {
            let altCookieString = `${cookieName}=; path=/; expires=${expiredDate}; SameSite=${sameSite}`;
            if (sameSite === 'None' || envConfig.secure) altCookieString += '; Secure';
            document.cookie = altCookieString;
            
            // Also clear with domain variations
            if (envConfig.domain) {
              document.cookie = `${cookieName}=; path=/; expires=${expiredDate}; SameSite=${sameSite}; Domain=${envConfig.domain}`;
              document.cookie = `${cookieName}=; path=/; expires=${expiredDate}; SameSite=${sameSite}; Domain=.${envConfig.domain}`;
            }
          });
          
          // Clear without any attributes as fallback
          document.cookie = `${cookieName}=; path=/; expires=${expiredDate}`;
        });

        // Validate cookies were cleared
        const accessToken = this.getCookie(this.ACCESS_TOKEN_COOKIE);
        const refreshToken = this.getCookie(this.REFRESH_TOKEN_COOKIE);

        if (accessToken || refreshToken) {
          this.log('clear_auth_cookies', { 
            success: false, 
            error: 'Cookies not fully cleared',
            remaining: { accessToken: !!accessToken, refreshToken: !!refreshToken }
          });
        } else {
          this.log('clear_auth_cookies', { 
            success: true,
            cookieNames: [this.ACCESS_TOKEN_COOKIE, this.REFRESH_TOKEN_COOKIE]
          });
        }
      }
      
      // Clear fallback storage regardless of cookie status
      this.clearFallbackStorage();
      
      // Broadcast session clear to other tabs
      this.broadcastMessage({
        type: 'session_clear',
        tabId: this.tabId,
        timestamp: Date.now()
      });
      
      // Update session metadata
      const metadata = this.getOrInitSessionMetadata();
      metadata.lastSynced = Date.now();
      this.saveSessionMetadata(metadata);
      
    } catch (error) {
      this.log('clear_auth_cookies', { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Try to clear fallback storage even if cookie clearing fails
      this.clearFallbackStorage();
    }
  }
  
  /**
   * Clear tokens from fallback storage
   */
  private static clearFallbackStorage(): void {
    try {
      // Clear from all possible storage mechanisms to be safe
      if (typeof window !== 'undefined') {
        if (window.localStorage) {
          window.localStorage.removeItem(this.FALLBACK_STORAGE_KEY);
        }
        
        if (window.sessionStorage) {
          window.sessionStorage.removeItem(this.FALLBACK_STORAGE_KEY);
        }
      }
      
      // Clear from memory storage
      MemoryStorage.removeItem(this.FALLBACK_STORAGE_KEY);
      
      this.log('clear_fallback_storage', { success: true });
    } catch (error) {
      this.log('clear_fallback_storage', { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate current authentication cookies
   */
  static async validateCookies(): Promise<CookieValidation> {
    const validation: CookieValidation = {
      accessTokenPresent: false,
      refreshTokenPresent: false,
      tokensValid: false,
      expirationValid: false,
      securityAttributesCorrect: false,
      errors: []
    };

    try {
      if (typeof window === 'undefined') {
        validation.errors.push('Not in browser environment');
        return validation;
      }

      // Check if cookies are present
      const accessToken = this.getCookie(this.ACCESS_TOKEN_COOKIE);
      const refreshToken = this.getCookie(this.REFRESH_TOKEN_COOKIE);

      validation.accessTokenPresent = !!accessToken;
      validation.refreshTokenPresent = !!refreshToken;

      if (!accessToken) {
        validation.errors.push('Access token cookie missing');
      }

      if (!refreshToken) {
        validation.errors.push('Refresh token cookie missing');
      }

      // Validate token format (basic JWT structure check)
      if (accessToken) {
        const isValidJWT = this.isValidJWTFormat(accessToken);
        if (!isValidJWT) {
          validation.errors.push('Access token has invalid JWT format');
        } else {
          validation.tokensValid = true;
        }
      }

      // Check if tokens are expired (basic check)
      if (accessToken) {
        const isExpired = this.isTokenExpired(accessToken);
        if (isExpired) {
          validation.errors.push('Access token appears to be expired');
        } else {
          validation.expirationValid = true;
        }
      }

      // Validate security attributes by checking environment
      const envConfig = this.getEnvironmentConfig();
      validation.securityAttributesCorrect = true; // We can't directly validate cookie attributes from JS

      this.log('validate_cookies', { 
        success: validation.errors.length === 0,
        validation,
        error: validation.errors.length > 0 ? validation.errors.join(', ') : undefined
      });

      return validation;
    } catch (error) {
      validation.errors.push(error instanceof Error ? error.message : 'Unknown validation error');
      this.log('validate_cookies', { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return validation;
    }
  }

  /**
   * Get a specific cookie value or from fallback storage if cookies are disabled
   */
  private static getCookie(name: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    // Try to get from cookies first
    if (BrowserCompatibility.areCookiesEnabled()) {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === name) {
          return decodeURIComponent(value);
        }
      }
    }
    
    // If not found in cookies or cookies disabled, try fallback storage
    return this.getTokenFromFallbackStorage(name);
  }
  
  /**
   * Get token from fallback storage
   */
  private static getTokenFromFallbackStorage(tokenName: string): string | null {
    try {
      let tokensJson: string | null = null;
      
      // Try localStorage first
      if (typeof window !== 'undefined' && window.localStorage) {
        tokensJson = window.localStorage.getItem(this.FALLBACK_STORAGE_KEY);
      }
      
      // Try sessionStorage if not found in localStorage
      if (!tokensJson && typeof window !== 'undefined' && window.sessionStorage) {
        tokensJson = window.sessionStorage.getItem(this.FALLBACK_STORAGE_KEY);
      }
      
      // Try memory storage if not found in browser storage
      if (!tokensJson) {
        tokensJson = MemoryStorage.getItem(this.FALLBACK_STORAGE_KEY);
      }
      
      if (!tokensJson) {
        return null;
      }
      
      const tokens = JSON.parse(tokensJson);
      
      // Check if tokens are expired
      if (tokens.expires && tokens.expires < Date.now()) {
        this.clearFallbackStorage();
        return null;
      }
      
      // Return the requested token
      if (tokenName === this.ACCESS_TOKEN_COOKIE) {
        return tokens.accessToken || null;
      } else if (tokenName === this.REFRESH_TOKEN_COOKIE) {
        return tokens.refreshToken || null;
      }
      
      return null;
    } catch (error) {
      this.log('get_fallback_token', { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Basic JWT format validation
   */
  private static isValidJWTFormat(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  /**
   * Basic token expiration check
   */
  private static isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp;
      
      if (!exp) return false; // No expiration claim
      
      const now = Math.floor(Date.now() / 1000);
      return now >= exp;
    } catch {
      return true; // If we can't parse, assume expired
    }
  }

  /**
   * Synchronize cookies with Supabase session with network resilience
   */
  static async syncWithSupabaseSession(session: Session | null): Promise<boolean> {
    try {
      if (!session) {
        this.clearAuthCookies();
        
        // Broadcast session clear to other tabs
        this.broadcastMessage({
          type: 'session_clear',
          tabId: this.tabId,
          timestamp: Date.now()
        });
        
        this.log('sync_with_supabase', { success: true, action: 'cleared_cookies' });
        return true;
      }

      // Use network resilience for cookie setting
      const success = await NetworkResilience.executeWithRetry(
        () => this.setAuthCookies(session.access_token, session.refresh_token),
        {
          id: 'sync-cookies',
          maxRetries: 2,
          initialBackoffMs: 500
        }
      );
      
      if (success) {
        // Update sync metadata
        this.updateSyncMetadata();
        
        // Broadcast session update to other tabs
        this.broadcastMessage({
          type: 'session_update',
          tabId: this.tabId,
          timestamp: Date.now(),
          data: { 
            sessionId: session.user.id,
            expiresAt: session.expires_at
          }
        });
      }
      
      this.log('sync_with_supabase', { 
        success, 
        action: 'set_cookies',
        sessionExists: !!session,
        hasTokens: !!(session.access_token && session.refresh_token),
        browserInfo: BrowserCompatibility.getBrowserInfo().name,
        networkStatus: BrowserCompatibility.isOnline() ? 'online' : 'offline'
      });

      return success;
    } catch (error) {
      this.log('sync_with_supabase', { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        browserInfo: typeof window !== 'undefined' ? BrowserCompatibility.getBrowserInfo().name : 'server',
        networkStatus: typeof window !== 'undefined' ? (BrowserCompatibility.isOnline() ? 'online' : 'offline') : 'unknown'
      });
      return false;
    }
  }

  /**
   * Get current authentication tokens from cookies
   */
  static getAuthTokens(): { accessToken: string | null; refreshToken: string | null } {
    return {
      accessToken: this.getCookie(this.ACCESS_TOKEN_COOKIE),
      refreshToken: this.getCookie(this.REFRESH_TOKEN_COOKIE)
    };
  }

  /**
   * Check if user has valid authentication cookies
   */
  static async hasValidAuthCookies(): Promise<boolean> {
    const validation = await this.validateCookies();
    return validation.accessTokenPresent && 
           validation.refreshTokenPresent && 
           validation.tokensValid && 
           validation.expirationValid;
  }
  
  /**
   * Check if user has any authentication cookies
   */
  static async hasAuthCookies(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const accessToken = this.getCookie(this.ACCESS_TOKEN_COOKIE);
    const refreshToken = this.getCookie(this.REFRESH_TOKEN_COOKIE);
    
    return !!accessToken || !!refreshToken;
  }

  /**
   * Log cookie operations for debugging
   */
  private static log(operation: string, data: any): void {
    const logEntry: CookieDebugLog = {
      timestamp: Date.now(),
      operation,
      success: data.success,
      error: data.error,
      cookieNames: data.cookieNames,
      environment: typeof window !== 'undefined' ? window.location.hostname : 'server',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
    };

    this.debugLogs.push(logEntry);

    // Keep only the last MAX_DEBUG_LOGS entries
    if (this.debugLogs.length > this.MAX_DEBUG_LOGS) {
      this.debugLogs = this.debugLogs.slice(-this.MAX_DEBUG_LOGS);
    }

    // Console logging for development
    if (import.meta.env.DEV) {
      const logLevel = data.success ? 'info' : 'error';
      console[logLevel](`[AuthCookieManager] ${operation}:`, data);
    }
  }

  /**
   * Get debug logs for troubleshooting
   */
  static getDebugLogs(): CookieDebugLog[] {
    return [...this.debugLogs];
  }

  /**
   * Export debug data as JSON string
   */
  static exportDebugData(): string {
    return JSON.stringify({
      logs: this.debugLogs,
      environment: typeof window !== 'undefined' ? {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        userAgent: window.navigator.userAgent
      } : 'server',
      timestamp: Date.now()
    }, null, 2);
  }

  /**
   * Clear debug logs
   */
  static clearDebugLogs(): void {
    this.debugLogs = [];
    this.log('clear_debug_logs', { success: true });
  }
  
  /**
   * Initialize session persistence and cross-tab synchronization
   * This should be called during application startup
   */
  static initSessionPersistence(): void {
    if (typeof window === 'undefined') {
      return; // Server-side, nothing to do
    }
    
    try {
      // Initialize browser compatibility detection
      BrowserCompatibility.initialize();
      
      // Initialize network resilience
      NetworkResilience.initialize();
      
      // Generate a unique tab ID if not already set
      if (!this.tabId) {
        this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
      
      // Initialize session metadata if not present
      this.getOrInitSessionMetadata();
      
      // Set up cross-tab communication if supported
      if (BrowserCompatibility.getBrowserInfo().supportsBroadcastChannel) {
        this.setupCrossTabSync();
      } else {
        this.log('cross_tab_sync', { 
          success: false,
          error: 'BroadcastChannel not supported in this browser',
          browser: BrowserCompatibility.getBrowserInfo().name
        });
      }
      
      // Set up periodic session validation
      this.setupPeriodicValidation();
      
      // Set up network status listeners
      this.setupNetworkListeners();
      
      // Determine fallback storage mechanism
      this.fallbackStorageMechanism = BrowserCompatibility.getStorageMechanism();
      
      this.log('init_session_persistence', { 
        success: true,
        tabId: this.tabId,
        browserInfo: BrowserCompatibility.getBrowserInfo(),
        cookiesEnabled: BrowserCompatibility.areCookiesEnabled(),
        fallbackStorage: this.fallbackStorageMechanism
      });
    } catch (error) {
      this.log('init_session_persistence', { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Set up network status listeners
   */
  private static setupNetworkListeners(): void {
    // Handle going offline
    BrowserCompatibility.onOffline(() => {
      this.log('network_status', {
        success: true,
        status: 'offline'
      });
    });
    
    // Handle coming back online - validate session
    BrowserCompatibility.onOnline(() => {
      this.log('network_status', {
        success: true,
        status: 'online'
      });
      
      // Validate cookies when coming back online
      this.validateCookies().then(validation => {
        if (!validation.accessTokenPresent || !validation.refreshTokenPresent) {
          // Broadcast validation request to other tabs
          this.broadcastMessage({
            type: 'validation_request',
            tabId: this.tabId,
            timestamp: Date.now()
          });
        }
      });
    });
    
    // Handle slow connections
    BrowserCompatibility.onConnectionSlow(() => {
      this.log('network_status', {
        success: true,
        status: 'slow_connection',
        networkInfo: BrowserCompatibility.getNetworkStatus()
      });
    });
  }
  
  /**
   * Clean up session persistence resources
   * This should be called during application shutdown or page unload
   */
  static cleanupSessionPersistence(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      // Clear periodic validation interval
      if (this.sessionValidationInterval !== null) {
        window.clearInterval(this.sessionValidationInterval);
        this.sessionValidationInterval = null;
      }
      
      // Close broadcast channel
      if (this.broadcastChannel) {
        this.broadcastChannel.close();
        this.broadcastChannel = null;
      }
      
      this.log('cleanup_session_persistence', { success: true });
    } catch (error) {
      this.log('cleanup_session_persistence', { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Set up cross-tab synchronization using BroadcastChannel API
   * with fallback for browsers that don't support it
   */
  private static setupCrossTabSync(): void {
    if (typeof window === 'undefined') {
      return; // Server-side, nothing to do
    }
    
    try {
      // Close existing channel if any
      if (this.broadcastChannel) {
        this.broadcastChannel.close();
      }
      
      // Check if BroadcastChannel is supported
      if (window.BroadcastChannel) {
        // Create new channel
        this.broadcastChannel = new BroadcastChannel(this.SYNC_CHANNEL);
        
        // Listen for messages from other tabs
        this.broadcastChannel.onmessage = (event) => {
          const syncEvent = event.data as SessionSyncEvent;
          
          // Ignore own messages
          if (syncEvent.tabId === this.tabId) {
            return;
          }
          
          this.handleSyncEvent(syncEvent);
        };
        
        // Announce this tab's presence
        this.broadcastMessage({
          type: 'validation_request',
          tabId: this.tabId,
          timestamp: Date.now()
        });
        
        this.log('setup_cross_tab_sync', { 
          success: true,
          tabId: this.tabId,
          method: 'BroadcastChannel'
        });
      } else {
        // Fallback using localStorage events for older browsers
        this.setupLocalStorageSyncFallback();
      }
    } catch (error) {
      this.log('setup_cross_tab_sync', { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Try fallback if BroadcastChannel fails
      this.setupLocalStorageSyncFallback();
    }
  }
  
  /**
   * Set up cross-tab synchronization using localStorage events as fallback
   */
  private static setupLocalStorageSyncFallback(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return; // Not supported
    }
    
    try {
      const syncKey = `${this.SYNC_CHANNEL}-event`;
      
      // Listen for storage events
      window.addEventListener('storage', (event) => {
        if (event.key === syncKey) {
          try {
            const syncEvent = JSON.parse(event.newValue || '{}') as SessionSyncEvent;
            
            // Ignore own messages
            if (syncEvent.tabId === this.tabId) {
              return;
            }
            
            this.handleSyncEvent(syncEvent);
          } catch (error) {
            this.log('handle_storage_event', { 
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      });
      
      // Override broadcastMessage to use localStorage
      this.broadcastMessage = (event: SessionSyncEvent) => {
        try {
          window.localStorage.setItem(syncKey, JSON.stringify(event));
          // Immediately remove to trigger another event for future changes
          setTimeout(() => {
            window.localStorage.removeItem(syncKey);
          }, 100);
        } catch (error) {
          this.log('broadcast_message_fallback', { 
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      };
      
      // Announce this tab's presence
      this.broadcastMessage({
        type: 'validation_request',
        tabId: this.tabId,
        timestamp: Date.now()
      });
      
      this.log('setup_cross_tab_sync', { 
        success: true,
        tabId: this.tabId,
        method: 'localStorage'
      });
    } catch (error) {
      this.log('setup_local_storage_sync', { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Set up periodic session validation
   */
  private static setupPeriodicValidation(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      // Clear existing interval if any
      if (this.sessionValidationInterval !== null) {
        window.clearInterval(this.sessionValidationInterval);
      }
      
      // Set up new interval - validate every 5 minutes
      this.sessionValidationInterval = window.setInterval(() => {
        this.validateCookies().then(validation => {
          const metadata = this.getOrInitSessionMetadata();
          metadata.lastValidated = Date.now();
          metadata.validationCount++;
          this.saveSessionMetadata(metadata);
          
          // If validation fails, broadcast to other tabs
          if (!validation.accessTokenPresent || !validation.refreshTokenPresent || !validation.tokensValid) {
            this.broadcastMessage({
              type: 'validation_request',
              tabId: this.tabId,
              timestamp: Date.now(),
              data: { validation }
            });
          }
        });
      }, 5 * 60 * 1000); // 5 minutes
      
      this.log('setup_periodic_validation', { success: true });
    } catch (error) {
      this.log('setup_periodic_validation', { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Handle sync events from other tabs
   */
  private static handleSyncEvent(event: SessionSyncEvent): void {
    try {
      switch (event.type) {
        case 'session_update':
          // Another tab has updated the session, validate our cookies
          this.validateCookies().then(validation => {
            if (!validation.accessTokenPresent || !validation.refreshTokenPresent) {
              // Our cookies are missing, request sync
              this.broadcastMessage({
                type: 'validation_request',
                tabId: this.tabId,
                timestamp: Date.now()
              });
            }
          });
          break;
          
        case 'session_clear':
          // Another tab has cleared the session, clear our cookies too
          this.clearAuthCookies();
          break;
          
        case 'validation_request':
          // Another tab is requesting validation, check our cookies and respond
          this.validateCookies().then(validation => {
            if (validation.accessTokenPresent && validation.refreshTokenPresent && validation.tokensValid) {
              // We have valid cookies, send them to the requesting tab
              const tokens = this.getAuthTokens();
              this.broadcastMessage({
                type: 'validation_response',
                tabId: this.tabId,
                timestamp: Date.now(),
                data: { tokens, validation }
              });
            }
          });
          break;
          
        case 'validation_response':
          // Another tab has responded with valid tokens, sync our cookies if needed
          if (event.data?.tokens) {
            this.validateCookies().then(validation => {
              if (!validation.accessTokenPresent || !validation.refreshTokenPresent) {
                // Our cookies are missing, use the tokens from the other tab
                const { accessToken, refreshToken } = event.data.tokens;
                if (accessToken && refreshToken) {
                  this.setAuthCookies(accessToken, refreshToken);
                }
              }
            });
          }
          break;
      }
      
      this.log('handle_sync_event', { 
        success: true,
        eventType: event.type,
        sourceTabId: event.tabId
      });
    } catch (error) {
      this.log('handle_sync_event', { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.type
      });
    }
  }
  
  /**
   * Broadcast a message to other tabs
   */
  private static broadcastMessage(event: SessionSyncEvent): void {
    if (!this.broadcastChannel) {
      return;
    }
    
    try {
      this.broadcastChannel.postMessage(event);
    } catch (error) {
      this.log('broadcast_message', { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.type
      });
    }
  }
  
  /**
   * Get or initialize session metadata
   */
  private static getOrInitSessionMetadata(): SessionPersistenceMetadata {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {
        lastValidated: Date.now(),
        lastSynced: Date.now(),
        browserTabId: this.tabId,
        validationCount: 0,
        syncCount: 0
      };
    }
    
    try {
      const storedMetadata = window.localStorage.getItem(this.PERSISTENCE_METADATA_KEY);
      
      if (storedMetadata) {
        const metadata = JSON.parse(storedMetadata) as SessionPersistenceMetadata;
        metadata.browserTabId = this.tabId; // Update with current tab ID
        return metadata;
      }
    } catch (error) {
      this.log('get_session_metadata', { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Initialize new metadata
    const newMetadata: SessionPersistenceMetadata = {
      lastValidated: Date.now(),
      lastSynced: Date.now(),
      browserTabId: this.tabId,
      validationCount: 0,
      syncCount: 0
    };
    
    this.saveSessionMetadata(newMetadata);
    return newMetadata;
  }
  
  /**
   * Save session metadata to localStorage
   */
  private static saveSessionMetadata(metadata: SessionPersistenceMetadata): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    try {
      window.localStorage.setItem(this.PERSISTENCE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      this.log('save_session_metadata', { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Update session metadata after sync operation
   */
  private static updateSyncMetadata(): void {
    try {
      const metadata = this.getOrInitSessionMetadata();
      metadata.lastSynced = Date.now();
      metadata.syncCount++;
      this.saveSessionMetadata(metadata);
    } catch (error) {
      this.log('update_sync_metadata', { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}