# Authentication Debugging Guide

This guide provides comprehensive instructions for debugging authentication issues in the application. It covers common problems, troubleshooting steps, and how to use the built-in debugging tools.

## Table of Contents

1. [Common Authentication Issues](#common-authentication-issues)
2. [Using the Auth Debugger](#using-the-auth-debugger)
3. [Debugging Tools Reference](#debugging-tools-reference)
4. [Error Codes and Solutions](#error-codes-and-solutions)
5. [Performance Monitoring](#performance-monitoring)
6. [Browser Compatibility Issues](#browser-compatibility-issues)
7. [Network Resilience](#network-resilience)
8. [Support and Reporting](#support-and-reporting)

## Common Authentication Issues

### Session Synchronization Problems

The most common authentication issues are related to session state synchronization between:
- Supabase's internal session state
- Browser cookies
- Application's auth store state

**Symptoms:**
- User is redirected to login page after successful authentication
- "Session expired" errors despite recent login
- Inconsistent authentication state across browser tabs
- Authentication works on server but fails in browser

**Quick Fixes:**
- Clear browser cookies and local storage, then log in again
- Try using a private/incognito window
- Check if cookies are enabled in your browser
- Verify you're using a supported browser

### OAuth Authentication Issues

OAuth flows (like GitHub authentication) can fail due to:
- Callback handling errors
- State parameter mismatches (security protection)
- Cookie synchronization timing issues
- Network interruptions during the multi-step process

**Quick Fixes:**
- Try the authentication flow again from the beginning
- Clear cookies and local storage before retrying
- Check browser console for specific error messages
- Verify you're allowing third-party cookies if using OAuth

## Using the Auth Debugger

The application includes a built-in Auth Debugger that can help diagnose and fix authentication issues.

### Enabling Debug Mode

Add `?auth_debug=true` to any URL in the application to enable debug mode. For example:
```
https://example.com/login?auth_debug=true
```

With debug mode enabled, detailed authentication logs will appear in the browser console.

### Taking a State Snapshot

To capture the current authentication state for debugging:

```javascript
// In browser console
const snapshot = await window.AuthDebugger.takeStateSnapshot();
console.log(snapshot);
```

This provides a comprehensive view of:
- Supabase session state
- Cookie state
- Local application state
- State consistency issues

### Running Diagnostics

For comprehensive diagnostics:

```javascript
// In browser console
const diagnostics = await window.AuthDebugger.runDiagnostics();
console.log(diagnostics);
```

This will:
- Check Supabase session validity
- Validate cookies
- Test browser compatibility
- Identify state inconsistencies
- Suggest recovery actions

### Creating a Support Report

If you need to report an issue to support:

```javascript
// In browser console
const report = await window.AuthDebugger.createSupportReport();
console.log(report);
// Copy the output to share with support
```

## Debugging Tools Reference

### AuthDebugger API

The `AuthDebugger` class provides these key methods:

| Method | Description |
|--------|-------------|
| `setDebugMode(enabled)` | Enable/disable debug logging |
| `log(operation, success, data?, error?, level?)` | Log an authentication operation |
| `logWithState(operation, success, data?, error?, level?)` | Log with session and cookie state |
| `startPerformanceMonitoring(operation)` | Start timing an operation |
| `takeStateSnapshot()` | Capture current auth state |
| `runDiagnostics()` | Run comprehensive diagnostics |
| `monitorOperation(operation, fn)` | Monitor an async operation |
| `validateAuthFlow()` | Test each step of the auth flow |
| `createSupportReport()` | Generate a report for support |
| `getDebugLogs()` | Get all debug logs |
| `getErrorLogs(limit?)` | Get recent error logs |
| `getPerformanceMetrics()` | Get performance measurements |
| `exportDebugData()` | Export all debug data as JSON |
| `clearDebugData()` | Clear stored debug data |

### Browser Console Commands

When debug mode is enabled, you can use these commands in the browser console:

```javascript
// View recent auth errors
window.AuthDebugger.getErrorLogs();

// Check auth state consistency
window.AuthDebugger.takeStateSnapshot().then(snapshot => {
  console.log('State consistent:', snapshot.consistency.stateConsistent);
  console.log('Issues:', snapshot.consistency.issues);
});

// Test auth flow steps
window.AuthDebugger.validateAuthFlow().then(result => {
  console.log('Auth flow success:', result.overallSuccess);
  console.log('Steps:', result.steps);
});

// View performance metrics
window.AuthDebugger.getPerformanceMetrics();
```

## Error Codes and Solutions

| Error Type | Description | Solution |
|------------|-------------|----------|
| `SESSION_EXPIRED` | Authentication session has expired | Log in again |
| `SESSION_INVALID` | Session token is invalid or malformed | Clear cookies and log in again |
| `COOKIE_SYNC_FAILED` | Failed to synchronize cookies with session | Clear cookies and refresh the page |
| `OAUTH_CALLBACK_FAILED` | Error during OAuth callback processing | Try authentication again from the beginning |
| `OAUTH_STATE_MISMATCH` | Security validation failed for OAuth | Clear cookies and try again |
| `NETWORK_ERROR` | Network connectivity issues | Check your internet connection |
| `COOKIES_DISABLED` | Browser cookies are disabled | Enable cookies in browser settings |
| `BROWSER_UNSUPPORTED` | Browser may not be fully supported | Try a more recent browser version |

## Performance Monitoring

The Auth Debugger includes performance monitoring for authentication operations:

- Login flow timing
- Session validation speed
- Token refresh performance
- OAuth callback processing time

To view performance metrics:

```javascript
// In browser console
const metrics = window.AuthDebugger.getPerformanceMetrics();
console.log(metrics);

// Filter slow operations (>1000ms)
const slowOperations = metrics.filter(m => m.duration > 1000);
console.log(slowOperations);
```

## Browser Compatibility Issues

Authentication is tested and supported on:

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

Common browser-specific issues:

- **Safari**: Stricter cookie policies may require adjusting privacy settings
- **Firefox**: Enhanced tracking protection can block third-party cookies needed for OAuth
- **Mobile browsers**: May have limitations with cookie storage and redirects
- **Private/Incognito mode**: May block cookies or local storage

## Network Resilience

The authentication system includes network resilience features:

- Automatic retry for transient failures
- Exponential backoff for repeated attempts
- Offline detection and recovery
- Connection quality adaptation

If experiencing network-related authentication issues:

1. Check your internet connection
2. Try on a different network if available
3. Disable VPNs or proxies that might interfere
4. Check browser console for specific network errors

## Support and Reporting

If you encounter persistent authentication issues:

1. Enable debug mode with `?auth_debug=true`
2. Generate a support report:
   ```javascript
   window.AuthDebugger.createSupportReport().then(report => {
     console.log(report);
     // Copy this output to share with support
   });
   ```
3. Note the steps to reproduce the issue
4. Include browser and device information
5. Contact support with this information

For developers, additional logging can be enabled in the application code:

```typescript
// Enable verbose auth debugging
import { AuthDebugger } from '../lib/auth-debugger';
AuthDebugger.setDebugMode(true);
```