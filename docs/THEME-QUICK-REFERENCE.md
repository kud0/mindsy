# Theme System Quick Reference

**Last Updated**: 2025-10-19
**For**: Developers working on Mindsy

---

## TL;DR

**Current Status**:
- ✅ Custom theme provider works (light/dark modes)
- ❌ Theme toggle **DISABLED** in production
- ⚠️ Dark mode support **INCOMPLETE** across components
- 📦 `next-themes` installed but **UNUSED**

**Quick Wins**:
1. Enable theme toggle in `AppMenuPopover.tsx`
2. Fix `BottomNavbar` dark mode
3. Fix `BaseWidget` dark mode
4. Migrate to `next-themes` (recommended)

---

## How to Use Themes (Current System)

### 1. Access Theme in Components

```tsx
import { useTheme } from '@/lib/contexts/theme-context'

export function MyComponent() {
  const { theme, setTheme } = useTheme()

  // Current theme: 'light' | 'dark'
  console.log(theme)

  // Switch theme
  setTheme('dark')
  setTheme('light')
}
```

### 2. Style Components for Dark Mode

**Option A: Use Semantic Tokens** (Recommended for UI components)
```tsx
<div className="bg-background text-foreground">
  <h1 className="text-foreground">Title</h1>
  <p className="text-muted-foreground">Subtitle</p>
</div>
```

**Option B: Use Tailwind dark: Modifier** (Recommended for custom components)
```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <button className="bg-blue-500 dark:bg-blue-600">
    Click me
  </button>
</div>
```

**Option C: Use CSS Variables** (For complex cases)
```tsx
<div style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
  Content
</div>
```

---

## Available Color Tokens

### Base Tokens
```
bg-background           # Main app background
text-foreground         # Main text color

bg-card                 # Card/widget background
text-card-foreground    # Card text

bg-popover              # Popover/dropdown background
text-popover-foreground # Popover text

bg-primary              # Primary action color (purple)
text-primary-foreground # Text on primary

bg-secondary            # Secondary elements
text-secondary-foreground

bg-muted                # Disabled/inactive states
text-muted-foreground   # Secondary text

bg-accent               # Hover/focus states
text-accent-foreground

bg-destructive          # Error/danger actions
text-destructive-foreground

border-border           # Borders
bg-input                # Input fields
ring-ring               # Focus rings
```

### Example Usage
```tsx
// Good - Uses semantic tokens
<Card className="bg-card text-card-foreground border-border">
  <CardTitle className="text-foreground">Title</CardTitle>
  <CardDescription className="text-muted-foreground">
    Description
  </CardDescription>
  <Button className="bg-primary text-primary-foreground">
    Action
  </Button>
</Card>
```

---

## Common Patterns

### Pattern 1: Layout Container
```tsx
<div className="min-h-screen bg-background text-foreground">
  {children}
</div>
```

### Pattern 2: Card/Widget
```tsx
<div className="rounded-lg bg-card text-card-foreground border border-border p-4">
  <h3 className="text-lg font-semibold text-foreground">Title</h3>
  <p className="text-sm text-muted-foreground">Description</p>
</div>
```

### Pattern 3: Navigation
```tsx
<nav className="bg-background/95 backdrop-blur-md border-b border-border">
  <Link
    href="/"
    className="text-foreground hover:text-primary transition-colors"
  >
    Home
  </Link>
</nav>
```

### Pattern 4: Interactive Element
```tsx
<button className="
  bg-primary text-primary-foreground
  hover:bg-primary/90
  focus:ring-2 focus:ring-ring
  disabled:opacity-50
  transition-colors
">
  Click me
</button>
```

### Pattern 5: Gradient (Custom Colors)
```tsx
<div className="
  bg-gradient-to-br
  from-blue-100 to-blue-200
  dark:from-blue-900 dark:to-blue-800
">
  Gradient content
</div>
```

---

## What NOT to Do

### ❌ Don't Hardcode Colors
```tsx
// BAD
<div className="bg-white text-gray-900">
<div style={{ background: '#ffffff' }}>
<div className="text-[rgb(17,24,39)]">
```

### ❌ Don't Mix Patterns
```tsx
// BAD - Mixing semantic tokens with hardcoded colors
<div className="bg-background text-gray-900">
```

### ❌ Don't Use !important
```tsx
// BAD
<div className="bg-white !bg-gray-900">
```

### ❌ Don't Forget Dark Mode
```tsx
// BAD - Only works in light mode
<div className="bg-white text-gray-900">

// GOOD - Works in both modes
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

---

## Testing Your Component

### Visual Checklist
```
[ ] Light mode looks good
[ ] Dark mode looks good
[ ] Hover states work in both modes
[ ] Focus states visible in both modes
[ ] Disabled states clear in both modes
[ ] Text contrast meets WCAG AA (4.5:1)
[ ] No hardcoded colors
[ ] Uses semantic tokens OR dark: modifier
```

### Quick Test Script
```tsx
// Add this to your component page for quick testing
import { useTheme } from '@/lib/contexts/theme-context'

