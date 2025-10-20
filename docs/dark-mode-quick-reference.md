# Dark Mode Quick Reference Guide

**Quick lookup for implementing dark mode in Mindsy components**

---

## Color Mapping Cheat Sheet

### Common Hardcoded Colors → Theme Variables

```tsx
// Backgrounds
"bg-white"           → "bg-card" or "bg-background"
"bg-gray-50"         → "bg-muted"
"bg-gray-100"        → "bg-accent"
"bg-gray-800"        → "bg-card" (in dark mode)
"bg-gray-900"        → "bg-background" (in dark mode)

// Text Colors
"text-black"         → "text-foreground"
"text-gray-900"      → "text-card-foreground" or "text-foreground"
"text-gray-700"      → "text-foreground"
"text-gray-600"      → "text-muted-foreground"
"text-gray-500"      → "text-muted-foreground"
"text-gray-400"      → "text-muted-foreground" with opacity
"text-blue-600"      → "text-primary" (if primary action)

// Borders
"border-gray-200"    → "border-border"
"border-gray-300"    → "border-border"
"border-gray-700"    → "border-border" (in dark mode)

// Interactive States
"hover:bg-gray-100"  → "hover:bg-accent"
"hover:bg-gray-800"  → "hover:bg-accent" (in dark mode)
"focus:ring-blue-500" → "focus:ring-ring"
```

---

## Component Migration Template

### Before (Hardcoded)
```tsx
export function MyComponent() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-gray-900 text-xl font-bold">Title</h2>
      <p className="text-gray-600 mt-2">Description text</p>
      <button className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded">
        Action
      </button>
    </div>
  );
}
```

### After (Theme-Aware)
```tsx
export function MyComponent() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h2 className="text-card-foreground text-xl font-bold">Title</h2>
      <p className="text-muted-foreground mt-2">Description text</p>
      <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded">
        Action
      </button>
    </div>
  );
}
```

---

## Common Patterns

### Pattern 1: Card Component
```tsx
// ❌ Before
<div className="bg-white shadow-lg border border-gray-200">
  <div className="p-6 border-b border-gray-200">
    <h3 className="text-gray-900">Header</h3>
  </div>
  <div className="p-6 bg-gray-50">
    <p className="text-gray-600">Content</p>
  </div>
</div>

// ✅ After
<div className="bg-card shadow-lg border border-border">
  <div className="p-6 border-b border-border">
    <h3 className="text-card-foreground">Header</h3>
  </div>
  <div className="p-6 bg-muted">
    <p className="text-muted-foreground">Content</p>
  </div>
</div>
```

### Pattern 2: Navigation Item
```tsx
// ❌ Before
<button
  className={cn(
    "px-4 py-2 rounded-lg",
    isActive
      ? "bg-blue-600 text-white"
      : "text-gray-600 hover:bg-gray-100"
  )}
>
  Item
</button>

// ✅ After
<button
  className={cn(
    "px-4 py-2 rounded-lg",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-accent"
  )}
>
  Item
</button>
```

### Pattern 3: Input Field
```tsx
// ❌ Before
<input
  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:border-blue-500"
  placeholder="Enter text..."
/>

// ✅ After
<input
  className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:border-ring"
  placeholder="Enter text..."
/>
```

### Pattern 4: Backdrop/Overlay
```tsx
// ❌ Before
<div className="bg-white/80 backdrop-blur-xl">
  Content
</div>

// ✅ After
<div className="bg-card/80 backdrop-blur-xl">
  Content
</div>
```

---

## Dual-Mode Approach (When Needed)

Sometimes you need different values for light/dark modes:

```tsx
// Tailwind dark: modifier
<div className="bg-gray-100 dark:bg-gray-800">
  <p className="text-gray-900 dark:text-gray-100">Text</p>
</div>

// When to use:
// - Fine-tuning specific components
// - Third-party library styling
// - Complex visual requirements

// When NOT to use:
// - General UI (prefer theme variables)
// - New components (use theme vars from start)
```

---

## Special Cases

### Transparent/Opacity Variants
```tsx
// ❌ Hardcoded
"bg-white/50"
"text-black/80"

// ✅ Theme-aware
"bg-card/50"
"text-foreground/80"
```

### Shadows
```tsx
// ❌ Hardcoded shadow color
"shadow-lg shadow-gray-500/50"

// ✅ Neutral shadow (adapts to theme)
"shadow-lg"

// Or use CSS variable
"shadow-[var(--shadow-lg)]"
```

### Gradients
```tsx
// ❌ Hardcoded gradient
"bg-gradient-to-r from-blue-500 to-purple-600"

// ✅ Theme-aware gradient
"bg-gradient-to-r from-primary to-accent"
```

---

## Testing Checklist

After converting a component, verify:

```tsx
// 1. Add ThemeToggle to test
import { ThemeToggle } from '@/components/ui/theme-toggle';

function TestPage() {
  return (
    <div>
      <ThemeToggle />
      <YourComponent />
    </div>
  );
}

// 2. Check both modes
✓ Light mode: Text readable, colors appropriate
✓ Dark mode: Text readable, colors appropriate
✓ Toggle: No flash, smooth transition
✓ Contrast: Pass WCAG AA minimum
✓ Interactive: Hover/focus states work
```

