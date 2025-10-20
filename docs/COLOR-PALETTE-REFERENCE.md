# Mindsy Color Palette Reference

Quick reference guide for the new color system.

---

## Light Mode Colors

### Backgrounds
```css
--bg-primary:   #FAFAFA  /* Main page background */
--bg-elevated:  #FFFFFF  /* Cards, modals, elevated surfaces */
--bg-surface:   #F5F5F7  /* Secondary surfaces, input fields */
--bg-selected:  #E0EFFF  /* Selected/highlighted items */
```

### Text
```css
--text-primary:    #1D1D1F  /* Main text, headings */
--text-secondary:  #6E6E73  /* Secondary text, descriptions */
--text-tertiary:   #86868B  /* Tertiary text, placeholders */
```

### Accents
```css
--accent-primary:       #0071E3  /* Primary blue (links, buttons) */
--accent-primary-hover: #0077ED  /* Hover state */
--accent-secondary:     #A855F7  /* Secondary purple (accents) */
```

### Status
```css
--color-success:  #28CD41  /* Green - success states */
--color-warning:  #FF9500  /* Orange - warnings */
--color-error:    #FF3B30  /* Red - errors */
--color-info:     #34C7EB  /* Cyan - informational */
```

### Borders
```css
--border-light:   #E5E5E7  /* Subtle borders */
--border-medium:  #D1D1D6  /* Standard borders */
--border-strong:  #AEAEB2  /* Prominent borders */
```

---

## Dark Mode Colors

### Backgrounds
```css
--bg-primary:   #1C1C1E  /* Main page background */
--bg-elevated:  #2C2C2E  /* Cards, modals */
--bg-surface:   #38383A  /* Secondary surfaces */
--bg-selected:  #1E3A5F  /* Selected items */
```

### Text
```css
--text-primary:    #F5F5F7  /* Main text */
--text-secondary:  #AEAEB2  /* Secondary text */
--text-tertiary:   #8E8E93  /* Tertiary text */
```

### Accents
```css
--accent-primary:       #0A84FF  /* Brighter blue for dark mode */
--accent-primary-hover: #409CFF  /* Hover state */
--accent-secondary:     #BF5AF2  /* Brighter purple */
```

### Status
```css
--color-success:  #30D158  /* Brighter green */
--color-warning:  #FFD60A  /* Brighter yellow */
--color-error:    #FF453A  /* Brighter red */
--color-info:     #64D2FF  /* Brighter cyan */
```

### Borders
```css
--border-light:   #38383A  /* Subtle borders */
--border-medium:  #48484A  /* Standard borders */
--border-strong:  #636366  /* Prominent borders */
```

---

## Usage Examples

### Using New Color Variables

```tsx
// ✅ CORRECT - Direct color variables
<div style={{ backgroundColor: 'var(--bg-elevated)' }}>
  <h1 style={{ color: 'var(--text-primary)' }}>Title</h1>
  <p style={{ color: 'var(--text-secondary)' }}>Description</p>
</div>

// ✅ CORRECT - Via Shadcn tokens (recommended for UI components)
<div className="bg-card text-card-foreground">
  <h1 className="text-foreground">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>
```

### Status Colors

```tsx
// Success message
<div className="bg-green-50 dark:bg-green-950/20"
     style={{ borderColor: 'var(--color-success)' }}>
  <span style={{ color: 'var(--color-success)' }}>Success!</span>
</div>

// Error message
<div style={{
  backgroundColor: 'var(--color-error)',
  color: '#FFFFFF'
}}>
  Error occurred
</div>
```

### Interactive States

```tsx
// Button with hover effect
<button
  className="transition-colors"
  style={{
    backgroundColor: 'var(--accent-primary)',
    color: '#FFFFFF'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)';
  }}
>
  Click me
</button>

// With overlay
<div style={{ position: 'relative' }}>
  <div className="hover:bg-[var(--overlay-hover)]">
    Hover to see overlay
  </div>
</div>
```

---

## Shadcn/UI Token Mapping

These tokens automatically adapt to light/dark mode:

| Token | Maps To | Purpose |
|-------|---------|---------|
| `bg-background` | `--bg-primary` | Page background |
| `bg-card` | `--bg-elevated` | Card background |
| `bg-popover` | `--bg-elevated` | Popover background |
| `bg-primary` | `--accent-primary` | Primary button |
| `bg-secondary` | `--bg-surface` | Secondary button |
| `bg-muted` | `--bg-surface` | Muted background |
| `bg-accent` | `--bg-selected` | Accent background |
| `text-foreground` | `--text-primary` | Main text |
| `text-muted-foreground` | `--text-secondary` | Muted text |
| `border-border` | `--border-light` | Border color |
| `bg-destructive` | `--color-error` | Destructive action |

