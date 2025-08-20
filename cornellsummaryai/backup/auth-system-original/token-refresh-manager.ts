/**
 * Token Refresh Manager
 * 
 * Handles automatic token refresh for Supabase authentication
 * Ensures session tokens are refreshed before they expire
 * Coordinates refresh across browser tabs
 */

import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { AuthCookieManager } from './auth-cookie-manager';
import { AuthDebugger } from './auth-debugger';

/**
 * Token refresh status
 */
interface TokenRefreshStatus {
  lastRefresh: number;
  nextScheduledRefresh: number;
  refreshCount: number;
  refreshInProgress: boolean;
  lastError?: string;
}

/**
 * Token Refresh Manager class
 */
export class TokenRefreshManager {
  private static refreshStatus: TokenRefreshStatus = {
    lastRefresh: 0,
    nextScheduledRefresh: 0,
    refreshCount: 0,
    refreshInProgress: false
  };
  
  private static refreshInterval: number | null = null;
  private static readonly REFRESH_BUFFER = 5 * 60; // Refresh 5 minutes before expiration
  private static readonly REFRESH_STATUS_KEY = 'sb-token-refresh-status';
  private static readonly MIN_REFRESH_INTERVAL = 60; // Minimum 1 minute between refresh attempts
  
  /**
   * Initialize token refresh manager
   */
  static initialize(): void {
    if (typeof window === 'undefined') {
      return; // Server-side, nothing to do
    }
    
    try {
      // Load refresh status from storage
      this.loadRefreshStatus();
      
      // Schedule initial refresh check
      this.scheduleRefreshCheck();
      
      // Set up storage event listener for cross-tab coordination
      window.addEventListener('storage', (event) => {
        if (event.key === this.REFRESH_STATUS_KEY) {
          // Another tab has updated the refresh status
          this.loadRefreshStatus();
        }
      });
      
      AuthDebugger.log('token_refresh_init', true, {
        nextScheduledRefresh: this.refreshStatus.nextScheduledRefresh
          ? new Date(this.refreshStatus.nextScheduledRefresh).toISOString()
          : 'none'
      });
    } catch (error) {
      AuthDebugger.log('token_refresh_init', false, undefined, 
        error instanceof Error ? error.message : 'Unknown error', 'error');
    }
  }
  
  /**
   * Clean up token refresh manager
   */
  static cleanup(): void {
    if (this.refreshInterval !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
  
  /**
   * Schedule token refresh based on session expiration
   */
  static scheduleRefreshForSession(session: Session | null): void {
    if (!session || !session.expires_at) {
      return;
    }
    
    try {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at;
      
      // Calculate when to refresh (5 minutes before expiration)
      const refreshAt = expiresAt - this.REFRESH_BUFFER;
      
      // If already expired or refresh time is in the past, refresh immediately
      if (expiresAt <= now || refreshAt <= now) {
        this.refreshToken();
        return;
      }
      
      // Schedule refresh
      const refreshDelay = (refreshAt - now) * 1000;
      this.scheduleRefresh(refreshDelay);
      
      // Update refresh status
      this.refreshStatus.nextScheduledRefresh = Date.now() + refreshDelay;
      this.saveRefreshStatus();
      
      AuthDebugger.log('token_refresh_scheduled', true, {
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        refreshAt: new Date(refreshAt * 1000).toISOString(),
        delayMs: refreshDelay
      });
    } catch (error) {
      AuthDebugger.log('token_refresh_schedule', false, undefined, 
        error instanceof Error ? error.message : 'Unknown error', 'error');
    }
  }
  
  /**
   * Schedule a refresh check
   */
  private static scheduleRefreshCheck(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    // Clear any existing interval
    if (this.refreshInterval !== null) {
      window.clearTimeout(this.refreshInterval);
    }
    
    // Check if we need to refresh now
    const now = Date.now();
    const nextRefresh = this.refreshStatus.nextScheduledRefresh;
    
    if (nextRefresh && nextRefresh <= now) {
      // Refresh now
      this.refreshToken();
      return;
    }
    
    // Schedule next check
    const delay = nextRefresh ? Math.min(nextRefresh - now, 60000) : 60000; // Max 1 minute
    
    this.refreshInterval = window.setTimeout(() => {
      this.checkAndRefreshToken();
    }, delay);
  }
  
  /**
   * Schedule a token refresh after a delay
   */
  private static scheduleRefresh(delay: number): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    // Clear any existing interval
    if (this.refreshInterval !== null) {
      window.clearTimeout(this.refreshInterval);
    }
    
    // Schedule refresh
    this.refreshInterval = window.setTimeout(() => {
      this.refreshToken();
    }, delay);
  }
  
  /**
   * Check if token needs refresh and refresh if needed
   */
  static async checkAndRefreshToken(): Promise<boolean> {
    try {
      // Prevent concurrent refreshes
      if (this.refreshStatus.refreshInProgress) {
        return false;
      }
      
      // Check if we have a session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return false;
      }
      
      // Check if session needs refresh
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const refreshAt = expiresAt - this.REFRESH_BUFFER;
      
      if (refreshAt <= now) {
        return await this.refreshToken();
      }
      
      // Schedule next refresh
      this.scheduleRefreshForSession(session);
      return false;
    } catch (error) {
      AuthDebugger.log('token_refresh_check', false, undefined, 
        error instanceof Error ? error.message : 'Unknown error', 'error');
      return false;
    }
  }
  
