import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    env: {
      PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      OPENAI_KEY: 'sk-test-key-for-testing'
    }
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});