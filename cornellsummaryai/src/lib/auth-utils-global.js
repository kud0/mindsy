/**
 * Global exports for authentication utilities - Simplified Version
 * This file exposes simplified authentication utilities to the window object
 * for use in inline scripts that can't use ES module imports
 */

import { 
  initAuth, 
  signInWithGitHub, 
  signInWithGoogle, 
  signInWithPassword, 
  signUp, 
  signOut, 
  getCurrentUser 
} from '/lib/auth.js';

// Initialize global namespaces
window.AuthUtils = window.AuthUtils || {};
window.AuthStore = window.AuthStore || {};

// Export auth store functions to global namespace
window.AuthStore.initAuth = initAuth;
window.AuthStore.signInWithGitHub = signInWithGitHub;
window.AuthStore.signInWithGoogle = signInWithGoogle;
window.AuthStore.signInWithPassword = signInWithPassword;
window.AuthStore.signUp = signUp;
window.AuthStore.signOut = signOut;
window.AuthStore.getCurrentUser = getCurrentUser;

console.log('[AuthUtils] Simplified global authentication utilities initialized with all OAuth methods');