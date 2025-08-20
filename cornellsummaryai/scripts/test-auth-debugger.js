/**
 * Test script for the Authentication Debugger
 * 
 * This script tests the auth debugger functionality in a real environment
 * by simulating various authentication scenarios and checking the debug output.
 */

// Use CommonJS require syntax instead of ES modules
const { AuthDebugger } = require('../src/lib/auth-debugger');
const { supabase } = require('../src/lib/supabase');
const { AuthCookieManager } = require('../src/lib/auth-cookie-manager');
const { AuthErrorHandler } = require('../src/lib/auth-error-handler');

// Enable debug mode
AuthDebugger.setDebugMode(true);

// Initialize the debugger
AuthDebugger.initialize();

async function runTests() {
  console.log('=== Auth Debugger Test Script ===');
  
  try {
    // Test 1: Take state snapshot
    console.log('\n1. Taking authentication state snapshot...');
    const snapshot = await AuthDebugger.takeStateSnapshot();
    console.log('State snapshot:', JSON.stringify(snapshot, null, 2));
    
    // Test 2: Run diagnostics
    console.log('\n2. Running authentication diagnostics...');
    const diagnostics = await AuthDebugger.runDiagnostics();
    console.log('Diagnostics results:', JSON.stringify(diagnostics, null, 2));
    
    // Test 3: Validate auth flow
    console.log('\n3. Validating authentication flow...');
    const validation = await AuthDebugger.validateAuthFlow();
    console.log('Auth flow validation:', JSON.stringify(validation, null, 2));
    
    // Test 4: Check common issues
    console.log('\n4. Checking for common authentication issues...');
    const issues = await AuthDebugger.checkCommonIssues();
    console.log('Common issues:', JSON.stringify(issues, null, 2));
    
    // Test 5: Get environment info
    console.log('\n5. Getting environment information...');
    const envInfo = AuthDebugger.getEnvironmentInfo();
    console.log('Environment info:', JSON.stringify(envInfo, null, 2));
    
    // Test 6: Track a simulated auth flow
    console.log('\n6. Tracking simulated authentication flow...');
    const authFlow = AuthDebugger.trackAuthFlow('login', 'email');
    
    // Simulate flow steps
    authFlow.stepComplete('form_validation', true, { fields: ['email', 'password'] });
    
    // Simulate API call
    try {
      const startTime = Date.now();
      const { data, error } = await supabase.auth.getSession();
      const endTime = Date.now();
      
      authFlow.stepComplete('api_call', !error, { 
        duration: endTime - startTime,
        hasSession: !!data.session,
        error: error?.message
      });
    } catch (error) {
      authFlow.stepComplete('api_call', false, { error: error.message });
    }
    
    // Simulate session establishment
    authFlow.stepComplete('session_establishment', true);
    
    // Complete the flow
    const metrics = authFlow.flowComplete(true, { redirectTo: '/dashboard' });
    console.log('Auth flow metrics:', JSON.stringify(metrics, null, 2));
    
    // Test 7: Create support report
    console.log('\n7. Creating support report...');
    const report = await AuthDebugger.createSupportReport();
    console.log('Support report created:', report.substring(0, 200) + '... [truncated]');
    
    // Test 8: Get debug logs
    console.log('\n8. Getting debug logs...');
    const logs = AuthDebugger.getDebugLogs();
    console.log(`Found ${logs.length} debug logs`);
    console.log('Recent logs:', JSON.stringify(logs.slice(-3), null, 2));
    
    // Test 9: Get performance metrics
    console.log('\n9. Getting performance metrics...');
    const perfMetrics = AuthDebugger.getPerformanceMetrics();
    console.log(`Found ${perfMetrics.length} performance metrics`);
    console.log('Recent metrics:', JSON.stringify(perfMetrics.slice(-2), null, 2));
    
    console.log('\n=== Auth Debugger Tests Completed Successfully ===');
  } catch (error) {
    console.error('Error running auth debugger tests:', error);
  }
}

// Run the tests
runTests().catch(console.error);