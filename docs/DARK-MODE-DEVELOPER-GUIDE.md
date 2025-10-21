# Dark Mode Developer Guide

**Quick Reference for Next.js 15 + React 19 + Tailwind CSS 4**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Color System](#color-system)
3. [Common Patterns](#common-patterns)
4. [Do's and Don'ts](#dos-and-donts)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### ✅ Always Use CSS Variables

```tsx
// ✅ GOOD - Uses CSS variables
<div className="bg-background text-foreground border-border">
  Content
</div>

// ❌ BAD - Hardcoded colors
<div className="bg-white text-gray-900 border-gray-200">
  Content
</div>
```

### ✅ Add Dark Variants for Utility Colors

```tsx
// ✅ GOOD - Explicit dark variants
<div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
  Success message
</div>

// ❌ BAD - Only light mode colors
<div className="bg-green-50 text-green-600">
  Success message
</div>
```

### ✅ Test in Both Modes

```bash
# 1. Start dev server
npm run dev

# 2. Open http://localhost:3001
# 3. Click theme toggle (sun/moon icon)
# 4. Verify component looks good in both modes
```

---

## Color System

### Semantic Color Tokens

Our design system uses **semantic tokens** that automatically adapt to light/dark mode.

#### Backgrounds

| Token | Tailwind Class | Use Case | Example |
|---|---|---|---|
| `--background` | `bg-background` | Page background | Main app background |
| `--card` | `bg-card` | Card/elevated surface | Widget, modal background |
| `--secondary` | `bg-secondary` | Secondary background | Sidebar, alternate sections |
| `--muted` | `bg-muted` | Muted/subtle background | Disabled states, hover |
| `--accent` | `bg-accent` | Accent/highlight | Selected item background |
| `--popover` | `bg-popover` | Popover/tooltip | Dropdown menus |

#### Text

| Token | Tailwind Class | Use Case | Example |
|---|---|---|---|
| `--foreground` | `text-foreground` | Primary text | Headings, body text |
| `--muted-foreground` | `text-muted-foreground` | Secondary text | Descriptions, metadata |
| `--card-foreground` | `text-card-foreground` | Text on cards | Card content text |
| `--popover-foreground` | `text-popover-foreground` | Text in popovers | Dropdown text |

#### Interactive

| Token | Tailwind Class | Use Case | Example |
|---|---|---|---|
| `--primary` | `bg-primary` `text-primary` | Primary actions | CTA buttons, links |
| `--destructive` | `bg-destructive` | Destructive actions | Delete button |
| `--border` | `border-border` | Component borders | Card borders, dividers |
| `--input` | `bg-input` | Form inputs | Text field backgrounds |
| `--ring` | `ring-ring` | Focus rings | Keyboard focus indicator |

### Status Colors (Require Dark Variants)

These colors **do not** have automatic CSS variables. You must add `dark:` variants.

```tsx
// Success
<div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">

// Error
<div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">

// Warning
<div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400">

// Info
<div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
```

---

## Common Patterns

### Pattern 1: Basic Component

```tsx
export function MyComponent() {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg p-4">
      <h2 className="text-lg font-semibold text-foreground">
        Title
      </h2>
      <p className="text-sm text-muted-foreground">
        Description text
      </p>
    </div>
  );
}
```

**Result**:
- ✅ Works in light mode
- ✅ Works in dark mode
- ✅ No hardcoded colors

---

### Pattern 2: Interactive Button

```tsx
export function MyButton() {
  return (
    <button className="
      bg-background
      hover:bg-muted
      active:bg-muted/80
      text-foreground
      border border-border
      rounded-lg px-4 py-2
      transition-colors
    ">
      Click me
    </button>
  );
}
```

**Result**:
- ✅ Hover state adapts to theme
- ✅ Focus state uses `--ring` color
- ✅ Smooth transitions

---

### Pattern 3: Status Badge

```tsx
type BadgeVariant = 'success' | 'error' | 'warning' | 'info';

export function Badge({ variant }: { variant: BadgeVariant }) {
  const variants = {
    success: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    error: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${variants[variant]}`}>
      Badge
    </span>
  );
}
```

**Result**:
- ✅ Status colors work in both modes
- ✅ Good contrast in dark mode
- ✅ Consistent API

---

### Pattern 4: Navigation Bar

```tsx
export function NavBar() {
  return (
    <nav className="
      bg-background/80
      backdrop-blur-xl
      border-b border-border/50
      sticky top-0 z-50
    ">
      <div className="flex items-center gap-4 px-4 py-3">
        <button className="
          text-muted-foreground
          hover:text-foreground
          hover:bg-muted
          rounded-lg p-2
          transition-colors
        ">
          <MenuIcon />
        </button>
      </div>
    </nav>
  );
}
```

**Result**:
- ✅ Transparent background works in both modes
- ✅ Border is subtle but visible
- ✅ Icons have proper contrast

---

### Pattern 5: Form Input

```tsx
export function TextInput() {
  return (
    <input
      type="text"
      className="
        w-full
        bg-input
        text-foreground
        placeholder:text-muted-foreground
        border border-border
        focus:ring-2 focus:ring-ring
        rounded-lg px-3 py-2
        outline-none
      "
      placeholder="Enter text..."
    />
  );
}
```

**Result**:
- ✅ Input background adapts
- ✅ Placeholder text is readable
- ✅ Focus ring uses theme color

---

### Pattern 6: Modal/Dialog

```tsx
export function MyModal({ isOpen, onClose }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <div className="
        relative
        bg-card
        text-card-foreground
        border border-border
        rounded-2xl
        shadow-2xl
        w-full max-w-md
        p-6
      ">
        <h2 className="text-xl font-bold text-foreground">
          Modal Title
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Modal content
        </p>
      </div>
    </div>
  );
}
```

**Result**:
- ✅ Backdrop works in both modes
- ✅ Card stands out from backdrop
- ✅ Text is readable

---

### Pattern 7: Gradient Background

```tsx
export function HeroSection() {
  return (
    <section className="
      bg-gradient-to-br
      from-blue-100 via-purple-100 to-pink-100
      dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30
      rounded-2xl p-8
    ">
      <h1 className="text-3xl font-bold text-foreground">
        Hero Title
      </h1>
    </section>
  );
}
```

**Result**:
- ✅ Gradient is subtle in dark mode
- ✅ Text maintains contrast
- ✅ Visual hierarchy preserved

---

### Pattern 8: Icon with Label

```tsx
export function IconButton({ icon: Icon, label }: IconButtonProps) {
  return (
    <button className="
      flex flex-col items-center gap-2
      text-muted-foreground
      hover:text-foreground
      hover:bg-muted
      rounded-lg p-3
      transition-colors
    ">
      <Icon className="w-6 h-6" />
      <span className="text-xs">{label}</span>
    </button>
  );
}
```

**Result**:
- ✅ Icon inherits text color
- ✅ Hover state is visible
- ✅ Label is readable

---

## Do's and Don'ts

### ✅ DO

| Rule | Example |
|---|---|
| **Use semantic tokens** | `bg-background` instead of `bg-white` |
| **Test in both modes** | Click theme toggle before committing |
| **Add dark variants** | `text-blue-600 dark:text-blue-400` |
| **Use CSS variables** | Consistent with design system |
| **Keep contrast ≥4.5:1** | WCAG AA compliance |
| **Use `hover:`/`active:` states** | `hover:bg-muted` |
| **Group related classes** | Background, text, border together |

### ❌ DON'T

| Rule | Why |
|---|---|
| **Hardcode `bg-white`** | Breaks dark mode completely |
| **Hardcode `text-gray-*`** | Text becomes invisible |
| **Forget `dark:` variants** | Status colors won't work |
| **Use `!important`** | Prevents theme overrides |
| **Mix patterns** | Use CSS vars OR dark variants, not both |
| **Assume light mode** | Always test dark mode |
| **Ignore accessibility** | Contrast matters |

---

## Testing

### Manual Testing Checklist

```
☐ Component renders in light mode
☐ Component renders in dark mode
☐ All text is readable (no white-on-white, black-on-black)
☐ Borders are visible
☐ Hover states work
☐ Focus states work
☐ Transitions are smooth (200ms)
☐ No flash of wrong theme on page load
☐ Theme preference persists after refresh
```

### Browser DevTools

**Toggle theme**:
```javascript
// In browser console
document.documentElement.classList.toggle('dark');
```

**Check computed colors**:
```javascript
// Get CSS variable value
getComputedStyle(document.documentElement).getPropertyValue('--background');
```

### Automated Testing

**Playwright test**:
```typescript
test('Component works in dark mode', async ({ page }) => {
  await page.goto('/your-page');

  // Switch to dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });

  // Take screenshot
  await expect(page).toHaveScreenshot('component-dark.png');

  // Verify elements are visible
  await expect(page.locator('.my-component')).toBeVisible();
});
```

---

## Troubleshooting

### Problem: Text is invisible in dark mode

**Cause**: Hardcoded `text-gray-*` without dark variant

**Solution**:
```tsx
// ❌ BEFORE
<p className="text-gray-900">Text</p>

