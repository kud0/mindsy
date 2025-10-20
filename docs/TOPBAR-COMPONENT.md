# TopBar Component Documentation

## Overview

A clean, glassmorphic sticky header component for the Mindsy dashboard with navigation and notification features.

## Component Location

**File:** `/components/layout/TopBar.tsx`

## Visual Design

```
┌─────────────────────────────────────────────────────────────────┐
│  MINDSY                                                    🔔   │  ← Sticky Header
└─────────────────────────────────────────────────────────────────┘
  ↑                                                           ↑
  Logo/Brand                                           Notification Bell
  (clickable)                                          (with badge indicator)
```

## Glassmorphism Effect

The component uses Tailwind CSS classes to achieve a modern frosted glass appearance:

### Key CSS Classes:

```tsx
className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
```

**Breakdown:**
- `sticky top-0 z-50` - Stays at top of viewport when scrolling, above all content
- `bg-background/95` - 95% opacity background (semi-transparent)
- `backdrop-blur` - Blur effect on content behind (frosted glass)
- `supports-[backdrop-filter]:bg-background/60` - Enhanced blur on supported browsers (60% opacity)
- `border-b border-border/40` - Subtle bottom border with 40% opacity

**Visual Result:**
- Semi-transparent background that reveals blurred content underneath
- Smooth transition as content scrolls beneath
- Subtle border for definition without harshness
- Works perfectly in both light and dark mode

## Component Structure

```tsx
<header> (glassmorphic sticky container)
  └─ <div> (flex container)
      ├─ <div> (left side)
      │   └─ <h1> "MINDSY" (clickable logo)
      │
      └─ <div> (right side)
          └─ <Button> Bell icon (notifications)
              └─ <span> Red badge (conditional)
```

## Features

### 1. Sticky Positioning
- Remains at top of viewport during scroll
- z-index of 50 ensures it stays above content
- Glassmorphic background maintains visibility

### 2. Logo/Brand
- Text: "MINDSY" in bold, 20px (text-xl)
- Clickable - navigates to `/dashboard`
- Hover effect: transitions to primary color
- Custom click handler support via props

### 3. Notification Bell
- Icon: Lucide React Bell (20px)
- Ghost button style (transparent, subtle hover)
- Minimum 44px tap target (accessibility)
- Navigates to notifications tab on click
- Conditional notification badge

### 4. Notification Badge
- Small red dot (8px circle)
- Positioned top-right of bell icon
- Pulse animation for visibility
- Only shows when `notificationCount > 0`
- Accessible aria-label for screen readers

## Props Interface

```tsx
interface TopBarProps {
  showNotifications?: boolean;  // Show/hide bell icon (default: true)
  onLogoClick?: () => void;     // Custom logo click handler (optional)
  notificationCount?: number;   // Unread notification count (default: 0)
}
```

**Usage Examples:**

```tsx
// Basic usage (default behavior)
<TopBar />

// Hide notifications
<TopBar showNotifications={false} />

// With notification badge
<TopBar notificationCount={5} />

// Custom logo click
<TopBar onLogoClick={() => console.log('Logo clicked!')} />
```

## Integration

### Current Integration:
**File:** `/components/layout/ResponsiveBentoGrid.tsx`

The TopBar is rendered at the top of the dashboard homepage:

```tsx
return (
  <>
    <TopBar />
    <div className="max-w-6xl mx-auto p-6 pt-6">
      {/* Dashboard widgets */}
    </div>
  </>
);
```

### Future Integration:
Can be easily added to any page:

```tsx
import { TopBar } from '@/components/layout/TopBar';

export default function SomePage() {
  return (
    <>
      <TopBar />
      {/* Page content */}
    </>
  );
}
```

## Responsive Design

### Desktop (> 768px)
- Full spacing: `px-6` (24px horizontal padding)
- Logo and bell well-spaced

### Tablet (640px - 768px)
- Standard spacing: `px-4` (16px horizontal padding)
- Compact but comfortable

### Mobile (< 640px)
- Compact spacing: `px-4` (16px horizontal padding)
- Logo doesn't wrap
- Bell icon maintains minimum tap target (44px)
- Text remains readable

