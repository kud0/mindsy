/**
 * Browser Compatibility and Network Resilience Module
 * 
 * Provides utilities for:
 * - Browser detection and feature detection
 * - Network status monitoring
 * - Graceful degradation when cookies are disabled
 * - Mobile device compatibility
 */

/**
 * Browser detection result
 */
export interface BrowserInfo {
  name: string;
  version: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  supportsLocalStorage: boolean;
  supportsSessionStorage: boolean;
  supportsCookies: boolean;
  supportsIndexedDB: boolean;
  supportsServiceWorker: boolean;
  supportsWebWorker: boolean;
  supportsBroadcastChannel: boolean;
}

/**
 * Network status information
 */
export interface NetworkStatus {
  online: boolean;
  type?: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  downlink?: number; // Mbps
  rtt?: number; // ms
  saveData?: boolean;
  lastChecked: number;
}

/**
 * Browser compatibility and feature detection
 */
export class BrowserCompatibility {
  private static browserInfo: BrowserInfo | null = null;
  private static networkStatus: NetworkStatus = {
    online: true,
    lastChecked: 0
  };
  private static networkListenersInitialized = false;
  private static offlineCallbacks: Array<() => void> = [];
  private static onlineCallbacks: Array<() => void> = [];
  private static connectionSlowCallbacks: Array<() => void> = [];
  
  /**
   * Initialize browser compatibility detection and network monitoring
   */
  static initialize(): void {
    if (typeof window === 'undefined') {
      return; // Server-side, nothing to do
    }
    
    // Detect browser features
    this.detectBrowserFeatures();
    
    // Initialize network monitoring
    this.initNetworkMonitoring();
    
    console.log('[BrowserCompatibility] Initialized', {
      browser: this.getBrowserInfo(),
      network: this.getNetworkStatus()
    });
  }
  
  /**
   * Detect browser features
   */
  private static detectBrowserFeatures(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      const ua = window.navigator.userAgent;
      let browserName = 'Unknown';
      let browserVersion = 'Unknown';
      
      // Detect browser name and version
      if (ua.indexOf('Firefox') > -1) {
        browserName = 'Firefox';
        browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || 'Unknown';
      } else if (ua.indexOf('SamsungBrowser') > -1) {
        browserName = 'Samsung Browser';
        browserVersion = ua.match(/SamsungBrowser\/([\d.]+)/)?.[1] || 'Unknown';
      } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
        browserName = 'Opera';
        browserVersion = ua.match(/(?:Opera|OPR)\/([\d.]+)/)?.[1] || 'Unknown';
      } else if (ua.indexOf('Trident') > -1) {
        browserName = 'Internet Explorer';
        browserVersion = ua.match(/rv:([\d.]+)/)?.[1] || 'Unknown';
      } else if (ua.indexOf('Edge') > -1) {
        browserName = 'Edge (Legacy)';
        browserVersion = ua.match(/Edge\/([\d.]+)/)?.[1] || 'Unknown';
      } else if (ua.indexOf('Edg') > -1) {
        browserName = 'Edge Chromium';
        browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || 'Unknown';
      } else if (ua.indexOf('Chrome') > -1) {
        browserName = 'Chrome';
        browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || 'Unknown';
      } else if (ua.indexOf('Safari') > -1) {
        browserName = 'Safari';
        browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || 'Unknown';
      }
      
      // Detect device type
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
      const isDesktop = !isMobile || isTablet;
      
      // Feature detection
      const supportsLocalStorage = this.testLocalStorage();
      const supportsSessionStorage = this.testSessionStorage();
      const supportsCookies = this.testCookies();
      const supportsIndexedDB = !!window.indexedDB;
      const supportsServiceWorker = 'serviceWorker' in navigator;
      const supportsWebWorker = !!window.Worker;
      const supportsBroadcastChannel = !!window.BroadcastChannel;
      