// ✅ AFTER
<p className="text-foreground">Text</p>
```

---

### Problem: White box on white background

**Cause**: Hardcoded `bg-white` without dark variant

**Solution**:
```tsx
// ❌ BEFORE
<div className="bg-white">

// ✅ AFTER
<div className="bg-background">
```

---

### Problem: Border disappears in dark mode

**Cause**: Light border color (`border-gray-200`)

**Solution**:
```tsx
// ❌ BEFORE
<div className="border border-gray-200">

// ✅ AFTER
<div className="border border-border">
```

---

### Problem: Success badge is unreadable in dark mode

**Cause**: Missing `dark:` variants for status colors

**Solution**:
```tsx
// ❌ BEFORE
<span className="bg-green-50 text-green-600">

// ✅ AFTER
<span className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
```

---

### Problem: Gradient is too bright in dark mode

**Cause**: Light gradient colors don't have dark variants

**Solution**:
```tsx
// ❌ BEFORE
<div className="bg-gradient-to-r from-blue-100 to-purple-100">

// ✅ AFTER
<div className="bg-gradient-to-r from-blue-100 dark:from-blue-900/30 to-purple-100 dark:to-purple-900/30">
```

---

### Problem: CSS variable not working

**Cause**: Typo or incorrect usage

**Solution**:
```tsx
// ❌ WRONG
<div className="bg-var(--background)">

