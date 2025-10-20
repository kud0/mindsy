# Mobile-First Design Checklist

Use this checklist for EVERY feature/component in Mindsy.

## Overview

Mindsy is a **MOBILE-FIRST** application targeting **Gen Z students** who primarily use their phones for studying. Every feature must be designed and tested for mobile FIRST, then adapted for larger screens.

---

## Layout & Structure

- [ ] Designed mobile layout first (375px - 428px viewport)
- [ ] Vertical stack on mobile (no horizontal overflow)
- [ ] Horizontal layout only on tablet/desktop (768px+)
- [ ] No horizontal scrolling except intentional carousels
- [ ] Full-width containers on mobile, max-width on desktop
- [ ] Content fits within viewport without zooming
- [ ] Proper spacing between sections (16px+ on mobile)

## Touch Targets & Interactions

- [ ] All buttons are 44px × 44px minimum
- [ ] All tappable elements have 44px minimum height
- [ ] Adequate spacing between tappable elements (8px+ margin)
- [ ] No hover-only interactions (mobile has no hover)
- [ ] Large tap areas for common actions
- [ ] Clear visual feedback on tap (instant state change)
- [ ] Disabled states clearly visible

## Navigation & Accessibility

- [ ] Bottom navigation on mobile (not top)
- [ ] Sticky headers/footers where appropriate
- [ ] Thumb-zone reachability (bottom 2/3 of screen)
- [ ] Swipe gestures for navigation work smoothly
- [ ] Back button easily accessible (top-left or gesture)
- [ ] Tab navigation follows natural flow
- [ ] Focus states visible for keyboard users

## Content & Typography

- [ ] Text readable at 16px base (NEVER smaller on mobile)
- [ ] Line length appropriate on mobile (45-75 characters)
- [ ] Headings properly sized for mobile (not too large)
- [ ] Line height 1.5+ for body text
- [ ] Sufficient contrast ratio (WCAG AA: 4.5:1 minimum)
- [ ] Text doesn't require horizontal scrolling
- [ ] Font sizes scale appropriately across breakpoints

## Forms & Input

- [ ] Large input fields (44px+ height)
- [ ] Proper input types (tel, email, number, url, date)
- [ ] Clear labels and placeholders
- [ ] Error messages visible and helpful
- [ ] Submit buttons full-width on mobile
- [ ] Input focus states clear
- [ ] Keyboard opens without breaking layout
- [ ] Auto-complete attributes where appropriate
- [ ] Form validation provides instant feedback

## Images & Media

- [ ] Images optimized for mobile (WebP format)
- [ ] Responsive images with srcset
- [ ] Lazy loading for images below the fold
- [ ] Videos don't autoplay (data consideration)
- [ ] Media fits within viewport
- [ ] Alt text provided for accessibility
- [ ] Loading skeletons for images

## Performance (Mobile-First)

- [ ] Tested on slow 3G network simulation
- [ ] Lazy loading for heavy components
- [ ] Optimized bundle size (<200KB for mobile)
- [ ] Fast page transitions (<300ms)
- [ ] Minimal JavaScript on initial load
- [ ] Critical CSS inlined
- [ ] Images compressed and optimized
- [ ] No layout shifts during load (CLS < 0.1)

## Testing Requirements

### Viewport Testing
- [ ] Tested on iPhone SE (375px width)
- [ ] Tested on iPhone 14 Pro (393px width)
- [ ] Tested on iPhone 14 Pro Max (428px width)
- [ ] Tested on Android (360px - 412px range)
- [ ] Tested in Chrome DevTools mobile view
- [ ] Tested in portrait orientation
- [ ] Tested in landscape orientation

### Device Testing
- [ ] Tested on actual iOS device (iPhone)
- [ ] Tested on actual Android device
- [ ] Tested with touch simulation enabled
- [ ] Tested with slow network throttling
- [ ] Tested with different text zoom levels (125%, 150%)

### Browser Testing
- [ ] Works in Safari iOS (primary browser)
- [ ] Works in Chrome Mobile
- [ ] Works in Chrome Android
- [ ] Works in Samsung Internet

## Gen Z UX Patterns

- [ ] Instant feedback on all interactions
- [ ] Smooth animations (60fps, spring physics)
- [ ] Native-like feel (bottom sheets, pull-to-refresh)
- [ ] Minimal friction (1-tap actions where possible)
- [ ] Gamification elements where appropriate
- [ ] Share-friendly features
- [ ] Dark mode support
- [ ] Emoji support (if relevant)

## Component-Specific Patterns

### Buttons
- [ ] Full-width on mobile (<768px)
- [ ] Auto-width on desktop (>=768px)
- [ ] 44px minimum height
- [ ] Clear labels (not just icons)
- [ ] Loading states with spinner

### Modals/Dialogs
- [ ] Use bottom sheets on mobile
- [ ] Use centered modals on desktop
- [ ] Easy to dismiss (swipe down on mobile)
- [ ] Backdrop prevents body scroll
- [ ] Keyboard-friendly (ESC to close)

### Lists
- [ ] Infinite scroll preferred over pagination
- [ ] Pull-to-refresh on mobile
- [ ] Swipe actions on list items (delete, archive)
- [ ] Clear loading states
- [ ] Empty states designed

### Navigation
- [ ] Bottom tabs on mobile (primary nav)
- [ ] Top navigation on desktop
- [ ] Hamburger menu only if necessary
- [ ] Max 5 items in bottom nav
- [ ] Active state clearly visible

### Cards
- [ ] Full-width on mobile (minus padding)
- [ ] Grid layout on desktop
- [ ] Tappable area is entire card
- [ ] Clear visual hierarchy
- [ ] Actions accessible via tap or swipe