**Breakpoint Classes:**
```tsx
className="px-4 md:px-6"  // 16px mobile, 24px desktop
```

## Accessibility Features

### ARIA Labels
```tsx
<Button aria-label="Notifications">
  <Bell />
</Button>

<span aria-label={`${notificationCount} unread notifications`} />
```

### Semantic HTML
- `<header>` - Semantic header element
- `<h1>` - Proper heading hierarchy for logo
- `<button>` - Keyboard accessible

### Keyboard Navigation
- Bell button is focusable
- Tab order: Logo → Bell
- Enter/Space activates buttons
- Focus indicators visible

### Color Contrast
- Uses theme colors (`text-foreground`)
- Sufficient contrast in light/dark mode
- WCAG AA compliant

## Theme Support

### Light Mode
- Background: `bg-background/95` (light gray, semi-transparent)
- Text: `text-foreground` (dark text)
- Border: `border-border/40` (subtle gray)

### Dark Mode
- Background: `bg-background/95` (dark gray, semi-transparent)
- Text: `text-foreground` (light text)
- Border: `border-border/40` (subtle light gray)
- Automatically adapts via Tailwind theme

## Performance Considerations

### Optimizations
- Minimal re-renders (simple props)
- No heavy computations
- CSS-only animations (GPU accelerated)
- `backdrop-blur` uses hardware acceleration

### Bundle Size
- Uses existing Shadcn Button component
- Lucide icons (tree-shakeable)
- No additional dependencies

## Future Enhancements

### Possible Additions
1. **Search Bar** - Add search functionality in center
2. **User Avatar** - Profile picture dropdown menu
3. **Quick Actions** - Additional icon buttons
4. **Breadcrumbs** - Show current page path
5. **Theme Toggle** - Light/dark mode switch

### Extensibility
Component is designed to be easily extended with props:

```tsx
interface TopBarProps {
  // Existing props...
  showSearch?: boolean;
  showUserMenu?: boolean;
  breadcrumbs?: string[];
}
```

## Browser Support

### Full Support
- Chrome/Edge (Chromium) - Full glassmorphism
- Safari - Full glassmorphism
- Firefox - Full glassmorphism

### Fallback
- Older browsers: `bg-background/95` without blur
- Graceful degradation
- Still functional and readable

## Technical Notes

### Glassmorphism CSS Breakdown

**Standard backdrop blur:**
```css
backdrop-blur /* applies blur filter to background */
```

**Feature query for better browsers:**
```css
supports-[backdrop-filter]:bg-background/60
/* Reduces opacity to 60% when backdrop-filter is supported */
/* This enhances the "frosted glass" effect */
```

**Why two opacity values?**
- `bg-background/95` - Default (better readability on unsupported browsers)
- `bg-background/60` - Enhanced effect (more transparent on supported browsers)

### Sticky Positioning

```css
position: sticky;
top: 0;        /* sticks to top of viewport */
z-index: 50;   /* above content (z-index scale: 0-50-100) */
```

**Behavior:**
1. Scrolls normally until reaching `top: 0`
2. "Sticks" at top of viewport
3. Remains visible while content scrolls beneath
4. Glassmorphic background shows blurred content underneath

## Testing Checklist

- ✅ Component renders without errors
- ✅ Sticky positioning works on scroll
- ✅ Logo click navigates to dashboard
- ✅ Bell click navigates to notifications
- ✅ Notification badge appears when count > 0
- ✅ Responsive on mobile, tablet, desktop
- ✅ Keyboard navigation works
- ✅ Dark mode styling correct
- ✅ Light mode styling correct
- ✅ Glassmorphism effect visible
- ✅ ARIA labels present

## Design Rationale

### Why Glassmorphism?
- Modern, clean aesthetic
- Adds depth without heaviness
- Context awareness (shows content underneath)
- Professional appearance

### Why Sticky?
- Persistent navigation access
- No need to scroll back to top
- Better UX for long pages
- Industry standard pattern

### Why Minimal?
- Doesn't distract from content
- Fast, performant
- Scales well with additions
- Clean, professional look

---

**Created:** 2025-10-20
**Component Version:** 1.0.0
**Status:** Production Ready ✅
