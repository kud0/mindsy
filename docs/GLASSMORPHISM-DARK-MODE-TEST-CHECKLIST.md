# Glassmorphism Dark Mode Testing Checklist

**QA Test Engineer - Mobile-First Dark Mode Glassmorphism Verification**

Date: 2025-10-21
Status: READY FOR TESTING

---

## ✅ GLASSMORPHISM IMPLEMENTATION VERIFICATION

### What is Glassmorphism?

Glassmorphism is a modern UI design style featuring:
- **Semi-transparent backgrounds** (e.g., `bg-white/95 dark:bg-gray-900/95`)
- **Backdrop blur effect** (`backdrop-blur-xl`)
- **Subtle borders** (`border border-gray-200/50 dark:border-gray-700/50`)
- **Layered depth** (creating floating, frosted-glass appearance)

---

## 🎯 TESTING CRITERIA

For each component, verify:

### Visual Quality
- [ ] Glass effect visible in BOTH light and dark modes
- [ ] Backdrop blur is strong enough (content behind is blurred but visible)
- [ ] Background opacity allows content to show through (frosted glass look)
- [ ] Borders are subtle but provide visual definition
- [ ] Component appears to "float" above background

### Dark Mode Specific
- [ ] Higher background opacity in dark mode (`/95` vs `/80` in light)
- [ ] Border opacity appropriate for dark backgrounds (`/50`)
- [ ] No harsh white backgrounds breaking dark mode
- [ ] Blur effect doesn't wash out content

### Performance
- [ ] No flickering or FOUC (Flash of Unstyled Content)
- [ ] Smooth transitions when toggling theme
- [ ] 60fps animations maintained

---

## 📱 COMPONENT-BY-COMPONENT CHECKLIST

### 1. BottomNavbar (CRITICAL - Always Visible)

**File:** `components/navigation/BottomNavbar.tsx`

**Line 95:** Main navigation container
```tsx
className="bg-background/80 dark:bg-background/90 backdrop-blur-xl
           border border-border/50"
```

**Visual Tests:**
- [ ] Navigation bar has frosted glass appearance
- [ ] Icons visible through semi-transparent background
- [ ] Dashboard background visible but blurred behind navbar
- [ ] Blur strength: 24px (`backdrop-blur-xl`)
- [ ] Border visible in both modes (subtle gray)

**Dark Mode Specific:**
- [ ] Background: `bg-background/90` (90% opacity) - darker than light mode
- [ ] Border: `border-border/50` (50% opacity)
- [ ] Active state: purple accent visible
- [ ] Hover effects work correctly

**Mobile Tests (375px - 428px):**
- [ ] Touch targets ≥44px (nav icons are 56px ✅)
- [ ] Glassmorphism visible on mobile
- [ ] Blur doesn't degrade performance on mobile
- [ ] Collapsed state (scrolled) maintains glass effect

---

### 2. ShareModal (CRITICAL - Frequent Use)

**File:** `components/share/ShareModal.tsx`

**Line 154:** Modal content container
```tsx
className="bg-card rounded-2xl shadow-2xl w-full max-w-md"
```

**Line 160:** Icon container with glass effect
```tsx
className="bg-blue-100 dark:bg-blue-950/30 rounded-full
           border border-blue-200 dark:border-blue-800"
```

**Visual Tests:**
- [ ] Modal has solid card background (NOT transparent)
- [ ] Accent elements (icon container) have glass effect
- [ ] Friend selection cards have subtle borders
- [ ] Selected state uses primary color
- [ ] Backdrop overlay: `bg-black/50 backdrop-blur-sm`

**Dark Mode Specific:**
- [ ] Icon background: `dark:bg-blue-950/30` (transparent blue)
- [ ] Icon color: `dark:text-blue-400` (lighter for contrast)
- [ ] Border: `dark:border-blue-800` (darker blue)
- [ ] Selected friend: purple accent visible
- [ ] Input fields: proper dark styling

**Mobile Tests:**
- [ ] Modal responsive (w-[95vw] on small screens)
- [ ] Touch targets on friend cards ≥44px
- [ ] Scrollable friend list smooth
- [ ] Keyboard doesn't cover action buttons

---

### 3. UploadDialog (HIGH - Entry Point)

**File:** `components/upload/UploadDialog.tsx`

**Line 497:** Main dialog container
```tsx
className="w-[95vw] max-w-2xl h-[85vh] overflow-hidden p-0 flex flex-col
           bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-xl
           border border-gray-200/50 dark:border-gray-700/50"
```

**Line 498:** Header section
```tsx
className="border-b border-gray-200/50 dark:border-gray-700/50 p-4
           bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm"
```

**Line 507:** Tab list
```tsx
className="grid w-full grid-cols-3 bg-gray-50/80 dark:bg-gray-800/80
           backdrop-blur-sm p-0.5 rounded-lg border border-gray-200/50 dark:border-gray-700/50"
```