  /**
   * Refresh the authentication token
   */
  static async refreshToken(): Promise<boolean> {
    // Prevent concurrent refreshes
    if (this.refreshStatus.refreshInProgress) {
      return false;
    }
    
    // Check if we've refreshed recently
    const now = Date.now();
    const timeSinceLastRefresh = now - this.refreshStatus.lastRefresh;
    if (timeSinceLastRefresh < this.MIN_REFRESH_INTERVAL * 1000) {
      // Refreshed too recently, schedule next check
      this.scheduleRefreshCheck();
      return false;
    }
    
    this.refreshStatus.refreshInProgress = true;
    
    try {
      // Start performance monitoring
      const endPerformanceMonitoring = AuthDebugger.startPerformanceMonitoring('token_refresh');
      
      // Refresh the session
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        this.refreshStatus.lastError = error.message;
        this.saveRefreshStatus();
        
        AuthDebugger.log('token_refresh', false, undefined, error.message, 'error');
        endPerformanceMonitoring(false, { errorType: 'refresh_error' });
        return false;
      }
      
      if (!session) {
        this.refreshStatus.lastError = 'No session returned after refresh';
        this.saveRefreshStatus();
        
        AuthDebugger.log('token_refresh', false, {
          error: 'No session returned'
        }, 'No session returned after refresh', 'error');
        endPerformanceMonitoring(false, { errorType: 'no_session' });
        return false;
      }
      
      // Sync cookies with refreshed session
      const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(session);
      
      if (!cookiesSynced) {
        this.refreshStatus.lastError = 'Failed to synchronize cookies after refresh';
        this.saveRefreshStatus();
        
        AuthDebugger.log('token_refresh', false, {
          error: 'Cookie sync failed'
        }, 'Failed to synchronize cookies after refresh', 'error');
        endPerformanceMonitoring(false, { errorType: 'cookie_sync_failed' });
        return false;
      }
      
      // Update refresh status
      this.refreshStatus.lastRefresh = now;
      this.refreshStatus.refreshCount++;
      this.refreshStatus.lastError = undefined;
      
      // Schedule next refresh
      this.scheduleRefreshForSession(session);
      
      // Save updated status
      this.saveRefreshStatus();
      
      AuthDebugger.log('token_refresh', true, {
        userId: session.user.id,
        expiresAt: session.expires_at 
          ? new Date(session.expires_at * 1000).toISOString() 
          : 'unknown',
        nextRefresh: this.refreshStatus.nextScheduledRefresh
          ? new Date(this.refreshStatus.nextScheduledRefresh).toISOString()
          : 'none'
      });
      
      endPerformanceMonitoring(true);
      return true;
    } catch (error) {
      this.refreshStatus.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.saveRefreshStatus();
      
      AuthDebugger.log('token_refresh', false, undefined, 
        error instanceof Error ? error.message : 'Unknown error', 'error');
      return false;
    } finally {
      this.refreshStatus.refreshInProgress = false;
      this.saveRefreshStatus();
    }
  }
  
  /**
   * Save refresh status to localStorage
   */
  private static saveRefreshStatus(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    try {
      window.localStorage.setItem(this.REFRESH_STATUS_KEY, JSON.stringify(this.refreshStatus));
    } catch (error) {
      // Ignore storage errors
    }
  }
  
  /**
   * Load refresh status from localStorage
   */
  private static loadRefreshStatus(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    try {
      const stored = window.localStorage.getItem(this.REFRESH_STATUS_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored) as TokenRefreshStatus;
        
        // Only update if stored data is newer
        if (!this.refreshStatus.lastRefresh || 
            parsed.lastRefresh > this.refreshStatus.lastRefresh) {
          this.refreshStatus = {
            ...parsed,
            refreshInProgress: false // Reset in-progress flag
          };
        }
      }
    } catch (error) {
      // Ignore storage errors
    }
  }
  
  /**
   * Get current refresh status
   */
  static getRefreshStatus(): TokenRefreshStatus {
    return { ...this.refreshStatus };
  }
}