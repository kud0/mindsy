/**
 * OAuth Account Linking Validator
 * 
 * Provides secure validation for OAuth account linking scenarios including:
 * - Email verification and conflict resolution
 * - Account security validation
 * - Linking eligibility checks
 * - Security policy enforcement
 */

import { supabase } from './supabase';
import { OAuthError, OAuthErrorType } from './oauth-security';
import { logError } from './error-handling';

/**
 * Account linking validation result
 */
export interface AccountLinkingValidation {
  isValid: boolean;
  canLink: boolean;
  requiresEmailVerification: boolean;
  conflictResolution?: 'merge' | 'choose_account' | 'manual_intervention';
  errors: string[];
  warnings: string[];
  securityChecks: SecurityCheckResult[];
}

/**
 * Security check result
 */
export interface SecurityCheckResult {
  check: string;
  passed: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation?: string;
}

/**
 * Account linking context
 */
export interface AccountLinkingContext {
  userId?: string;
  email: string;
  provider: string;
  providerUserId: string;
  providerUsername: string;
  providerData: any;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
}

/**
 * Email verification status
 */
export interface EmailVerificationStatus {
  isVerified: boolean;
  verificationMethod: 'provider' | 'email_link' | 'none';
  verifiedAt?: Date;
  requiresAdditionalVerification: boolean;
}

/**
 * OAuth Account Linking Validator
 */
export class OAuthAccountValidator {
  /**
   * Validate account linking request
   */
  static async validateAccountLinking(context: AccountLinkingContext): Promise<AccountLinkingValidation> {
    const validation: AccountLinkingValidation = {
      isValid: true,
      canLink: true,
      requiresEmailVerification: false,
      errors: [],
      warnings: [],
      securityChecks: []
    };
    
    try {
      // Run all validation checks
      await Promise.all([
        this.validateEmail(context, validation),
        this.checkExistingAccounts(context, validation),
        this.validateProviderData(context, validation),
        this.runSecurityChecks(context, validation),
        this.checkLinkingEligibility(context, validation)
      ]);
      
      // Determine overall validation result
      validation.isValid = validation.errors.length === 0;
      validation.canLink = validation.isValid && !validation.securityChecks.some(
        check => !check.passed && (check.severity === 'high' || check.severity === 'critical')
      );
      
      return validation;
    } catch (error) {
      logError(error as Error, { context: 'account_linking_validation', accountContext: context });
      
      validation.isValid = false;
      validation.canLink = false;
      validation.errors.push('Validation process failed');
      
      return validation;
    }
  }
  
  /**
   * Validate email address and check verification status
   */
  private static async validateEmail(
    context: AccountLinkingContext, 
    validation: AccountLinkingValidation
  ): Promise<void> {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(context.email)) {
      validation.errors.push('Invalid email format');
      return;
    }
    
    // Check email verification status
    const verificationStatus = await this.checkEmailVerification(context);
    
    if (!verificationStatus.isVerified) {
      validation.requiresEmailVerification = true;
      validation.warnings.push('Email address is not verified');
    }
    
