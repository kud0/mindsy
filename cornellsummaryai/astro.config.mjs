// astro.config.mjs
// @ts-check
import { defineConfig } from 'astro/config';

// Your other integrations
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// Import remark plugin
import { remarkBlogImages } from './src/lib/remark-blog-images.ts';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Site URL for RSS feeds and sitemaps
  site: process.env.SITE_URL || 'https://mysummary.app', // Update this with your actual domain
  
  // This is correct, you need the server output for Vercel
  output: 'server',

  // Use the adapter property for Vercel
  adapter: vercel({
    webAnalytics: { enabled: false }
  }),

  // The integrations array for other integrations
  integrations: [
    tailwind(), 
    sitemap(), 
    react({
      experimentalReactChildren: true
    })
  ],

  // Markdown configuration
  markdown: {
    remarkPlugins: [remarkBlogImages],
    shikiConfig: {
      theme: 'github-light',
      wrap: true
    }
  },

  // Image optimization configuration
  image: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com'
      }
    ]
  },

  // i18n configuration
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: false
    }
  },

  // Vite configuration for proper JSX handling
  vite: {
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'react'
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime']
    }
  }
});