function ThemeToggleButton() {
  const { theme, setTheme } = useTheme()
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme (Current: {theme})
    </button>
  )
}
```

---

## Component-Specific Guidelines

### Dashboard Widgets

**Use BaseWidget component** (after it's fixed):
```tsx
import { BaseWidget } from '@/components/widgets/BaseWidget'

<BaseWidget
  title="My Widget"
  icon={Icon}
  href="/dashboard/widget"
  color="text-blue-600"
  bgColor="bg-blue-100"
>
  {/* Content automatically themed */}
</BaseWidget>
```

**Or implement dark mode manually**:
```tsx
<div className="
  rounded-3xl
  bg-gradient-to-br from-blue-100 to-blue-200
  dark:from-blue-900 dark:to-blue-800
  p-6
">
  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
    {title}
  </h2>
  <p className="text-gray-600 dark:text-gray-300">
    {description}
  </p>
</div>
```

### Forms & Inputs

**Use shadcn/ui components** (already themed):
```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
  />
</div>
```

### Modals & Dialogs

**Use shadcn/ui Dialog** (already themed):
```tsx
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'

<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
    </DialogHeader>
    {/* Content automatically themed */}
  </DialogContent>
</Dialog>
```

---

## Debugging Theme Issues

### Issue: Component looks wrong in dark mode

**Check**:
1. Does it use semantic tokens? (`bg-background`, `text-foreground`)
2. Does it have `dark:` classes? (`bg-white dark:bg-gray-900`)
3. Are there hardcoded colors? (Search for `#`, `rgb(`, `white`, `gray-900`)
4. Is it using `!important`? (Remove it)

**Fix**:
```tsx
// Before
<div className="bg-white text-gray-900">

// After
<div className="bg-background text-foreground">
// OR
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

### Issue: Theme not persisting

**Check**:
1. Is `ThemeProvider` wrapping the app? (in `app/layout.tsx`)
2. Is localStorage working? (Check browser console)
3. Is the storage key correct? (`mindsy-ui-theme`)

### Issue: Flash of wrong theme on load

**Check**:
1. Is the inline script in `app/layout.tsx` present?
2. Is `suppressHydrationWarning` on `<html>`?
3. Are there CSS overrides forcing colors?

---

## Migration to next-themes (Recommended)

### Why Migrate?
- ✅ System theme detection
- ✅ Smooth transitions
- ✅ Better SSR handling
- ✅ Less code to maintain
- ✅ Industry standard

### How to Migrate (Simple)

**1. Install** (already done):
```bash
npm install next-themes
```

**2. Replace ThemeProvider** in `app/layout.tsx`:
```tsx
// Before
import { ThemeProvider } from '@/lib/contexts/theme-context'

// After
import { ThemeProvider } from 'next-themes'

<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

**3. Update imports** in components:
```tsx
// Before
import { useTheme } from '@/lib/contexts/theme-context'

// After
import { useTheme } from 'next-themes'
```

**4. Remove** inline script from `app/layout.tsx` (no longer needed)

**5. Update** theme toggle:
```tsx
import { useTheme } from 'next-themes'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle
    </button>
  )
}
```

---

## FAQ

**Q: Why is the theme toggle disabled?**
A: It was commented out in `AppMenuPopover.tsx` for "mobile compatibility". This should be re-enabled.

**Q: Can I use hex colors?**
A: Avoid it. Use semantic tokens or Tailwind classes with `dark:` modifier.

**Q: What about opacity?**
A: Use Tailwind opacity modifier:
```tsx
bg-background/95       // 95% opacity
text-foreground/70     // 70% opacity
```

**Q: How do I add a new theme color?**
A: Add it to `globals.css` in both `:root` and `.dark` blocks, then add to `@theme inline`.

**Q: Should I use CSS variables or Tailwind classes?**
A: Prefer Tailwind classes (`bg-background`) over raw CSS variables (`var(--background)`).

**Q: What about gradients?**
A: Use Tailwind with dark: modifier:
```tsx
from-blue-100 dark:from-blue-900
```

**Q: How do I test on mobile?**
A: Use Chrome DevTools device emulation, or deploy to preview environment.

---

## Quick Commands

```bash
# Search for hardcoded colors
grep -r "#[0-9a-fA-F]\{6\}" components/

# Find components missing dark mode
grep -L "dark:" components/**/*.tsx

# Count dark: usage
grep -r "dark:" components/ | wc -l

# Find inline styles
grep -r "style={{" components/
```

---

## Resources

- **Full Analysis**: `docs/THEME-SYSTEM-ANALYSIS.md`
- **Architecture Diagrams**: `docs/theme-architecture-diagram.md`
- **Tailwind Docs**: https://tailwindcss.com/docs/dark-mode
- **next-themes**: https://github.com/pacocoursey/next-themes
- **shadcn/ui**: https://ui.shadcn.com/docs/dark-mode

---

## Getting Help

**If you're unsure**:
1. Check existing components for examples
2. Reference `ProfileWidget.tsx` (good dark mode implementation)
3. Ask in team chat
4. Review this guide

**If something breaks**:
1. Check browser console for errors
2. Verify theme provider is wrapping component
3. Check for CSS `!important` overrides
4. Test in both light and dark modes

---

**Remember**: When in doubt, use semantic tokens (`bg-background`, `text-foreground`) for the most reliable theme support!