**Visual Tests:**
- [ ] Entire dialog has glassmorphism effect
- [ ] Header has layered glass look
- [ ] Tab navigation has glass background
- [ ] Active tab: `bg-white/95 dark:bg-gray-900/95` with blur
- [ ] Card sections inside dialog maintain glass theme

**Dark Mode Specific:**
- [ ] Main background: `dark:bg-gray-900/95` (95% opacity)
- [ ] Header: `dark:bg-gray-800/80` (80% opacity - lighter layer)
- [ ] Borders: `dark:border-gray-700/50` (50% opacity)
- [ ] Tab list: consistent glass effect
- [ ] Progress indicators visible

**Mobile Tests:**
- [ ] Dialog fills viewport appropriately (h-[85vh])
- [ ] Tab triggers responsive (hidden text on mobile)
- [ ] Upload areas accessible
- [ ] Drag-and-drop visual feedback

---

### 4. PomodoroModal (MEDIUM - Widget Feature)

**File:** `components/widgets/PomodoroModal.tsx`

**Line 98-102:** Modal container with full glassmorphism
```tsx
className={cn(
  "w-[95vw] max-w-2xl h-[85vh] overflow-hidden p-0 flex flex-col",
  "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl",
  "border border-gray-200/50 dark:border-gray-700/50",
  "shadow-xl"
)}
```

**Line 105:** Header with glass layering
```tsx
className="border-b border-gray-200/50 dark:border-gray-700/50 p-4
           bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm"
```

**Line 114:** Tab list glass effect
```tsx
className="grid w-full grid-cols-3 bg-gray-50/80 dark:bg-gray-800/80
           backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
```

**Line 117:** Active tab glass effect
```tsx
className="data-[state=active]:bg-white/95 dark:data-[state=active]:bg-gray-900/95
           data-[state=active]:backdrop-blur-xl"
```

**Visual Tests:**
- [ ] Modal has premium glass appearance
- [ ] Circular timer background card has glass effect
- [ ] Progress bars visible with glass background
- [ ] Settings sliders functional on glass surface

**Dark Mode Specific:**
- [ ] Purple gradient colors adjusted for dark mode
- [ ] Timer text readable (`text-purple-600 dark:text-purple-400`)
- [ ] Card backgrounds: `bg-white/5 dark:bg-gray-900/5`
- [ ] Borders consistent: `dark:border-gray-700/50`

**Mobile Tests:**
- [ ] Timer circular progress visible
- [ ] Tab navigation accessible
- [ ] Settings controls usable
- [ ] No performance issues with animations

---

### 5. SocialModal (HIGH - Social Features)

**File:** `components/widgets/SocialModal.tsx`

**Line 535-540:** Main modal glassmorphism
```tsx
className={cn(
  "w-[95vw] max-w-2xl h-[85vh] overflow-hidden p-0 flex flex-col",
  "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl",
  "border border-gray-200/50 dark:border-gray-700/50",
  "shadow-xl"
)}
```

**Line 542:** Header glass effect
```tsx
className="border-b border-gray-200/50 dark:border-gray-700/50 p-4
           bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm"
```

**Line 548:** Tab list
```tsx
className="grid w-full grid-cols-3 bg-gray-50/80 dark:bg-gray-800/80
           backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
```

**Line 613, 661, etc:** List items with glass effect
```tsx
className="p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50
           bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl"
```

**Visual Tests:**
- [ ] Modal consistent with other glassmorphism modals
- [ ] Friend/battle cards have subtle glass effect
- [ ] Empty states maintain glass theme
- [ ] Avatar gradients visible through glass

**Dark Mode Specific:**
- [ ] List items: `dark:bg-gray-900/5` (very subtle)
- [ ] Hover states: `dark:hover:bg-gray-800/50`
- [ ] Purple accents for buttons/borders
- [ ] Empty state icons/text readable

**Framer Motion Animations:**
- [ ] Modal entrance animation smooth (scale + fade)
- [ ] Tab switching animations maintain glass effect
- [ ] List item stagger animations work
- [ ] Hover effects don't break glass appearance

**Mobile Tests:**
- [ ] Swipeable friend list
- [ ] Touch-friendly battle cards
- [ ] Modal fills viewport correctly

---

### 6. AppMenuPopover (MEDIUM - Utility)

**File:** `components/layout/AppMenuPopover.tsx`

**Line 131:** Popover content
```tsx
className="z-50 w-[320px] rounded-xl bg-white dark:bg-gray-900 p-4
           shadow-lg dark:shadow-2xl border border-gray-200 dark:border-gray-700"
```