// ✅ CORRECT
<div className="bg-background">

// Or in custom CSS:
<div className="custom-class" />

// styles.css
.custom-class {
  background: var(--background);
}
```

---

### Problem: Theme doesn't persist after refresh

**Cause**: localStorage not being read/written correctly

**Solution**: Check ThemeProvider is wrapping your app in `layout.tsx`

```tsx
import { ThemeProvider } from '@/lib/contexts/theme-context';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="light">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│ DARK MODE QUICK REFERENCE                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Backgrounds:                                                 │
│   bg-white           →  bg-background                        │
│   bg-gray-50         →  bg-secondary                         │
│   bg-gray-100        →  bg-muted                             │
│                                                              │
│ Text:                                                        │
│   text-black         →  text-foreground                      │
│   text-gray-900      →  text-foreground                      │
│   text-gray-600      →  text-muted-foreground                │
│                                                              │
│ Borders:                                                     │
│   border-gray-200    →  border-border                        │
│   border-gray-300    →  border-border                        │
│                                                              │
│ Status Colors (add dark: variants):                          │
│   bg-green-50        →  + dark:bg-green-900/20               │
│   text-green-600     →  + dark:text-green-400                │
│                                                              │
│ Interactive:                                                 │
│   hover:bg-gray-100  →  hover:bg-muted                       │
│   hover:text-gray-900 → hover:text-foreground                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Additional Resources

- **Tailwind CSS Dark Mode Docs**: https://tailwindcss.com/docs/dark-mode
- **Shadcn/UI Theming**: https://ui.shadcn.com/docs/theming
- **WCAG Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Next.js Themes**: https://github.com/pacocoursey/next-themes

---

## Need Help?

1. Check this guide first
2. Run issue scanner: `bash scripts/check-dark-mode-issues.sh`
3. Review dark mode audit: `docs/DARK-MODE-AUDIT.md`
4. Ask team for code review

---

**Last Updated**: 2025-10-21
**Version**: 1.0
