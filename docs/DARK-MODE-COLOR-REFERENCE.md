# Dark Mode Color Reference - Quick Lookup Guide

**Visual reference for developers implementing dark mode fixes**

---

## Semantic Token Mapping

### Background Colors

```tsx
// ❌ REMOVE                    // ✅ REPLACE WITH
bg-white                        bg-background  or  bg-card
bg-gray-50                      bg-muted
bg-gray-100                     bg-muted
bg-gray-200                     bg-muted
```

| Token | Light Mode | Dark Mode | Use For |
|---|---|---|---|
| `bg-background` | #FAFAFA | #1C1C1E | Main page background |
| `bg-card` | #FFFFFF | #2C2C2E | Cards, modals, elevated surfaces |
| `bg-muted` | #F5F5F7 | #38383A | Hover states, disabled elements |
| `bg-accent` | #E0EFFF | #3B2766 | Selected states, highlights |
| `bg-primary` | #7C3AED | #8B5CF6 | Branded buttons, primary actions |

---

### Text Colors

```tsx
// ❌ REMOVE                    // ✅ REPLACE WITH
text-black                      text-foreground
text-gray-900                   text-foreground
text-gray-800                   text-foreground
text-gray-700                   text-foreground
text-gray-600                   text-muted-foreground
text-gray-500                   text-muted-foreground
text-gray-400                   text-muted-foreground  (use sparingly)
```

| Token | Light Mode | Dark Mode | Use For |
|---|---|---|---|
| `text-foreground` | #1D1D1F | #F5F5F7 | Primary text, headings, body copy |
| `text-muted-foreground` | #6E6E73 | #AEAEB2 | Secondary text, metadata, labels |
| `text-primary` | #7C3AED | #8B5CF6 | Links, branded text, accents |

**Contrast Ratios:**
- `text-foreground`: **13.8:1** (light) / **14.2:1** (dark) - Excellent
- `text-muted-foreground`: **4.8:1** (light) / **6.9:1** (dark) - AA compliant
- `text-primary`: **5.9:1** (light) / **5.1:1** (dark) - AA compliant

---

### Border Colors

```tsx
// ❌ REMOVE                    // ✅ REPLACE WITH
border-gray-100                 border-border
border-gray-200                 border-border
border-gray-300                 border-border
```

| Token | Light Mode | Dark Mode | Use For |
|---|---|---|---|
| `border-border` | #E5E5E7 | #38383A | All borders, dividers, separators |

---

## Status Colors (Require Dark Variants)

### Success (Green)

```tsx
// Light mode
bg-green-50 text-green-700 border-green-200

// Add dark mode variants
bg-green-50 dark:bg-green-950/30
text-green-700 dark:text-green-300
border-green-200/50 dark:border-green-800/50
```

| Element | Light Mode | Dark Mode |
|---|---|---|
| Background | `#F0FDF4` (green-50) | `#052e16` @ 30% opacity (green-950/30) |
| Text | `#15803D` (green-700) | `#86EFAC` (green-300) |
| Border | `#BBF7D0` @ 50% (green-200/50) | `#166534` @ 50% (green-800/50) |

**Example:**
```tsx
<div className="px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200/50 dark:border-green-800/50">
  ✓ Success message
</div>
```

---

### Warning (Amber/Yellow)

```tsx
// Light mode
bg-amber-50 text-amber-700 border-amber-200

// Add dark mode variants
bg-amber-50 dark:bg-amber-950/30
text-amber-700 dark:text-amber-300
border-amber-200/50 dark:border-amber-800/50
```

| Element | Light Mode | Dark Mode |
|---|---|---|
| Background | `#FFFBEB` (amber-50) | `#451a03` @ 30% opacity (amber-950/30) |
| Text | `#B45309` (amber-700) | `#FCD34D` (amber-300) |
| Border | `#FDE68A` @ 50% (amber-200/50) | `#92400E` @ 50% (amber-800/50) |

**Example:**
```tsx
<div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
  ⚠ Warning message
</div>
```

---

### Error (Red)

```tsx
// Light mode
bg-red-50 text-red-700 border-red-200

// Add dark mode variants
bg-red-50 dark:bg-red-950/30
text-red-700 dark:text-red-300
border-red-200/50 dark:border-red-800/50
```

| Element | Light Mode | Dark Mode |
|---|---|---|
| Background | `#FEF2F2` (red-50) | `#450a0a` @ 30% opacity (red-950/30) |
| Text | `#B91C1C` (red-700) | `#FCA5A5` (red-300) |
| Border | `#FECACA` @ 50% (red-200/50) | `#991B1B` @ 50% (red-800/50) |

**Example:**
```tsx
<div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-800/50">
  ✗ Error message
</div>
```

---

### Info (Blue)

```tsx
// Light mode
bg-blue-50 text-blue-700 border-blue-200

// Add dark mode variants
bg-blue-50 dark:bg-blue-950/30
text-blue-700 dark:text-blue-300
border-blue-200/50 dark:border-blue-800/50
```

| Element | Light Mode | Dark Mode |
|---|---|---|
| Background | `#EFF6FF` (blue-50) | `#172554` @ 30% opacity (blue-950/30) |
| Text | `#1D4ED8` (blue-700) | `#93C5FD` (blue-300) |
| Border | `#BFDBFE` @ 50% (blue-200/50) | `#1E40AF` @ 50% (blue-800/50) |

**Example:**
```tsx
<div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
  ℹ Info message
</div>
```

---

## Gradient Patterns

### Purple Gradient (Profile Widget Style)