**Visual Tests:**
- [ ] Popover appears above content with proper z-index
- [ ] App grid icons have colored backgrounds
- [ ] Hover states work on app buttons
- [ ] Theme toggle visible at bottom

**Dark Mode Specific:**
- [ ] Background: `dark:bg-gray-900` (solid, NOT glass)
- [ ] Border: `dark:border-gray-700`
- [ ] App icon backgrounds have dark variants (e.g., `dark:bg-blue-900/30`)
- [ ] Shadow enhanced in dark mode (`dark:shadow-2xl`)

**Note:** This component does NOT use glassmorphism - uses solid background instead.

**Mobile Tests:**
- [ ] Popover positions correctly
- [ ] Touch targets on app icons ≥44px
- [ ] Grid layout responsive

---

## 🧪 CROSS-COMPONENT CONSISTENCY TESTS

### Pattern Verification

Verify all glassmorphism modals use the SAME pattern:

**Standard Modal Pattern:**
```tsx
// Main container
className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
           border border-gray-200/50 dark:border-gray-700/50"

// Header
className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm
           border-b border-gray-200/50 dark:border-gray-700/50"

// Tab List
className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm
           border border-gray-200/50 dark:border-gray-700/50"

// Active Tab
className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl"

// Card/List Items
className="bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl
           border border-gray-200/50 dark:border-gray-700/50"
```

### Consistency Checklist

- [ ] All modals have same width (`w-[95vw] max-w-2xl`)
- [ ] All modals have same height (`h-[85vh]`)
- [ ] All use same backdrop blur strength (`backdrop-blur-xl`)
- [ ] All use same border opacity (50%)
- [ ] All use same background opacity ratios (95% main, 80% header)
- [ ] All shadows consistent (`shadow-xl`)

---

## 🌗 THEME TOGGLE TESTING

### Toggle Behavior

**File:** `components/ui/theme-toggle.tsx`

**Test Sequence:**
1. [ ] Start in light mode
2. [ ] Click theme toggle
3. [ ] Verify smooth transition (200ms duration)
4. [ ] All glassmorphism elements update simultaneously
5. [ ] No flicker or FOUC
6. [ ] Toggle back to light mode
7. [ ] Verify return transition smooth

### What Should Change

**Light → Dark:**
- [ ] Background opacity increases (80% → 90%)
- [ ] Border colors darken (`gray-200` → `gray-700`)
- [ ] Text colors lighten for contrast
- [ ] Accent colors adjust (e.g., `blue-100` → `blue-950/30`)
- [ ] Shadows become more prominent

**Dark → Light:**
- [ ] Background opacity decreases (90% → 80%)
- [ ] Border colors lighten (`gray-700` → `gray-200`)
- [ ] Text colors darken
- [ ] Accent colors brighten
- [ ] Shadows become subtler

---

## 📊 VISUAL COMPARISON GUIDE

### Light Mode Glassmorphism

**Expected Appearance:**
- Soft, airy frosted glass look
- Dashboard background visible through modals
- White/gray tones with subtle shadows
- Borders barely visible (light gray)
- Content behind is blurred but recognizable

**Color Values:**
- Main: `bg-white/95` (95% white)
- Header: `bg-gray-50/80` (80% light gray)
- Border: `border-gray-200/50` (50% opacity)
- Blur: `backdrop-blur-xl` (24px)

### Dark Mode Glassmorphism

**Expected Appearance:**
- Deep, rich frosted glass look
- Higher opacity for better readability
- Dark gray/charcoal tones with strong shadows
- Borders more prominent (needed for definition)
- Content behind is blurred and darkened

**Color Values:**
- Main: `bg-gray-900/95` (95% dark gray)
- Header: `bg-gray-800/80` (80% medium gray)
- Border: `border-gray-700/50` (50% opacity)
- Blur: `backdrop-blur-xl` (24px)

---

## 🐛 KNOWN ISSUES TO VERIFY

### Fixed Issues

- [x] ShareModal portal rendering (fixed with createPortal)
- [x] Bottom navbar glassmorphism implementation
- [x] Dialog overlay backdrop blur
- [x] Tab navigation glass effect

### Potential Issues to Watch

- [ ] **Firefox:** Backdrop blur may fallback to solid (acceptable degradation)
- [ ] **Safari iOS:** Blur performance on older devices
- [ ] **Chrome Android:** Blur rendering on low-end devices
- [ ] **OLED screens:** Check for burn-in risk with static elements

---

## 📱 MOBILE-FIRST TESTING PROTOCOL

### Device Testing Matrix

**Priority 1 - iPhone SE (375px):**
- [ ] Bottom navbar glass visible and functional
- [ ] All modals fit viewport (w-[95vw])
- [ ] Touch targets ≥44px
- [ ] Blur doesn't degrade performance
- [ ] Animations smooth at 60fps