### Forms
- [ ] One field per row on mobile
- [ ] Multi-column on desktop only
- [ ] Auto-advance for OTP/PIN inputs
- [ ] Inline validation
- [ ] Sticky submit button at bottom

### Tables
- [ ] Convert to cards on mobile
- [ ] Horizontal scroll with sticky column (if needed)
- [ ] Never use <table> for layout on mobile
- [ ] Show most important data first

## Breakpoints

```css
/* Mobile-first breakpoints */
/* xs: 0-374px (smallest phones) */
/* sm: 375px-767px (phones) - DEFAULT, design here first */
/* md: 768px-1023px (tablets) */
/* lg: 1024px-1279px (small desktop) */
/* xl: 1280px+ (large desktop) */
```

## Mobile-First CSS Pattern

```css
/* ✅ CORRECT: Mobile-first */
.button {
  /* Mobile styles (default) */
  width: 100%;
  padding: 16px;
  font-size: 16px;

  /* Desktop enhancement */
  @media (min-width: 768px) {
    width: auto;
    padding: 12px 24px;
    font-size: 14px;
  }
}

/* ❌ WRONG: Desktop-first */
.button {
  width: auto; /* Desktop default */

  @media (max-width: 767px) {
    width: 100%; /* Mobile override */
  }
}
```

## Red Flags to Avoid

### Interaction Red Flags
- ❌ Hover-only interactions (no hover on mobile)
- ❌ Small touch targets (<44px)
- ❌ Hover tooltips (use tap or always-visible)
- ❌ Double-click interactions
- ❌ Right-click context menus (use long-press)

### Layout Red Flags
- ❌ Horizontal scrolling (except carousels)
- ❌ Fixed pixel widths
- ❌ Desktop-first media queries
- ❌ Top-heavy navigation
- ❌ Tiny text (<16px base)
- ❌ Densely packed UI

### Performance Red Flags
- ❌ Large bundle sizes (>200KB mobile)
- ❌ Unoptimized images
- ❌ No lazy loading
- ❌ Blocking scripts in <head>
- ❌ Layout shifts during load

### UX Red Flags
- ❌ Complex multi-step forms
- ❌ Pagination instead of infinite scroll
- ❌ Modal dialogs (use bottom sheets)
- ❌ Tiny close buttons (X)
- ❌ No loading states
- ❌ Poor error messages

## Gen Z Expectations

Gen Z users (born 1997-2012) have specific expectations:

### Speed
- ⚡ Instant feedback (<100ms)
- ⚡ Fast page loads (<2s)
- ⚡ Smooth animations (60fps)
- ⚡ No janky scrolling

### Visual
- 🎨 Bold, vibrant colors
- 🎨 Clear visual hierarchy
- 🎨 Consistent design system
- 🎨 Native-like animations

### Interaction
- 🌊 Gesture-based navigation
- 🌊 Swipe to dismiss/delete
- 🌊 Pull-to-refresh
- 🌊 Bottom sheet modals

### Features
- 📱 Instagram/TikTok-like feel
- 📱 Share to social media
- 📱 Dark mode
- 📱 Emoji reactions
- 📱 Real-time updates

### Values
- 🎯 Minimal friction
- 🎯 Privacy-conscious
- 🎯 Inclusive/accessible
- 🎯 Authentic/genuine

## Testing Viewport Sizes

### Primary Targets (Design Here First)
- iPhone SE: 375px × 667px
- iPhone 14 Pro: 393px × 852px
- iPhone 14 Pro Max: 428px × 926px

### Secondary Targets (Test Compatibility)
- Galaxy S23: 360px × 780px
- Pixel 7: 412px × 915px
- iPad Mini: 768px × 1024px

### Tertiary Targets (Enhancement Only)
- iPad Pro: 1024px × 1366px
- Desktop: 1280px+ × variable

## Before Submitting Your Work

Run through this final checklist:

- [ ] Designed mobile layout FIRST (not adapted from desktop)
- [ ] All touch targets are 44px minimum
- [ ] No hover-only interactions
- [ ] Tested on 375px viewport (iPhone SE)
- [ ] Tested on 428px viewport (iPhone 14 Pro Max)
- [ ] Tested with slow 3G throttling
- [ ] Bottom navigation/actions on mobile
- [ ] Text is 16px+ base size
- [ ] Native-like animations and transitions
- [ ] Instant visual feedback on interactions
- [ ] Feels like an Instagram/TikTok-quality mobile app
- [ ] Gen Z user would find it intuitive and fast

---

## Quick Reference: Common Patterns

### Bottom Navigation
```tsx
<nav className="fixed bottom-0 left-0 right-0 border-t bg-background md:hidden">
  <div className="flex justify-around">
    <Link className="flex flex-col items-center gap-1 py-3 flex-1">
      <Icon className="w-6 h-6" />
      <span className="text-xs">Label</span>
    </Link>
  </div>
</nav>
```

### Bottom Sheet (Mobile Modal)
```tsx
<Sheet>
  <SheetContent side="bottom" className="md:max-w-lg md:mx-auto">
    {/* Content */}
  </SheetContent>
</Sheet>
```

### Full-Width Button on Mobile
```tsx
<Button className="w-full md:w-auto">
  Submit
</Button>
```

### Card Grid (Mobile Stack, Desktop Grid)
```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  <Card />
  <Card />
  <Card />
</div>
```

### Form Input (Large Touch Target)
```tsx
<Input
  className="h-12 text-base" // 48px height, 16px text
  type="email"
  autoComplete="email"
/>
```

---

**Remember:** If it doesn't work perfectly on a 375px iPhone, it's not ready to ship. Mobile FIRST, always.
