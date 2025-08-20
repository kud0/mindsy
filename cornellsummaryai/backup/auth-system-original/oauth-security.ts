/**
 * OAuth Security Utilities
 * 
 * This module provides security utilities for OAuth token management including:
 * - Token encryption/decryption
 * - Token refresh handling
 * - Secure token storage
 * - OAuth error handling
 */

import { supabase } from './supabase';
import { AppError, ErrorType, logError } from './error-handling';

/**
 * OAuth token data structure
 */
export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
}

/**
 * OAuth error types specific to GitHub OAuth
 */
export enum OAuthErrorType {
  INVALID_TOKEN = 'invalid_token',
  EXPIRED_TOKEN = 'expired_token',
  REVOKED_TOKEN = 'revoked_token',
  RATE_LIMITED = 'rate_limited',
  NETWORK_ERROR = 'network_error',
  PROVIDER_ERROR = 'provider_error',
  ENCRYPTION_ERROR = 'encryption_error',
  ACCOUNT_LINKING_ERROR = 'account_linking_error',
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions'
}

/**
 * OAuth error class with additional context
 */
export class OAuthError extends AppError {
  provider: string;
  oauthErrorType: OAuthErrorType;
  
  constructor(
    message: string, 
    oauthErrorType: OAuthErrorType, 
    provider: string = 'github',
    status: number = 400,
    details?: any
  ) {
    super(message, ErrorType.AUTHENTICATION, status, details);
    this.name = 'OAuthError';
    this.oauthErrorType = oauthErrorType;
    this.provider = provider;
  }
}

/**
 * Token encryption utility using Web Crypto API
 */