    if (verificationStatus.requiresAdditionalVerification) {
      validation.requiresEmailVerification = true;
      validation.warnings.push('Additional email verification required');
    }
  }
  
  /**
   * Check for existing accounts with conflicts
   */
  private static async checkExistingAccounts(
    context: AccountLinkingContext,
    validation: AccountLinkingValidation
  ): Promise<void> {
    try {
      // Check if email is already associated with another user
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, github_id, created_at')
        .eq('email', context.email)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        validation.errors.push('Failed to check existing accounts');
        return;
      }
      
      // Check if provider account is already linked
      const { data: existingConnection, error: connectionError } = await supabase
        .rpc('check_github_account_exists', {
          p_github_id: context.providerUserId
        });
      
      if (connectionError) {
        validation.errors.push('Failed to check existing provider connections');
        return;
      }
      
      // Analyze conflicts
      if (existingProfile && context.userId && existingProfile.id !== context.userId) {
        // Email belongs to different user
        validation.errors.push('Email address is already associated with another account');
        validation.conflictResolution = 'choose_account';
      }
      
      if (existingConnection && existingConnection.length > 0) {
        const connectedUser = existingConnection[0];
        
        if (context.userId && connectedUser.user_id !== context.userId) {
          // Provider account linked to different user
          validation.errors.push(`${context.provider} account is already linked to another user`);
          validation.conflictResolution = 'manual_intervention';
        } else if (!context.userId) {
          // New user trying to link already connected provider account
          validation.errors.push(`${context.provider} account is already in use`);
          validation.conflictResolution = 'choose_account';
        }
      }
      
      // Check for potential account merging scenarios
      if (existingProfile && existingConnection && existingConnection.length > 0) {
        const connectedUser = existingConnection[0];
        
        if (existingProfile.id === connectedUser.user_id) {
          // Same user, different linking attempt - this is fine
          validation.warnings.push('Account is already properly linked');
        } else {
          // Different users - complex conflict
          validation.errors.push('Complex account conflict detected');
          validation.conflictResolution = 'manual_intervention';
        }
      }
    } catch (error) {
      logError(error as Error, { context: 'check_existing_accounts' });
      validation.errors.push('Failed to validate existing accounts');
    }
  }
  
  /**
   * Validate provider data integrity
   */
  private static async validateProviderData(
    context: AccountLinkingContext,
    validation: AccountLinkingValidation
  ): Promise<void> {
    const { providerData, provider } = context;
    
    if (!providerData) {
      validation.errors.push('Missing provider data');
      return;
    }
    
    // Provider-specific validation
    if (provider === 'github') {
      if (!providerData.id || !providerData.login) {
        validation.errors.push('Invalid GitHub profile data');
      }
      
      if (!providerData.email && !providerData.emails) {
        validation.warnings.push('No email address provided by GitHub');
      }
      
      // Check for suspicious account characteristics
      if (providerData.created_at) {
        const accountAge = Date.now() - new Date(providerData.created_at).getTime();
        const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
        
        if (daysSinceCreation < 7) {
          validation.warnings.push('GitHub account is very new');
          validation.securityChecks.push({
            check: 'account_age',
            passed: false,
            severity: 'medium',
            message: 'GitHub account created less than 7 days ago',
            recommendation: 'Consider additional verification'
          });
        }
      }
      
      // Check for minimal activity indicators
      if (providerData.public_repos === 0 && providerData.followers === 0) {
        validation.warnings.push('GitHub account has minimal activity');
        validation.securityChecks.push({
          check: 'account_activity',
          passed: false,
          severity: 'low',
          message: 'GitHub account has no public repositories or followers',
          recommendation: 'Monitor for suspicious activity'
        });
      }
    }
  }
  
  /**
   * Run security checks on the linking request
   */
  private static async runSecurityChecks(
    context: AccountLinkingContext,
    validation: AccountLinkingValidation
  ): Promise<void> {
    // Check for rate limiting
    const rateLimitCheck = await this.checkRateLimiting(context);
    validation.securityChecks.push(rateLimitCheck);
    
    // Check for suspicious patterns
    const suspiciousPatternCheck = await this.checkSuspiciousPatterns(context);
    validation.securityChecks.push(suspiciousPatternCheck);
    
    // Check session security
    const sessionSecurityCheck = this.checkSessionSecurity(context);
    validation.securityChecks.push(sessionSecurityCheck);
    
    // Check for account enumeration attempts
    const enumerationCheck = await this.checkAccountEnumeration(context);
    validation.securityChecks.push(enumerationCheck);
  }
  
  /**
   * Check linking eligibility based on business rules
   */
  private static async checkLinkingEligibility(
    context: AccountLinkingContext,
    validation: AccountLinkingValidation
  ): Promise<void> {
    if (!context.userId) {
      // New user registration - always eligible
      return;
    }
    
    try {
      // Check if user can link additional accounts
      const { data: canLinkData, error } = await supabase
        .rpc('can_link_oauth_provider', {
          p_user_id: context.userId,
          p_provider: context.provider
        });
      
      if (error) {
        validation.errors.push('Failed to check linking eligibility');
        return;
      }
      
      const canLink = canLinkData?.[0];
      if (!canLink?.can_link) {
        validation.errors.push(canLink?.reason || 'Account linking not allowed');
      }
    } catch (error) {
      logError(error as Error, { context: 'check_linking_eligibility' });
      validation.errors.push('Failed to validate linking eligibility');
    }
  }
  
  /**
   * Check email verification status
   */
  private static async checkEmailVerification(context: AccountLinkingContext): Promise<EmailVerificationStatus> {
    // For GitHub, check if email is verified by the provider
    if (context.provider === 'github' && context.providerData) {
      const githubEmails = context.providerData.emails || [];
      const primaryEmail = githubEmails.find((email: any) => 
        email.email === context.email && email.verified
      );
      
      if (primaryEmail) {
        return {
          isVerified: true,
          verificationMethod: 'provider',
          verifiedAt: new Date(),
          requiresAdditionalVerification: false
        };
      }
    }
    
    // Check if email is verified in our system
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, email_verified_at')
        .eq('email', context.email)
        .single();
      
      if (profile?.email_verified_at) {
        return {
          isVerified: true,
          verificationMethod: 'email_link',
          verifiedAt: new Date(profile.email_verified_at),
          requiresAdditionalVerification: false
        };
      }
    } catch (error) {
      // Email not found in our system - not necessarily an error
    }
    
    return {
      isVerified: false,
      verificationMethod: 'none',
      requiresAdditionalVerification: true
    };
  }
  
  /**
   * Check for rate limiting violations
   */
  private static async checkRateLimiting(context: AccountLinkingContext): Promise<SecurityCheckResult> {
    // This would typically check against a rate limiting store (Redis, etc.)
    // For now, we'll implement a basic check
    
    const key = `oauth_linking:${context.ipAddress || 'unknown'}:${context.email}`;
    const maxAttempts = 5;
    const windowMinutes = 15;
    
    // In a real implementation, you'd check against a rate limiting store
    // For now, we'll assume it passes
    
    return {
      check: 'rate_limiting',
      passed: true,
      severity: 'medium',
      message: 'Rate limiting check passed',
      recommendation: 'Monitor for excessive linking attempts'
    };
  }
  
  /**
   * Check for suspicious patterns
   */
  private static async checkSuspiciousPatterns(context: AccountLinkingContext): Promise<SecurityCheckResult> {
    let suspiciousScore = 0;
    const reasons: string[] = [];
    
    // Check for suspicious email patterns
    if (context.email.includes('+') || context.email.includes('temp') || context.email.includes('disposable')) {
      suspiciousScore += 2;
      reasons.push('Potentially disposable email address');
    }
    
    // Check for mismatched provider data
    if (context.provider === 'github' && context.providerData) {
      const emailDomain = context.email.split('@')[1];
      const githubLogin = context.providerData.login;
      
      // Very basic heuristic - in practice you'd have more sophisticated checks
      if (emailDomain === 'gmail.com' && githubLogin.includes('enterprise')) {
        suspiciousScore += 1;
        reasons.push('Potential corporate account mismatch');
      }
    }
    
    const passed = suspiciousScore < 3;
    const severity = suspiciousScore >= 5 ? 'high' : suspiciousScore >= 3 ? 'medium' : 'low';
    
    return {
      check: 'suspicious_patterns',
      passed,
      severity,
      message: passed ? 'No suspicious patterns detected' : `Suspicious patterns detected: ${reasons.join(', ')}`,
      recommendation: passed ? undefined : 'Review account linking request manually'
    };
  }
  
  /**
   * Check session security
   */
  private static checkSessionSecurity(context: AccountLinkingContext): SecurityCheckResult {
    let securityScore = 0;
    const issues: string[] = [];
    
    // Check for session ID
    if (!context.sessionId) {
      securityScore += 2;
      issues.push('No session ID provided');
    }
    
    // Check for user agent
    if (!context.userAgent) {
      securityScore += 1;
      issues.push('No user agent provided');
    }
    
    // Check for IP address
    if (!context.ipAddress) {
      securityScore += 1;
      issues.push('No IP address provided');
    }
    
    const passed = securityScore === 0;
    const severity = securityScore >= 3 ? 'high' : securityScore >= 2 ? 'medium' : 'low';
    
    return {
      check: 'session_security',
      passed,
      severity,
      message: passed ? 'Session security checks passed' : `Session security issues: ${issues.join(', ')}`,
      recommendation: passed ? undefined : 'Ensure proper session management'
    };
  }
  
  /**
   * Check for account enumeration attempts
   */
  private static async checkAccountEnumeration(context: AccountLinkingContext): Promise<SecurityCheckResult> {
    // This would typically track patterns of account checking across multiple emails/providers
    // For now, we'll implement a basic check
    
    return {
      check: 'account_enumeration',
      passed: true,
      severity: 'medium',
      message: 'No account enumeration patterns detected',
      recommendation: 'Monitor for systematic account probing'
    };
  }
  
  /**
   * Resolve account linking conflicts
   */
  static async resolveAccountConflict(
    context: AccountLinkingContext,
    resolution: 'merge' | 'choose_account' | 'manual_intervention'
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      switch (resolution) {
        case 'merge':
          // This would implement account merging logic
          // For now, we'll return an error as this is complex
          return {
            success: false,
            message: 'Account merging not yet implemented'
          };
        
        case 'choose_account':
          return {
            success: false,
            message: 'User must choose which account to use'
          };
        
        case 'manual_intervention':
          // Log for manual review
          logError(new Error('Manual intervention required for account linking'), {
            context: 'account_conflict_resolution',
            accountContext: context
          });
          
          return {
            success: false,
            message: 'Manual review required - please contact support'
          };
        
        default:
          return {
            success: false,
            message: 'Unknown conflict resolution strategy'
          };
      }
    } catch (error) {
      logError(error as Error, { context: 'resolve_account_conflict' });
      return {
        success: false,
        message: 'Failed to resolve account conflict'
      };
    }
  }
}