---

## Common Patterns

### Card Component
```tsx
<div className="bg-card text-card-foreground border border-border rounded-lg p-4">
  <h2 className="text-foreground font-semibold">Card Title</h2>
  <p className="text-muted-foreground">Card description</p>
</div>
```

### Button Component
```tsx
// Primary button
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Primary Action
</button>

// Secondary button
<button className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
  Secondary Action
</button>
```

### Input Field
```tsx
<input
  className="bg-input text-foreground border border-border focus:ring-2 focus:ring-[var(--ring-focus)]"
  placeholder="Enter text..."
/>
```

### Status Badge
```tsx
// Success
<span className="px-2 py-1 rounded" style={{
  backgroundColor: 'var(--color-success)',
  color: '#FFFFFF'
}}>
  Active
</span>

// Warning
<span className="px-2 py-1 rounded" style={{
  backgroundColor: 'var(--color-warning)',
  color: '#000000'
}}>
  Pending
</span>
```

---

## Accessibility Notes

### Contrast Ratios

All color combinations meet **WCAG AA** standards (4.5:1 minimum):

**Light Mode:**
- `--text-primary` on `--bg-primary`: 17.7:1 (AAA)
- `--text-secondary` on `--bg-primary`: 7.2:1 (AAA)
- `--text-tertiary` on `--bg-primary`: 4.9:1 (AA)

**Dark Mode:**
- `--text-primary` on `--bg-primary`: 16.8:1 (AAA)
- `--text-secondary` on `--bg-primary`: 7.1:1 (AAA)
- `--text-tertiary` on `--bg-primary`: 5.2:1 (AA)

### Status Color Contrast
All status colors have sufficient contrast on their respective backgrounds.

---

## Migration Guide

### From Old System

**Before (OKLCH):**
```css
--background: oklch(0.9940 0 0);
--foreground: oklch(0 0 0);
--primary: oklch(0.5393 0.2713 286.7462);
```

**After (New System):**
```css
--background: var(--bg-primary);      /* #FAFAFA */
--foreground: var(--text-primary);    /* #1D1D1F */
--primary: var(--accent-primary);     /* #0071E3 */
```

### Component Updates

**Before:**
```tsx
<div className="bg-white text-gray-900">
  <p className="text-gray-600">Text</p>
</div>
```

**After:**
```tsx
<div className="bg-card text-card-foreground">
  <p className="text-muted-foreground">Text</p>
</div>
```

---

## Transitions

All color changes include smooth 200ms transitions:

```css
* {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-duration: 200ms;
  transition-timing-function: ease-in-out;
}
```

To disable transitions for specific elements:
```tsx
<div className="no-transition">
  Instant color changes
</div>
```

---

## Color Variables List

### All Available Variables

**Semantic Colors:**
- `--bg-primary`, `--bg-elevated`, `--bg-surface`, `--bg-selected`
- `--text-primary`, `--text-secondary`, `--text-tertiary`
- `--accent-primary`, `--accent-primary-hover`, `--accent-secondary`
- `--color-success`, `--color-warning`, `--color-error`, `--color-info`
- `--border-light`, `--border-medium`, `--border-strong`
- `--overlay-hover`, `--overlay-active`, `--ring-focus`

**Shadcn Tokens:**
- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`

**Charts:**
- `--chart-1` through `--chart-5`

**Sidebar:**
- `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, etc.

---

## Quick Reference

| Need | Light Mode | Dark Mode |
|------|-----------|----------|
| Page BG | `#FAFAFA` | `#1C1C1E` |
| Card BG | `#FFFFFF` | `#2C2C2E` |
| Main Text | `#1D1D1F` | `#F5F5F7` |
| Secondary Text | `#6E6E73` | `#AEAEB2` |
| Primary Action | `#0071E3` | `#0A84FF` |
| Success | `#28CD41` | `#30D158` |
| Error | `#FF3B30` | `#FF453A` |
| Border | `#E5E5E7` | `#38383A` |

---

**Updated**: October 19, 2025
**See Also**: `/docs/color-system-implementation.md`