export class TokenEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  
  /**
   * Get or generate encryption key from environment
   */
  private static async getEncryptionKey(): Promise<CryptoKey> {
    const keyString = import.meta.env.OAUTH_ENCRYPTION_KEY || import.meta.env.SECRET_KEY;
    
    if (!keyString) {
      throw new OAuthError(
        'OAuth encryption key not configured',
        OAuthErrorType.ENCRYPTION_ERROR,
        'system',
        500
      );
    }
    
    // Use the key string to derive a consistent key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyString.padEnd(32, '0').substring(0, 32));
    
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: this.ALGORITHM },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * Encrypt a token string
   */
  static async encrypt(token: string): Promise<string> {
    try {
      if (!token) {
        throw new Error('Token cannot be empty');
      }
      
      const key = await this.getEncryptionKey();
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      
      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        key,
        data
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      logError(error as Error, { context: 'token_encryption' });
      throw new OAuthError(
        'Failed to encrypt token',
        OAuthErrorType.ENCRYPTION_ERROR,
        'system',
        500,
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
  
  /**
   * Decrypt a token string
   */
  static async decrypt(encryptedToken: string): Promise<string> {
    try {
      if (!encryptedToken) {
        throw new Error('Encrypted token cannot be empty');
      }
      
      const key = await this.getEncryptionKey();
      
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedToken).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, this.IV_LENGTH);
      const encrypted = combined.slice(this.IV_LENGTH);
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        encrypted
      );
      
      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      logError(error as Error, { context: 'token_decryption' });
      throw new OAuthError(
        'Failed to decrypt token',
        OAuthErrorType.ENCRYPTION_ERROR,
        'system',
        500,
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
}

/**
 * OAuth token manager with encryption and refresh capabilities
 */
export class OAuthTokenManager {
  /**
   * Store encrypted OAuth tokens in database
   */
  static async storeTokens(
    userId: string,
    provider: string,
    tokens: OAuthTokens,
    providerUserId: string,
    providerUsername?: string
  ): Promise<void> {
    try {
      // Encrypt tokens before storage
      const encryptedAccessToken = await TokenEncryption.encrypt(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token 
        ? await TokenEncryption.encrypt(tokens.refresh_token)
        : null;
      
      // Calculate expiration time
      const expiresAt = tokens.expires_at 
        ? new Date(tokens.expires_at * 1000).toISOString()
        : null;
      
      // Store in database
      const { error } = await supabase.rpc('upsert_oauth_connection', {
        p_user_id: userId,
        p_provider: provider,
        p_provider_user_id: providerUserId,
        p_provider_username: providerUsername,
        p_access_token: encryptedAccessToken,
        p_refresh_token: encryptedRefreshToken,
        p_token_expires_at: expiresAt
      });
      
      if (error) {
        throw new OAuthError(
          'Failed to store OAuth tokens',
          OAuthErrorType.PROVIDER_ERROR,
          provider,
          500,
          { databaseError: error.message }
        );
      }
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      
      logError(error as Error, { context: 'store_oauth_tokens', userId, provider });
      throw new OAuthError(
        'Failed to store OAuth tokens',
        OAuthErrorType.PROVIDER_ERROR,
        provider,
        500
      );
    }
  }
  
  /**
   * Retrieve and decrypt OAuth tokens from database
   */
  static async getTokens(userId: string, provider: string): Promise<OAuthTokens | null> {
    try {
      const { data, error } = await supabase
        .from('oauth_connections')
        .select('access_token, refresh_token, token_expires_at')
        .eq('user_id', userId)
        .eq('provider', provider)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw new OAuthError(
          'Failed to retrieve OAuth tokens',
          OAuthErrorType.PROVIDER_ERROR,
          provider,
          500,
          { databaseError: error.message }
        );
      }
      
      if (!data.access_token) {
        return null;
      }
      
      // Decrypt tokens
      const accessToken = await TokenEncryption.decrypt(data.access_token);
      const refreshToken = data.refresh_token 
        ? await TokenEncryption.decrypt(data.refresh_token)
        : undefined;
      
      // Parse expiration
      const expiresAt = data.token_expires_at 
        ? Math.floor(new Date(data.token_expires_at).getTime() / 1000)
        : undefined;
      
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        token_type: 'Bearer'
      };
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      
      logError(error as Error, { context: 'get_oauth_tokens', userId, provider });
      throw new OAuthError(
        'Failed to retrieve OAuth tokens',
        OAuthErrorType.PROVIDER_ERROR,
        provider,
        500
      );
    }
  }
  
  /**
   * Check if token is expired
   */
  static isTokenExpired(tokens: OAuthTokens): boolean {
    if (!tokens.expires_at) {
      return false; // No expiration info, assume valid
    }
    
    const now = Math.floor(Date.now() / 1000);
    const buffer = 300; // 5 minutes buffer
    
    return tokens.expires_at <= (now + buffer);
  }
  
  /**
   * Refresh OAuth tokens using refresh token
   */
  static async refreshTokens(
    userId: string, 
    provider: string = 'github'
  ): Promise<OAuthTokens> {
    try {
      // Get current tokens
      const currentTokens = await this.getTokens(userId, provider);
      
      if (!currentTokens?.refresh_token) {
        throw new OAuthError(
          'No refresh token available',
          OAuthErrorType.EXPIRED_TOKEN,
          provider,
          401
        );
      }
      
      // Use Supabase's refresh session method
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: currentTokens.refresh_token
      });
      
      if (error || !data.session) {
        throw new OAuthError(
          'Failed to refresh OAuth tokens',
          OAuthErrorType.EXPIRED_TOKEN,
          provider,
          401,
          { supabaseError: error?.message }
        );
      }
      
      // Extract new tokens
      const newTokens: OAuthTokens = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        token_type: 'Bearer'
      };
      
      // Get provider user info for storage
      const githubIdentity = data.session.user.identities?.find(
        identity => identity.provider === provider
      );
      
      if (githubIdentity?.identity_data) {
        // Store updated tokens
        await this.storeTokens(
          userId,
          provider,
          newTokens,
          githubIdentity.identity_data.sub || githubIdentity.identity_data.id,
          githubIdentity.identity_data.user_name || githubIdentity.identity_data.login
        );
      }
      
      return newTokens;
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      
      logError(error as Error, { context: 'refresh_oauth_tokens', userId, provider });
      throw new OAuthError(
        'Failed to refresh OAuth tokens',
        OAuthErrorType.EXPIRED_TOKEN,
        provider,
        401
      );
    }
  }
  
  /**
   * Get valid access token, refreshing if necessary
   */
  static async getValidAccessToken(userId: string, provider: string = 'github'): Promise<string> {
    try {
      let tokens = await this.getTokens(userId, provider);
      
      if (!tokens) {
        throw new OAuthError(
          'No OAuth tokens found',
          OAuthErrorType.INVALID_TOKEN,
          provider,
          401
        );
      }
      
      // Check if token needs refresh
      if (this.isTokenExpired(tokens)) {
        tokens = await this.refreshTokens(userId, provider);
      }
      
      return tokens.access_token;
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      
      logError(error as Error, { context: 'get_valid_access_token', userId, provider });
      throw new OAuthError(
        'Failed to get valid access token',
        OAuthErrorType.INVALID_TOKEN,
        provider,
        401
      );
    }
  }
  
  /**
   * Remove OAuth tokens from database
   */
  static async removeTokens(userId: string, provider: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('remove_oauth_connection', {
        p_user_id: userId,
        p_provider: provider
      });
      
      if (error) {
        throw new OAuthError(
          'Failed to remove OAuth tokens',
          OAuthErrorType.PROVIDER_ERROR,
          provider,
          500,
          { databaseError: error.message }
        );
      }
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      
      logError(error as Error, { context: 'remove_oauth_tokens', userId, provider });
      throw new OAuthError(
        'Failed to remove OAuth tokens',
        OAuthErrorType.PROVIDER_ERROR,
        provider,
        500
      );
    }
  }
}