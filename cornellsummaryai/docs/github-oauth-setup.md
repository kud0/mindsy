# GitHub OAuth Setup Guide

This guide explains how to properly configure GitHub OAuth for the application.

## Supabase OAuth Configuration

### 1. Update Redirect URLs in Supabase Dashboard

Go to your Supabase project dashboard:
1. Navigate to **Authentication** > **Providers**
2. Find **GitHub** provider
3. Update the **Redirect URLs** to include:

**For Development:**
```
http://localhost:4321/auth/callback
http://localhost:4321/es/auth/callback
```

**For Production:**
```
https://yourdomain.com/auth/callback
https://yourdomain.com/es/auth/callback
```

### 2. GitHub App Configuration

In your GitHub OAuth App settings:
1. Go to GitHub > Settings > Developer settings > OAuth Apps
2. Update **Authorization callback URL** to:
   - Development: `http://localhost:4321/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

## Common Issues and Solutions

### Issue: "localhost:3000" redirect error

**Problem:** GitHub is redirecting to `localhost:3000` instead of the correct port.

**Solution:** 
1. Check Supabase redirect URLs (step 1 above)
2. Verify GitHub OAuth App callback URL
3. Clear browser cache and cookies
4. Restart the development server

### Issue: CORS errors during OAuth flow

**Problem:** Cross-origin request blocked during OAuth callback.

**Solution:**
1. Ensure redirect URLs match exactly (including protocol and port)
2. Check that both Supabase and GitHub have the same callback URLs
3. Verify the application is running on the expected port

### Issue: OAuth state mismatch

**Problem:** State parameter validation fails during callback.

**Solution:**
1. Clear browser session storage
2. Ensure cookies are enabled
3. Check for browser extensions blocking cookies

## Testing OAuth Flow

### 1. Start Development Server
```bash
npm run dev
```
Verify the server is running on `http://localhost:4321`

### 2. Test OAuth Sign-in
1. Navigate to the login page
2. Click "Sign in with GitHub"
3. Verify the redirect URL in the browser address bar
4. Complete the GitHub authorization
5. Verify successful redirect back to the application

### 3. Debug OAuth Issues

Enable debug logging by opening browser console and checking for:
- "GitHub OAuth callback URL" log messages
- Any error messages during the OAuth flow
- Network requests to GitHub and Supabase

## Environment-Specific Configuration

### Development
- Use `http://localhost:4321` for all callback URLs
- Enable debug logging in browser console
- Test with both English and Spanish language paths

### Production
- Use HTTPS URLs for all callback URLs
- Ensure domain matches exactly
- Test with real domain (not localhost)

## Security Considerations

1. **Always use HTTPS in production**
2. **Verify redirect URLs are exact matches**
3. **Keep OAuth secrets secure**
4. **Regularly rotate OAuth credentials**
5. **Monitor OAuth usage and errors**

## Troubleshooting Checklist

- [ ] Supabase redirect URLs include correct port/domain
- [ ] GitHub OAuth App callback URL matches Supabase
- [ ] Application is running on expected port
- [ ] Browser cookies and session storage are enabled
- [ ] No browser extensions blocking OAuth flow
- [ ] Network connectivity to GitHub and Supabase
- [ ] OAuth credentials are valid and not expired