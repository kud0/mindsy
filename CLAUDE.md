# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mindsy is a Next.js 15 application using the App Router architecture, TypeScript, Tailwind CSS 4, and React 19. This is a fresh project created with `create-next-app` using Turbopack for development.

**Backend Services:**
- **Supabase** - Complete backend solution providing:
  - PostgreSQL database
  - File storage
  - Authentication with OAuth support
  - Real-time subscriptions
  - Row Level Security (RLS)

## Development Commands

```bash
# Development server with Turbopack
npm run dev

# Production build with Turbopack  
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## Architecture & Structure

### App Router Structure
- Uses Next.js App Router (not Pages Router)
- Main layout: `app/layout.tsx` - defines root HTML structure with Geist fonts
- Home page: `app/page.tsx` - main landing page component
- Global styles: `app/globals.css` - Tailwind imports with custom CSS variables

### Styling System
- **Tailwind CSS 4** with PostCSS plugin configuration
- CSS custom properties for theming (light/dark mode support)
- Geist Sans and Geist Mono fonts from next/font/google
- CSS variables: `--background`, `--foreground` with dark mode media queries

### TypeScript Configuration  
- Strict mode enabled
- Path aliases: `@/*` maps to root directory
- Next.js plugin integration
- Modern ES2017+ target with bundler module resolution

### Key Technologies
- **Next.js 15** with Turbopack for fast builds
- **React 19** 
- **TypeScript 5**
- **Tailwind CSS 4** with new architecture
- **ESLint** with Next.js and TypeScript extensions
- **Supabase** for backend services (database, auth, storage)

## Development Notes

### File Organization
- All app code in `app/` directory (App Router)
- Static assets in `public/` directory
- TypeScript configuration supports both `.ts` and `.tsx` files

### Styling Patterns
- Uses Tailwind utility classes extensively
- Custom CSS variables for consistent theming
- Dark mode support via `prefers-color-scheme` media queries
- Component-level styling with Tailwind classes

### Build System
- Turbopack enabled for both dev and build commands
- ESLint configuration extends Next.js core web vitals and TypeScript rules
- PostCSS processes Tailwind CSS through `@tailwindcss/postcss` plugin

### Font Loading
- Geist fonts loaded via next/font/google for optimization
- Font variables applied through CSS custom properties
- Antialiasing enabled globally via Tailwind classes

## Supabase Integration

### Authentication
- OAuth providers supported through Supabase Auth
- Server-side auth validation with Next.js middleware
- User session management via Supabase client
- Protected routes using Supabase auth helpers

### Database
- PostgreSQL database with Row Level Security (RLS)
- Type-safe database queries using Supabase client
- Real-time subscriptions for live data updates
- Database migrations managed through Supabase CLI

### Storage
- File uploads and downloads via Supabase Storage
- Bucket-based organization with access policies
- Image optimization and transformation support
- CDN delivery for optimal performance

### Environment Setup
Required environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```