      this.browserInfo = {
        name: browserName,
        version: browserVersion,
        isMobile,
        isTablet,
        isDesktop,
        supportsLocalStorage,
        supportsSessionStorage,
        supportsCookies,
        supportsIndexedDB,
        supportsServiceWorker,
        supportsWebWorker,
        supportsBroadcastChannel
      };
    } catch (error) {
      console.error('[BrowserCompatibility] Error detecting browser features:', error);
      
      // Fallback to minimal info
      this.browserInfo = {
        name: 'Unknown',
        version: 'Unknown',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        supportsLocalStorage: false,
        supportsSessionStorage: false,
        supportsCookies: false,
        supportsIndexedDB: false,
        supportsServiceWorker: false,
        supportsWebWorker: false,
        supportsBroadcastChannel: false
      };
    }
  }
  
  /**
   * Test if localStorage is available and working
   */
  private static testLocalStorage(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    
    try {
      const testKey = '__test_ls_support__';
      window.localStorage.setItem(testKey, 'test');
      const result = window.localStorage.getItem(testKey) === 'test';
      window.localStorage.removeItem(testKey);
      return result;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Test if sessionStorage is available and working
   */
  private static testSessionStorage(): boolean {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return false;
    }
    
    try {
      const testKey = '__test_ss_support__';
      window.sessionStorage.setItem(testKey, 'test');
      const result = window.sessionStorage.getItem(testKey) === 'test';
      window.sessionStorage.removeItem(testKey);
      return result;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Test if cookies are available and working
   */
  private static testCookies(): boolean {
    if (typeof window === 'undefined' || !window.navigator || !window.document) {
      return false;
    }
    
    // First check navigator.cookieEnabled
    if (window.navigator.cookieEnabled === false) {
      return false;
    }
    
    // Double-check by trying to set a cookie
    try {
      const testKey = '__test_cookie_support__';
      document.cookie = `${testKey}=test; path=/; max-age=10`;
      const hasCookie = document.cookie.indexOf(testKey) !== -1;
      document.cookie = `${testKey}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      return hasCookie;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Initialize network status monitoring
   */
  private static initNetworkMonitoring(): void {
    if (typeof window === 'undefined' || this.networkListenersInitialized) {
      return;
    }
    
    try {
      // Update initial network status
      this.updateNetworkStatus();
      
      // Set up online/offline event listeners
      window.addEventListener('online', () => {
        this.updateNetworkStatus();
        this.notifyOnline();
      });
      
      window.addEventListener('offline', () => {
        this.updateNetworkStatus();
        this.notifyOffline();
      });
      
      // Set up connection change listener if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          connection.addEventListener('change', () => {
            this.updateNetworkStatus();
            
            // Check if connection is slow
            if (this.isConnectionSlow()) {
              this.notifyConnectionSlow();
            }
          });
        }
      }
      
      // Set up periodic network check (every 30 seconds)
      setInterval(() => {
        this.updateNetworkStatus();
      }, 30000);
      
      this.networkListenersInitialized = true;
    } catch (error) {
      console.error('[BrowserCompatibility] Error initializing network monitoring:', error);
    }
  }
  
  /**
   * Update network status information
   */
  private static updateNetworkStatus(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      // Basic online status
      const online = window.navigator.onLine;
      
      // Network information if available
      let type: NetworkStatus['type'] = 'unknown';
      let downlink: number | undefined = undefined;
      let rtt: number | undefined = undefined;
      let saveData: boolean | undefined = undefined;
      
      // Use Network Information API if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          type = connection.type || 'unknown';
          downlink = connection.downlink;
          rtt = connection.rtt;
          saveData = connection.saveData;
        }
      }
      
      this.networkStatus = {
        online,
        type,
        downlink,
        rtt,
        saveData,
        lastChecked: Date.now()
      };
    } catch (error) {
      console.error('[BrowserCompatibility] Error updating network status:', error);
      
      // Fallback to basic status
      this.networkStatus = {
        online: window.navigator.onLine,
        lastChecked: Date.now()
      };
    }
  }
  
  /**
   * Check if the connection is slow
   */
  static isConnectionSlow(): boolean {
    // Update network status if it's stale (older than 10 seconds)
    if (Date.now() - this.networkStatus.lastChecked > 10000) {
      this.updateNetworkStatus();
    }
    
    // Consider connection slow if:
    // 1. Downlink < 1 Mbps, or
    // 2. RTT > 500ms, or
    // 3. saveData mode is enabled
    return (
      (this.networkStatus.downlink !== undefined && this.networkStatus.downlink < 1) ||
      (this.networkStatus.rtt !== undefined && this.networkStatus.rtt > 500) ||
      (this.networkStatus.saveData === true)
    );
  }
  
  /**
   * Get browser information
   */
  static getBrowserInfo(): BrowserInfo {
    if (!this.browserInfo) {
      this.detectBrowserFeatures();
    }
    
    return { ...this.browserInfo! };
  }
  
  /**
   * Get current network status
   */
  static getNetworkStatus(): NetworkStatus {
    // Update if stale (older than 10 seconds)
    if (Date.now() - this.networkStatus.lastChecked > 10000) {
      this.updateNetworkStatus();
    }
    
    return { ...this.networkStatus };
  }
  
  /**
   * Check if the browser is online
   */
  static isOnline(): boolean {
    // Update if stale (older than 10 seconds)
    if (Date.now() - this.networkStatus.lastChecked > 10000) {
      this.updateNetworkStatus();
    }
    
    return this.networkStatus.online;
  }
  
  /**
   * Register callback for when the browser goes offline
   */
  static onOffline(callback: () => void): () => void {
    this.offlineCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.offlineCallbacks = this.offlineCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Register callback for when the browser comes online
   */
  static onOnline(callback: () => void): () => void {
    this.onlineCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.onlineCallbacks = this.onlineCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Register callback for when the connection becomes slow
   */
  static onConnectionSlow(callback: () => void): () => void {
    this.connectionSlowCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.connectionSlowCallbacks = this.connectionSlowCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Notify all registered offline callbacks
   */
  private static notifyOffline(): void {
    this.offlineCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[BrowserCompatibility] Error in offline callback:', error);
      }
    });
  }
  
  /**
   * Notify all registered online callbacks
   */
  private static notifyOnline(): void {
    this.onlineCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[BrowserCompatibility] Error in online callback:', error);
      }
    });
  }
  
  /**
   * Notify all registered slow connection callbacks
   */
  private static notifyConnectionSlow(): void {
    this.connectionSlowCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[BrowserCompatibility] Error in connection slow callback:', error);
      }
    });
  }
  
  /**
   * Check if cookies are enabled
   */
  static areCookiesEnabled(): boolean {
    if (!this.browserInfo) {
      this.detectBrowserFeatures();
    }
    
    return this.browserInfo!.supportsCookies;
  }
  
  /**
   * Check if the current browser is supported
   */
  static isBrowserSupported(): boolean {
    if (!this.browserInfo) {
      this.detectBrowserFeatures();
    }
    
    const info = this.browserInfo!;
    
    // Define minimum requirements for supported browsers
    switch (info.name) {
      case 'Chrome':
        return this.compareVersions(info.version, '60') >= 0;
      case 'Firefox':
        return this.compareVersions(info.version, '60') >= 0;
      case 'Safari':
        return this.compareVersions(info.version, '11') >= 0;
      case 'Edge Chromium':
        return this.compareVersions(info.version, '79') >= 0;
      case 'Edge (Legacy)':
        return this.compareVersions(info.version, '16') >= 0;
      case 'Internet Explorer':
        return false; // IE is not supported
      default:
        // For unknown browsers, check for essential features
        return info.supportsLocalStorage && 
               info.supportsCookies && 
               typeof window !== 'undefined' && 
               typeof fetch === 'function';
    }
  }
  
  /**
   * Compare two version strings
   * Returns:
   * - positive if v1 > v2
   * - negative if v1 < v2
   * - 0 if v1 === v2
   */
  private static compareVersions(v1: string, v2: string): number {
    if (v1 === 'Unknown' || v2 === 'Unknown') {
      return 0;
    }
    
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    const maxLength = Math.max(parts1.length, parts2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const part1 = i < parts1.length ? parts1[i] : 0;
      const part2 = i < parts2.length ? parts2[i] : 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }
  
  /**
   * Get storage mechanism based on browser capabilities
   * Falls back to memory storage if necessary
   */
  static getStorageMechanism(): 'localStorage' | 'sessionStorage' | 'cookie' | 'memory' {
    if (!this.browserInfo) {
      this.detectBrowserFeatures();
    }
    
    if (this.browserInfo!.supportsLocalStorage) {
      return 'localStorage';
    } else if (this.browserInfo!.supportsSessionStorage) {
      return 'sessionStorage';
    } else if (this.browserInfo!.supportsCookies) {
      return 'cookie';
    } else {
      return 'memory';
    }
  }
  
  /**
   * Check if the device is a mobile device
   */
  static isMobileDevice(): boolean {
    if (!this.browserInfo) {
      this.detectBrowserFeatures();
    }
    
    return this.browserInfo!.isMobile;
  }
  
  /**
   * Check if the device is a tablet
   */
  static isTabletDevice(): boolean {
    if (!this.browserInfo) {
      this.detectBrowserFeatures();
    }
    
    return this.browserInfo!.isTablet;
  }
  
  /**
   * Get browser-specific CSS classes for styling
   */
  static getBrowserClasses(): string {
    if (!this.browserInfo) {
      this.detectBrowserFeatures();
    }
    
    const info = this.browserInfo!;
    const classes = [];
    
    // Browser name
    classes.push(`browser-${info.name.toLowerCase().replace(/\s+/g, '-')}`);
    
    // Device type
    if (info.isMobile) classes.push('device-mobile');
    if (info.isTablet) classes.push('device-tablet');
    if (info.isDesktop) classes.push('device-desktop');
    
    // Feature support
    if (!info.supportsCookies) classes.push('no-cookies');
    if (!info.supportsLocalStorage) classes.push('no-local-storage');
    if (!info.supportsSessionStorage) classes.push('no-session-storage');
    
    return classes.join(' ');
  }
}

/**
 * In-memory storage fallback when cookies and localStorage are disabled
 */
export class MemoryStorage {
  private static storage: Record<string, string> = {};
  
  static getItem(key: string): string | null {
    return key in this.storage ? this.storage[key] : null;
  }
  
  static setItem(key: string, value: string): void {
    this.storage[key] = value;
  }
  
  static removeItem(key: string): void {
    delete this.storage[key];
  }
  
  static clear(): void {
    this.storage = {};
  }
  
  static get length(): number {
    return Object.keys(this.storage).length;
  }
  
  static key(index: number): string | null {
    const keys = Object.keys(this.storage);
    return index >= 0 && index < keys.length ? keys[index] : null;
  }
}

/**
 * Network resilience utilities
 */
export class NetworkResilience {
  private static retryQueue: Array<{
    id: string;
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    retryCount: number;
    maxRetries: number;
    lastAttempt: number;
    backoffMs: number;
  }> = [];
  
  private static isProcessingQueue = false;
  private static queueInterval: number | null = null;
  
  /**
   * Initialize network resilience
   */
  static initialize(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    // Set up online listener to process queue when connection is restored
    BrowserCompatibility.onOnline(() => {
      this.processQueue();
    });
    
    // Set up interval to periodically process queue (every 5 seconds)
    this.queueInterval = window.setInterval(() => {
      if (BrowserCompatibility.isOnline()) {
        this.processQueue();
      }
    }, 5000);
  }
  
  /**
   * Clean up resources
   */
  static cleanup(): void {
    if (this.queueInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.queueInterval);
      this.queueInterval = null;
    }
  }
  
  /**
   * Execute an operation with automatic retry on network failure
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      id?: string;
      maxRetries?: number;
      initialBackoffMs?: number;
      maxBackoffMs?: number;
      retryOnlyForNetwork?: boolean;
    } = {}
  ): Promise<T> {
    const {
      id = `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      maxRetries = 3,
      initialBackoffMs = 1000,
      maxBackoffMs = 30000,
      retryOnlyForNetwork = true
    } = options;
    
    // If we're online, try immediately
    if (BrowserCompatibility.isOnline()) {
      try {
        return await operation();
      } catch (error) {
        // If we should only retry for network errors and this isn't one, rethrow
        if (retryOnlyForNetwork && !this.isNetworkError(error)) {
          throw error;
        }
        
        // If we've reached max retries, rethrow
        if (maxRetries <= 0) {
          throw error;
        }
        
        // Otherwise, queue for retry
        return new Promise<T>((resolve, reject) => {
          this.retryQueue.push({
            id,
            operation,
            resolve,
            reject,
            retryCount: 0,
            maxRetries,
            lastAttempt: Date.now(),
            backoffMs: initialBackoffMs
          });
          
          // Try to process queue immediately
          if (BrowserCompatibility.isOnline()) {
            this.processQueue();
          }
        });
      }
    } else {
      // If we're offline, queue immediately
      return new Promise<T>((resolve, reject) => {
        this.retryQueue.push({
          id,
          operation,
          resolve,
          reject,
          retryCount: 0,
          maxRetries,
          lastAttempt: Date.now(),
          backoffMs: initialBackoffMs
        });
        
        console.log(`[NetworkResilience] Operation ${id} queued for when online`);
      });
    }
  }
  
  /**
   * Process the retry queue
   */
  private static async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessingQueue || !BrowserCompatibility.isOnline()) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      // Process each item in the queue
      const now = Date.now();
      const itemsToProcess = [...this.retryQueue];
      
      // Clear the queue before processing to avoid duplicates
      this.retryQueue = [];
      
      for (const item of itemsToProcess) {
        // Check if we should retry yet (respect backoff)
        if (now - item.lastAttempt < item.backoffMs) {
          // Not time yet, put back in queue
          this.retryQueue.push(item);
          continue;
        }
        
        // Try the operation
        try {
          const result = await item.operation();
          item.resolve(result);
          console.log(`[NetworkResilience] Operation ${item.id} succeeded after ${item.retryCount} retries`);
        } catch (error) {
          // Update retry count and last attempt
          item.retryCount++;
          item.lastAttempt = Date.now();
          
          // Check if we should retry
          if (item.retryCount < item.maxRetries && (BrowserCompatibility.isOnline() || !this.isNetworkError(error))) {
            // Increase backoff (exponential with jitter)
            item.backoffMs = Math.min(
              item.backoffMs * 2 * (0.8 + Math.random() * 0.4), // Add ±20% jitter
              30000 // Max 30 seconds
            );
            
            console.log(`[NetworkResilience] Operation ${item.id} failed, retry ${item.retryCount}/${item.maxRetries} in ${item.backoffMs}ms`);
            
            // Put back in queue
            this.retryQueue.push(item);
          } else {
            // Max retries reached or non-network error, reject
            console.log(`[NetworkResilience] Operation ${item.id} failed after ${item.retryCount} retries`);
            item.reject(error);
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }
  
  /**
   * Check if an error is a network-related error
   */
  private static isNetworkError(error: any): boolean {
    if (!error) return false;
    
    // Check error message
    const errorMessage = error.message?.toLowerCase() || '';
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('offline') ||
      errorMessage.includes('internet') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('failed to fetch')
    ) {
      return true;
    }
    
    // Check error name
    const errorName = error.name?.toLowerCase() || '';
    if (
      errorName.includes('network') ||
      errorName.includes('connection') ||
      errorName.includes('timeout')
    ) {
      return true;
    }
    
    // Check HTTP status codes that might indicate network issues
    if (error.status === 0 || error.status === 408 || error.status >= 500) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get the current retry queue length
   */
  static getQueueLength(): number {
    return this.retryQueue.length;
  }
  
  /**
   * Clear the retry queue
   */
  static clearQueue(): void {
    const queueLength = this.retryQueue.length;
    
    // Reject all pending operations
    for (const item of this.retryQueue) {
      item.reject(new Error('Operation cancelled'));
    }
    
    this.retryQueue = [];
    console.log(`[NetworkResilience] Cleared ${queueLength} operations from queue`);
  }
}