---

## Available Theme Variables Reference

### Primary Variables (Most Used)
```css
--background          /* Main page background */
--foreground          /* Main page text */
--card               /* Card/widget background */
--card-foreground    /* Card/widget text */
--primary            /* Primary actions (purple) */
--primary-foreground /* Text on primary */
--muted              /* Subtle backgrounds */
--muted-foreground   /* Subtle text/secondary */
--border             /* All borders */
```

### Secondary Variables
```css
--accent             /* Highlighted states */
--accent-foreground  /* Text on accent */
--secondary          /* Secondary actions */
--secondary-foreground
--destructive        /* Delete/error */
--destructive-foreground
--popover            /* Dropdown backgrounds */
--popover-foreground
--input              /* Form input borders */
--ring               /* Focus rings */
```

---

## Common Mistakes to Avoid

### ❌ Mistake #1: Mixing Approaches
```tsx
// Don't mix hardcoded and theme vars in same component
<div className="bg-card border border-gray-200"> ❌
  <p className="text-card-foreground">Text</p>
</div>

// Be consistent
<div className="bg-card border border-border"> ✅
  <p className="text-card-foreground">Text</p>
</div>
```

### ❌ Mistake #2: Using Dark Mode for Theme
```tsx
// Don't use dark: for primary theming
<div className="bg-white dark:bg-gray-900"> ❌

// Use theme variables
<div className="bg-background"> ✅
```

### ❌ Mistake #3: Forgetting Opacity
```tsx
// Opacity won't work with theme vars directly
<div className="bg-primary/50"> ✅ This works!

// Both light and dark modes will apply 50% opacity
```

### ❌ Mistake #4: Hardcoded Blue Instead of Primary
```tsx
// Don't use hardcoded blue for primary actions
<button className="bg-blue-600 text-white"> ❌

// Use theme primary
<button className="bg-primary text-primary-foreground"> ✅
```

---

## Quick Fixes for Common Components

### Fix BaseWidget.tsx
```tsx
// Line 48
- className="bg-white/50 backdrop-blur-md"
+ className="bg-card/50 backdrop-blur-md"

// Line 66
- className="text-gray-900"
+ className="text-card-foreground"

// Line 76
- className="bg-white/90 backdrop-blur-md"
+ className="bg-card/90 backdrop-blur-md"
```

### Fix BottomNavbar.tsx
```tsx
// Line 97
- className="bg-white/80 backdrop-blur-xl border border-gray-200/50"
+ className="bg-card/80 backdrop-blur-xl border border-border/50"

// Line 110
- isActive ? "text-blue-600" : "text-gray-600"
+ isActive ? "text-primary" : "text-muted-foreground"

// Line 105
- "hover:bg-gray-100/50"
+ "hover:bg-accent/50"
```

### Fix TabNavigation.tsx
```tsx
// Line 26
- className="flex bg-white"
+ className="flex bg-card"

// Line 43
- isActive ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500'
+ isActive ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'

// Line 44
- hover:text-gray-700 hover:bg-gray-50
+ hover:text-foreground hover:bg-accent
```

---

## When to Use Each Variable

### --background vs --card
```tsx
// --background: Page-level backgrounds
<main className="bg-background min-h-screen">

// --card: Elevated surfaces (widgets, cards, modals)
<div className="bg-card rounded-lg shadow">
```

### --foreground vs --card-foreground
```tsx
// --foreground: Text on --background
<main className="bg-background text-foreground">

// --card-foreground: Text on --card
<div className="bg-card text-card-foreground">
```

### --muted vs --accent
```tsx
// --muted: Subtle, de-emphasized areas
<div className="bg-muted text-muted-foreground">Less important</div>

// --accent: Highlighted, interactive areas
<button className="hover:bg-accent">Hover me</button>
```

---

## Browser DevTools Tips

### Inspect Theme Variables
```javascript
// In browser console
const root = document.documentElement;
const styles = getComputedStyle(root);

// See current theme values
console.log('Background:', styles.getPropertyValue('--background'));
console.log('Foreground:', styles.getPropertyValue('--foreground'));
console.log('Primary:', styles.getPropertyValue('--primary'));
```

### Test Theme Toggle
```javascript
// Toggle theme programmatically
document.documentElement.classList.toggle('dark');

// Or via React DevTools
// Find ThemeProvider context and change theme value
```

---

## Performance Notes

✅ **Theme variables are fast:**
- Native CSS feature
- No JavaScript runtime cost
- GPU-accelerated
- Instant updates on toggle

✅ **OKLCH color space:**
- Natively supported (2025)
- Perceptually uniform
- Better color mixing
- Future-proof

---

## Next Steps

1. **Start with critical path:**
   - BaseWidget.tsx
   - BottomNavbar.tsx
   - TabNavigation.tsx

2. **Test thoroughly:**
   - Toggle between modes
   - Check all interactive states
   - Verify contrast ratios

3. **Document as you go:**
   - Note any edge cases
   - Update this guide if needed
   - Share learnings with team

4. **Expand systematically:**
   - One component at a time
   - Test before moving on
   - Keep PR sizes manageable

---

**For full details, see:** `/docs/dark-mode-audit-report.md`