**Priority 2 - iPhone 14 Pro Max (428px):**
- [ ] Same tests as iPhone SE
- [ ] Verify larger screen doesn't break layouts
- [ ] Glass effect scales appropriately

**Priority 3 - iPad (768px - 1024px):**
- [ ] Modals use max-w-2xl correctly
- [ ] Glass effect visible on larger surface
- [ ] Touch targets still comfortable

**Priority 4 - Desktop (1280px+):**
- [ ] Glass effect visible (not just mobile feature)
- [ ] Hover states work correctly
- [ ] Max widths prevent over-expansion

### Mobile Performance Checks

- [ ] Glass rendering at 60fps
- [ ] No jank when scrolling with glass elements
- [ ] Modal open/close animations smooth
- [ ] Theme toggle doesn't freeze UI
- [ ] Multiple modals don't stack glass effects poorly

---

## 🎨 ACCESSIBILITY TESTING

### Contrast Ratios (WCAG AA)

**Light Mode:**
- [ ] Text on glass backgrounds: ≥4.5:1 (AA)
- [ ] Icons on glass backgrounds: ≥3:1 (AA)
- [ ] Borders visible (not required for WCAG but UX critical)

**Dark Mode:**
- [ ] Text on glass backgrounds: ≥4.5:1 (AA)
- [ ] Icons on glass backgrounds: ≥3:1 (AA)
- [ ] Borders provide sufficient definition

### Screen Reader Testing

- [ ] Glass effects don't interfere with screen reader
- [ ] Modal overlays properly trap focus
- [ ] Close buttons accessible
- [ ] Tab navigation works correctly

### Reduced Motion

- [ ] Check if `prefers-reduced-motion` is respected
- [ ] Glass effects should remain (no animation needed for glass)
- [ ] Transition durations should reduce to 0ms

---

## ✅ ACCEPTANCE CRITERIA

### Must Pass (Blocking Issues)

- [ ] All glassmorphism components visible in dark mode
- [ ] Backdrop blur working in Chrome, Safari, Edge
- [ ] No white backgrounds in dark mode
- [ ] No FOUC when toggling theme
- [ ] Touch targets ≥44px on mobile
- [ ] 60fps animations maintained

### Should Pass (Nice to Have)

- [ ] Blur works in Firefox (or graceful fallback)
- [ ] Smooth animations on mid-range devices
- [ ] Consistent glass effect across all modals
- [ ] No performance issues on OLED devices

### Can Fail (Known Limitations)

- [ ] Blur may not work in older browsers (fallback to solid)
- [ ] Slight performance degradation on very old devices
- [ ] Reduced motion disables transitions (glass remains)

---

## 📝 BUG REPORT TEMPLATE

If issues found, use this template:

```markdown
**Component:** [e.g., BottomNavbar]
**File:** [e.g., components/navigation/BottomNavbar.tsx]
**Line:** [e.g., Line 95]

**Issue:**
[Clear description of what's wrong]

**Expected:**
[What glassmorphism should look like]

**Actual:**
[What it currently looks like]

**Screenshot:**
[Attach screenshot showing issue in dark mode]

**Device/Browser:**
[e.g., iPhone 14 Pro / Safari 16]

**Severity:**
- [ ] Critical - Blocks dark mode launch
- [ ] High - Noticeable visual issue
- [ ] Medium - Minor inconsistency
- [ ] Low - Enhancement

**Suggested Fix:**
[Optional - proposed CSS changes]
```

---

## 🎯 FINAL RECOMMENDATIONS

### Before Deployment

1. **Test on Real Devices:**
   - iPhone SE (375px) - minimum viable
   - iPhone 14 Pro Max (428px) - optimal
   - iPad (768px) - tablet experience
   - Desktop Chrome (1280px+) - desktop verification

2. **Performance Audit:**
   - Run Lighthouse performance test
   - Check frame rate during animations
   - Verify blur doesn't cause jank

3. **Cross-Browser Check:**
   - Chrome (primary)
   - Safari (iOS critical)
   - Firefox (graceful degradation)
   - Edge (Chromium-based)

### Post-Deployment Monitoring

- [ ] Monitor support tickets for glass effect complaints
- [ ] Check analytics for theme toggle usage
- [ ] Track performance metrics on mobile
- [ ] Gather user feedback on visual quality

---

## 📚 REFERENCES

- **Design System:** `docs/DARK-MODE-DESIGN-SYSTEM.md`
- **Visual Guide:** `docs/DARK-MODE-VISUAL-GUIDE.md`
- **Implementation Summary:** `docs/DARK-MODE-IMPLEMENTATION-SUMMARY.md`
- **Mobile-First Checklist:** `.claude/mobile-first-checklist.md`

---

**Test Completed By:** _________________
**Date:** _________________
**Sign-off:** _________________

---

**Status:** ✅ READY FOR QA TESTING
