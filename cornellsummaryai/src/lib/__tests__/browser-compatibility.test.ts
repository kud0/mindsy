import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserCompatibility, NetworkResilience, MemoryStorage } from '../browser-compatibility';

// Mock window and navigator objects
const mockWindow = () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  };
  
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  };
  
  const navigatorMock = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    onLine: true,
    cookieEnabled: true,
    connection: {
      type: 'wifi',
      downlink: 10,
      rtt: 50,
      saveData: false,
      addEventListener: vi.fn()
    }
  };
  
  Object.defineProperty(global, 'window', {
    value: {
      navigator: navigatorMock,
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
      location: {
        hostname: 'localhost',
        protocol: 'https:',
        href: 'https://localhost:3000/test'
      },
      document: {
        cookie: ''
      },
      addEventListener: vi.fn(),
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
      setInterval: vi.fn(),
      clearInterval: vi.fn(),
      BroadcastChannel: function() {
        return {
          postMessage: vi.fn(),
          addEventListener: vi.fn(),
          close: vi.fn()
        };
      },
      indexedDB: {},
      Worker: function() {},
      performance: {
        now: () => Date.now()
      }
    },
    writable: true
  });
  
  Object.defineProperty(global, 'navigator', {
    value: navigatorMock,
    writable: true
  });
  
  Object.defineProperty(global, 'document', {
    value: {
      cookie: ''
    },
    writable: true
  });
};