```tsx
// Light mode
bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100

// Add dark mode
bg-gradient-to-br
  from-blue-100 via-purple-100 to-pink-100
  dark:from-blue-900 dark:via-purple-900 dark:to-pink-900
```

**Light Mode Colors:**
- `from-blue-100`: #DBEAFE
- `via-purple-100`: #F3E8FF
- `to-pink-100`: #FCE7F3

**Dark Mode Colors:**
- `dark:from-blue-900`: #1E3A8A
- `dark:via-purple-900`: #581C87
- `dark:to-pink-900`: #831843

---

### Subtle Gray Gradient (Card backgrounds)

```tsx
bg-gradient-to-b from-muted/50 to-background
```

Auto-adapts - no dark: variant needed!

---

## Interactive States

### Hover States

```tsx
// ❌ BAD
hover:bg-gray-50

// ✅ GOOD
hover:bg-muted

// ✅ ALSO GOOD (for emphasis)
hover:bg-accent
```

### Active/Selected States

```tsx
// ❌ BAD
{isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}

// ✅ GOOD
{isActive ? 'bg-accent text-primary' : 'text-muted-foreground'}
```

### Disabled States

```tsx
// ✅ GOOD
className="opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
```

---

## Transparent Backgrounds

### Navigation Bars

```tsx
// ❌ BAD
bg-white/80 backdrop-blur-xl border-gray-200/50

// ✅ GOOD
bg-background/80 backdrop-blur-xl border-border/50
```

### Overlays (Modals/Dialogs)

```tsx
// ✅ GOOD (no changes needed)
bg-black/50 backdrop-blur-sm
```

Black overlay works in both modes.

---

## Shadows

**No dark: prefix needed** - CSS variables handle this automatically!

```tsx
// ✅ Works in both modes
shadow-sm
shadow-md
shadow-lg
shadow-xl
shadow-2xl
```

**Light Mode:** Subtle gray shadows (0.08-0.16 opacity)
**Dark Mode:** Deeper black shadows (0.3-0.6 opacity)

Defined in `globals.css` lines 86-94 (light) and 260-267 (dark).

---

## Special Cases

### Code Blocks (Always Dark)

```tsx
<pre className="bg-gray-900 text-gray-100 dark:bg-gray-950 dark:text-gray-50 rounded-lg p-4">
  <code>const theme = 'dark';</code>
</pre>
```

### Tooltips

```tsx
// ❌ BAD (hardcoded dark tooltip on potentially dark background)
<div className="bg-gray-900 text-white">

// ✅ GOOD (inverts properly)
<div className="bg-popover text-popover-foreground border border-border shadow-lg">
```

### Avatar Gradients (Keep as-is)

```tsx
// ✅ GOOD - These are decorative and work in both modes
bg-gradient-to-br from-green-400 to-teal-500
bg-gradient-to-br from-purple-400 to-pink-500
bg-gradient-to-br from-blue-400 to-cyan-500
```

---

## Component-Specific Examples

### Card Component

```tsx
// ❌ BAD
<div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
  <h3 className="text-gray-900 font-semibold">Title</h3>
  <p className="text-gray-600">Description</p>
</div>

// ✅ GOOD
<div className="bg-card rounded-lg shadow-md border border-border p-4">
  <h3 className="text-foreground font-semibold">Title</h3>
  <p className="text-muted-foreground">Description</p>
</div>
```

---

### Button Component

```tsx
// Primary button
<button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-sm">
  Click me
</button>

// Secondary button
<button className="bg-muted hover:bg-accent text-foreground px-4 py-2 rounded-lg border border-border">
  Cancel
</button>

// Ghost button
<button className="hover:bg-muted text-foreground px-4 py-2 rounded-lg">
  Learn more
</button>
```

---

### Input Component

```tsx
<input
  type="text"
  className="w-full px-3 py-2 bg-background border border-border rounded-lg
             focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
             text-foreground placeholder:text-muted-foreground"
  placeholder="Enter text..."
/>
```

---

## Quick Find & Replace

Use your IDE's find & replace with these patterns:

### Replace hardcoded backgrounds
```regex
Find:    className="([^"]*?)bg-white([^"]*?)"
Replace: className="$1bg-background$2"

Find:    className="([^"]*?)bg-gray-50([^"]*?)"
Replace: className="$1bg-muted$2"
```

### Replace hardcoded text colors
```regex
Find:    className="([^"]*?)text-black([^"]*?)"
Replace: className="$1text-foreground$2"

Find:    className="([^"]*?)text-gray-900([^"]*?)"
Replace: className="$1text-foreground$2"

Find:    className="([^"]*?)text-gray-600([^"]*?)"
Replace: className="$1text-muted-foreground$2"
```

### Replace hardcoded borders
```regex
Find:    className="([^"]*?)border-gray-200([^"]*?)"
Replace: className="$1border-border$2"
```

---

## Testing Checklist

After making changes, verify:

1. **Toggle dark mode** - Component should adapt instantly
2. **Check contrast** - Text should be readable in both modes
3. **Verify hover states** - Should be visible but subtle
4. **Check active states** - Should stand out clearly
5. **Test on dark background** - No white elements should appear
6. **Test on light background** - No black elements should appear

**Browser DevTools Tip:**
- Right-click element → Inspect
- In Styles tab, verify it's using `var(--*)` CSS variables
- If you see hardcoded colors (e.g., `#FFFFFF`), it needs fixing

---

## Summary: The 3 Rules

1. **Use semantic tokens** for backgrounds, text, and borders
2. **Add dark: variants** for status colors and gradients
3. **Trust the system** for shadows and transitions (they auto-adapt)

**Questions?** See the main design system doc: `DARK-MODE-DESIGN-SYSTEM.md`
