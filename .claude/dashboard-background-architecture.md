# Dashboard Background Architecture

**Last Updated:** 2025-01-20
**Status:** ✅ Production
**Importance:** CRITICAL - Read before modifying dashboard layout

---

## Overview

The Mindsy dashboard uses a layered background system with a purple cloud image (`public/images/cloud-purple.jpg`) that provides brand personality while maintaining widget readability.

---

## Component Hierarchy

```
app/dashboard/layout.tsx
  └─> <DashboardWrapper> [MUST BE TRANSPARENT]
      └─> app/dashboard/page.tsx
          └─> <ResponsiveBentoGrid> [SOURCE OF TRUTH - Contains background]
              └─> Widgets (Profile, Stats, Social, etc.)
```

---

## Critical Rule: Wrapper Transparency

### ⚠️ NEVER ADD BACKGROUND COLORS TO WRAPPERS

**File:** `components/dashboard/DashboardWrapper.tsx`

**WRONG:**
```tsx
<div className="flex h-screen bg-background">  // ❌ Blocks child backgrounds
```

**CORRECT:**
```tsx
<div className="flex h-screen">  // ✅ Transparent, allows child backgrounds
```

**Why:** Layout wrappers must remain transparent so child pages can control their own backgrounds.

---

## Background Implementation

**File:** `components/layout/ResponsiveBentoGrid.tsx`
**Location:** Lines 195-215

### Layer Structure

```tsx
<div className="relative min-h-screen">
  {/* Layer 1: Background Image (z-index: -20) */}
  <div
    className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-20 opacity-30"
    style={{ backgroundImage: 'url(/images/cloud-purple.jpg)' }}
  />

  {/* Layer 2: Gradient Overlay (z-index: -10) */}
  <div className="fixed inset-0 bg-gradient-to-b from-white/85 via-white/70 to-white/85 dark:from-gray-950/90 dark:via-gray-950/80 dark:to-gray-950/90 -z-10" />

  {/* Layer 3: Content (z-index: 10) */}
  <div className="relative z-10">
    {/* Widgets render here */}
  </div>
</div>
```

### Layer Details

| Layer | Z-Index | Purpose | Classes |
|-------|---------|---------|---------|
| Background Image | -20 | Purple cloud aesthetic | `fixed inset-0 opacity-30` |
| Gradient Overlay | -10 | Text readability | `from-white/85 via-white/70 to-white/85` |
| Content/Widgets | 10 | Interactive elements | `relative z-10` |

---

## Design Specifications

### Background Image
- **File:** `public/images/cloud-purple.jpg`
- **Size:** 295 KB (1152 x 841 px)
- **Opacity:** 30% (subtle, not overwhelming)
- **Position:** Fixed (parallax effect on scroll)

### Gradient Overlay
- **Light Mode:** 85% → 70% → 85% white
- **Dark Mode:** 90% → 80% → 90% dark gray
- **Purpose:** Ensures WCAG AA contrast (4.5:1 minimum)

### Widget Backgrounds
- **Opacity:** 95% (`bg-card/95`)
- **Effect:** Glassmorphism (`backdrop-blur-md`)
- **Readability:** Excellent (tested on all backgrounds)

---

## Historical Context: The Bug We Fixed

### What Happened (2025-01-20)

**Problem:** Background image added to `ResponsiveBentoGrid` but NOT showing in UI.

**Root Cause:** `DashboardWrapper` had `bg-background` class creating a solid layer that blocked the image from showing through.

**The Fix:**
1. Removed `bg-background` from `DashboardWrapper.tsx` (line 49)
2. Added documentation to prevent future issues
3. Deleted 298 lines of dead code (`DashboardOverview.tsx`)

**Lesson:** Always check parent wrappers for blocking styles. Don't add `bg-*` classes to layout wrappers.

---

## Maintenance Guidelines

### DO ✅
- Keep `DashboardWrapper` transparent (no background classes)
- Let child pages control their own backgrounds
- Use `ResponsiveBentoGrid` as source of truth for dashboard styling
- Test background visibility after layout changes
- Maintain 3-layer structure (image → overlay → content)

### DON'T ❌
- Add `bg-background`, `bg-white`, or any `bg-*` to `DashboardWrapper`
- Remove background layers from `ResponsiveBentoGrid`
- Change z-index values without understanding layer hierarchy
- Reduce widget opacity below 90% (readability issues)
- Create duplicate dashboard components

---

## Testing Checklist

When modifying dashboard layout, verify:

- [ ] Purple cloud background visible behind widgets
- [ ] Widgets remain clearly readable (not obscured)
- [ ] Background stays fixed when scrolling
- [ ] Dark mode works with darker overlay
- [ ] No white/gray blocks covering background
- [ ] Text contrast meets WCAG AA (4.5:1 minimum)
- [ ] Mobile, tablet, and desktop views all work
- [ ] No console errors or warnings

---

## Code Cleanup History

### Deleted Files
- `components/dashboard/DashboardOverview.tsx` (298 lines, unused)
  - **Date:** 2025-01-20
  - **Reason:** Never imported, dead code
  - **Verified by:** `grep -r "DashboardOverview"` found zero imports

### Architecture Simplification
- Clear separation: Wrapper = context provider, Page = styling
- Single responsibility principle enforced
- No duplicate or unused components

---

## Related Documentation

- Widget Design System: `docs/WIDGET-DESIGN-SYSTEM.md`
- Background Fix Report: `docs/BACKGROUND-FIX-REPORT.md`
- Dashboard Redesign: `docs/DASHBOARD-REDESIGN-SUMMARY.md`

---

## Quick Reference

**Background not showing?**
1. Check `DashboardWrapper.tsx` for blocking `bg-*` classes
2. Verify `ResponsiveBentoGrid.tsx` has all 3 layers
3. Inspect with DevTools: look for z-index/layer conflicts
4. Confirm image exists at `public/images/cloud-purple.jpg`

**Modifying the background?**
1. Edit `ResponsiveBentoGrid.tsx` (lines 195-215)
2. Keep 3-layer structure intact
3. Test on light and dark mode
4. Verify widget readability

**Adding new pages with backgrounds?**
1. Create background layers in the page component (not wrapper)
2. Use same z-index structure (-20, -10, 10)
3. Ensure parent wrappers remain transparent
4. Document the implementation

---

## Contact & Support

**Questions about dashboard layout?**
- Review this document first
- Check related docs in `/docs/`
- Test changes in dev environment before production
- Add documentation for any new architectural decisions

---

**Remember:** The dashboard background is a key part of Mindsy's brand identity. Keep it visible, keep it performant, keep it documented.
