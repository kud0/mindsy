// Browser Console Debug Script for Pomodoro Settings Bug
// Copy-paste this into browser console while on dashboard with Pomodoro modal open

console.log('🧪 Starting Pomodoro Settings Debug Test...');

// Helper to inspect localStorage
function inspectLocalStorage() {
  const state = localStorage.getItem('pomodoro-timer-state');
  if (state) {
    console.log('📦 localStorage state:', JSON.parse(state));
  } else {
    console.log('📦 No localStorage state found');
  }
}

// Helper to check current React state (if accessible)
function getCurrentState() {
  // This won't work directly, but shows what we'd like to check
  console.log('🔍 To check React state:');
  console.log('1. Open React DevTools');
  console.log('2. Find PomodoroProvider component');
  console.log('3. Check these state values:');
  console.log('   - state.isRunning');
  console.log('   - state.currentSessionStartTime');
  console.log('   - state.timeRemaining');
  console.log('   - state.settings.focus_duration');
}

// Test sequence
console.log('\n📋 TEST PROCEDURE:');
console.log('1. Ensure timer is IDLE (not running, shows 25:00)');
console.log('2. Go to Settings tab');
console.log('3. Change Focus Duration 25 → 30');
console.log('4. Watch for console log: "⚙️ [updateSettings] Settings changed while idle"');
console.log('5. Switch to Timer tab');
console.log('6. Verify timer shows 30:00');

console.log('\n🔍 DEBUGGING CHECKLIST:');
console.log('✓ Check for auto-apply log in console');
console.log('✓ Check localStorage state (run inspectLocalStorage())');
console.log('✓ Check React DevTools for state.timeRemaining');
console.log('✓ Check if timer display actually uses state.timeRemaining or calculates independently');

console.log('\n💡 EXPECTED LOGS TO APPEAR:');
console.log('1. "🔧 [updateSettings] Called with: { focus_duration: 30 }"');
console.log('2. "🔧 [updateSettings] Preparing update:"');
console.log('3. "⚙️ [updateSettings] Settings changed while idle - auto-applying:"');
console.log('4. "✅ [updateSettings] Settings successfully saved to database"');

console.log('\n🚨 POTENTIAL ISSUES:');
console.log('A. If log appears but timer shows 25:00:');
console.log('   → State updates but UI components use stale fallback values');
console.log('   → Check PomodoroModal line 81 and PomodoroWidget line 60');
console.log('B. If log does NOT appear:');
console.log('   → isIdle condition fails (timer not truly idle)');
console.log('   → Check if currentSessionStartTime is null');
console.log('C. If timer briefly shows 30:00 then reverts to 25:00:');
console.log('   → localStorage restore overrides settings update');

// Make functions available globally
window.inspectLocalStorage = inspectLocalStorage;
window.getCurrentState = getCurrentState;

console.log('\n✅ Debug helpers ready. Run:');
console.log('- inspectLocalStorage() to check stored state');
console.log('- getCurrentState() for React DevTools instructions');