describe('BrowserCompatibility', () => {
  beforeEach(() => {
    mockWindow();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  
  it('should detect browser features', () => {
    BrowserCompatibility.initialize();
    const info = BrowserCompatibility.getBrowserInfo();
    
    expect(info).toBeDefined();
    expect(info.name).toBe('Chrome');
    expect(info.supportsLocalStorage).toBe(true);
    expect(info.supportsCookies).toBe(true);
  });
  
  it('should detect network status', () => {
    BrowserCompatibility.initialize();
    const status = BrowserCompatibility.getNetworkStatus();
    
    expect(status).toBeDefined();
    expect(status.online).toBe(true);
    expect(status.type).toBe('wifi');
  });
  
  it('should handle offline status', () => {
    const offlineCallback = vi.fn();
    const onlineCallback = vi.fn();
    
    BrowserCompatibility.initialize();
    BrowserCompatibility.onOffline(offlineCallback);
    BrowserCompatibility.onOnline(onlineCallback);
    
    // Simulate going offline
    Object.defineProperty(window.navigator, 'onLine', { value: false });
    window.addEventListener.mock.calls.forEach(call => {
      if (call[0] === 'offline') {
        call[1]();
      }
    });
    
    expect(offlineCallback).toHaveBeenCalled();
    expect(BrowserCompatibility.isOnline()).toBe(false);
    
    // Simulate coming back online
    Object.defineProperty(window.navigator, 'onLine', { value: true });
    window.addEventListener.mock.calls.forEach(call => {
      if (call[0] === 'online') {
        call[1]();
      }
    });
    
    expect(onlineCallback).toHaveBeenCalled();
    expect(BrowserCompatibility.isOnline()).toBe(true);
  });
  
  it('should detect slow connections', () => {
    const slowConnectionCallback = vi.fn();
    
    BrowserCompatibility.initialize();
    BrowserCompatibility.onConnectionSlow(slowConnectionCallback);
    
    // Simulate slow connection
    Object.defineProperty(window.navigator.connection, 'downlink', { value: 0.5 });
    Object.defineProperty(window.navigator.connection, 'rtt', { value: 600 });
    
    // Trigger connection change event
    window.navigator.connection.addEventListener.mock.calls.forEach(call => {
      if (call[0] === 'change') {
        call[1]();
      }
    });
    
    expect(BrowserCompatibility.isConnectionSlow()).toBe(true);
    expect(slowConnectionCallback).toHaveBeenCalled();
  });
  
  it('should detect mobile devices', () => {
    // Mock mobile user agent
    Object.defineProperty(window.navigator, 'userAgent', { 
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    });
    
    BrowserCompatibility.initialize();
    
    expect(BrowserCompatibility.isMobileDevice()).toBe(true);
    expect(BrowserCompatibility.isTabletDevice()).toBe(false);
  });
  
  it('should handle disabled cookies', () => {
    // Mock disabled cookies
    Object.defineProperty(window.navigator, 'cookieEnabled', { value: false });
    
    BrowserCompatibility.initialize();
    
    expect(BrowserCompatibility.areCookiesEnabled()).toBe(false);
    expect(BrowserCompatibility.getStorageMechanism()).not.toBe('cookie');
  });
  
  it('should provide browser-specific CSS classes', () => {
    BrowserCompatibility.initialize();
    const classes = BrowserCompatibility.getBrowserClasses();
    
    expect(classes).toContain('browser-chrome');
    expect(classes).toContain('device-desktop');
  });
});

describe('NetworkResilience', () => {
  beforeEach(() => {
    mockWindow();
    vi.useFakeTimers();
    NetworkResilience.initialize();
  });
  
  afterEach(() => {
    NetworkResilience.cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  
  it('should execute operations successfully when online', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const result = await NetworkResilience.executeWithRetry(operation);
    
    expect(operation).toHaveBeenCalledTimes(1);
    expect(result).toBe('success');
  });
  
  it('should retry failed operations with network errors', async () => {
    const networkError = new Error('Failed to fetch');
    const operation = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce('success');
    
    const resultPromise = NetworkResilience.executeWithRetry(operation);
    
    // Fast-forward past the retry delay
    vi.advanceTimersByTime(2000);
    
    const result = await resultPromise;
    
    expect(operation).toHaveBeenCalledTimes(2);
    expect(result).toBe('success');
  });
  
  it('should queue operations when offline and execute when online', async () => {
    // Set offline
    Object.defineProperty(window.navigator, 'onLine', { value: false });
    
    const operation = vi.fn().mockResolvedValue('success');
    
    const resultPromise = NetworkResilience.executeWithRetry(operation);
    
    // Operation should not be called yet
    expect(operation).not.toHaveBeenCalled();
    
    // Set online and trigger event
    Object.defineProperty(window.navigator, 'onLine', { value: true });
    window.addEventListener.mock.calls.forEach(call => {
      if (call[0] === 'online') {
        call[1]();
      }
    });
    
    // Fast-forward past the retry delay
    vi.advanceTimersByTime(1000);
    
    const result = await resultPromise;
    
    expect(operation).toHaveBeenCalledTimes(1);
    expect(result).toBe('success');
  });
  
  it('should respect max retries', async () => {
    const networkError = new Error('Failed to fetch');
    const operation = vi.fn().mockRejectedValue(networkError);
    
    const resultPromise = NetworkResilience.executeWithRetry(operation, { maxRetries: 2 });
    
    // Fast-forward past multiple retry delays
    vi.advanceTimersByTime(1000); // First retry
    vi.advanceTimersByTime(2000); // Second retry
    
    await expect(resultPromise).rejects.toThrow('Failed to fetch');
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});

describe('MemoryStorage', () => {
  it('should store and retrieve values', () => {
    MemoryStorage.setItem('test', 'value');
    
    expect(MemoryStorage.getItem('test')).toBe('value');
    expect(MemoryStorage.length).toBe(1);
  });
  
  it('should remove values', () => {
    MemoryStorage.setItem('test', 'value');
    MemoryStorage.removeItem('test');
    
    expect(MemoryStorage.getItem('test')).toBeNull();
    expect(MemoryStorage.length).toBe(0);
  });
  
  it('should clear all values', () => {
    MemoryStorage.setItem('test1', 'value1');
    MemoryStorage.setItem('test2', 'value2');
    MemoryStorage.clear();
    
    expect(MemoryStorage.getItem('test1')).toBeNull();
    expect(MemoryStorage.getItem('test2')).toBeNull();
    expect(MemoryStorage.length).toBe(0);
  });
  
  it('should get key by index', () => {
    MemoryStorage.clear();
    MemoryStorage.setItem('test1', 'value1');
    MemoryStorage.setItem('test2', 'value2');
    
    expect(MemoryStorage.key(0)).toBe('test1');
    expect(MemoryStorage.key(1)).toBe('test2');
    expect(MemoryStorage.key(2)).toBeNull();
  });
});