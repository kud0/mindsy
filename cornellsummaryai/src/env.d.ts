/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly N8N_WEBHOOK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    user: import('@supabase/supabase-js').User | null;
    currentLang: 'en' | 'es';
    // OAuth authentication context
    isOAuthUser?: boolean;
    oauthProvider?: string;
    // GitHub-specific OAuth context
    githubId?: string;
    githubUsername?: string;
  }
} 