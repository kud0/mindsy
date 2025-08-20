#!/bin/bash

# Rollback Script - Authentication System
# This script rolls back Phase 2 changes if issues are encountered

echo "🔄 Rolling back Phase 2 authentication changes..."

# Ensure we're in the project root
cd "$(dirname "$0")"

# Create rollback log
echo "$(date): Starting rollback" > rollback.log

# Function to log actions
log_action() {
    echo "$(date): $1" >> rollback.log
    echo "$1"
}

log_action "📂 Restoring original auth system files..."

# Restore original auth store
if [ -f "backup/auth-system-original/auth-original.ts" ]; then
    cp backup/auth-system-original/auth-original.ts src/stores/auth.ts
    log_action "✅ Restored original auth store"
else
    log_action "❌ Original auth store backup not found"
fi

# Restore original middleware
if [ -f "backup/auth-system-original/middleware-original.ts" ]; then
    cp backup/auth-system-original/middleware-original.ts src/middleware.ts
    log_action "✅ Restored original middleware"
else
    log_action "❌ Original middleware backup not found"
fi

# Restore original OAuth callback
if [ -f "backup/auth-system-original/callback-original.astro" ]; then
    cp backup/auth-system-original/callback-original.astro src/pages/auth/callback.astro
    log_action "✅ Restored original OAuth callback"
else
    log_action "❌ Original OAuth callback backup not found"
fi

# Restore original Supabase client
if [ -f "backup/auth-system-original/supabase-original.ts" ]; then
    cp backup/auth-system-original/supabase-original.ts src/lib/supabase.ts
    log_action "✅ Restored original Supabase client"
else
    log_action "❌ Original Supabase client backup not found"
fi

# Restore auth utility modules
log_action "📂 Restoring auth utility modules..."

if [ -f "backup/auth-system-original/auth-cookie-manager.ts" ]; then
    cp backup/auth-system-original/auth-cookie-manager.ts src/lib/
    log_action "✅ Restored auth-cookie-manager.ts"
fi

if [ -f "backup/auth-system-original/auth-debugger.ts" ]; then
    cp backup/auth-system-original/auth-debugger.ts src/lib/
    log_action "✅ Restored auth-debugger.ts"
fi

if [ -f "backup/auth-system-original/auth-error-handler.ts" ]; then
    cp backup/auth-system-original/auth-error-handler.ts src/lib/
    log_action "✅ Restored auth-error-handler.ts"
fi

if [ -f "backup/auth-system-original/token-refresh-manager.ts" ]; then
    cp backup/auth-system-original/token-refresh-manager.ts src/lib/
    log_action "✅ Restored token-refresh-manager.ts"
fi

# Restore OAuth utility modules
if [ -f "backup/auth-system-original/oauth-account-validator.ts" ]; then
    cp backup/auth-system-original/oauth-account-validator.ts src/lib/
    log_action "✅ Restored oauth-account-validator.ts"
fi

if [ -f "backup/auth-system-original/oauth-callback-handler.ts" ]; then
    cp backup/auth-system-original/oauth-callback-handler.ts src/lib/
    log_action "✅ Restored oauth-callback-handler.ts"
fi

if [ -f "backup/auth-system-original/oauth-error-handler.ts" ]; then
    cp backup/auth-system-original/oauth-error-handler.ts src/lib/
    log_action "✅ Restored oauth-error-handler.ts"
fi

if [ -f "backup/auth-system-original/oauth-security.ts" ]; then
    cp backup/auth-system-original/oauth-security.ts src/lib/
    log_action "✅ Restored oauth-security.ts"
fi

log_action "📊 Rollback completed"

echo ""
echo "✅ Rollback completed successfully!"
echo ""
echo "📋 The original complex authentication system has been restored."
echo "📄 Rollback log saved to: rollback.log"
echo ""
echo "🧪 To test the rollback:"
echo "   npm run dev"