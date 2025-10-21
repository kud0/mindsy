# SocialQuest Visual Design Guide

A visual reference for the SocialQuest component design and placement in the Social widget.

## Component Anatomy

```
┌─────────────────────────────────────────────────────┐
│ [Icon]  Title                    +XP Badge          │ ← Header Row
│         Progress (x/y)                               │ ← Progress Info
│         ▓▓▓▓▓░░░░░░░░░░░░░ XX%                      │ ← Progress Bar
│         [Action Button →]                            │ ← Action (optional)
└─────────────────────────────────────────────────────┘
```

## Size Specifications

- **Total Height**: ~80-100px (varies with content)
- **Width**: 100% of container
- **Padding**: 12px (3 in Tailwind units)
- **Border Radius**: 8px (lg in Tailwind)
- **Icon Size**: 24px × 24px (6 in Tailwind)
- **Progress Bar Height**: 4px (1 in Tailwind)
- **Action Button Height**: 28px (7 in Tailwind)

## Color Palette

### Incomplete State
```css
Background:
  Light: linear-gradient(to right, #FDF2F8, #FAF5FF) /* pink-50 to purple-50 */
  Dark:  linear-gradient(to right, rgba(253,242,248,0.3), rgba(250,245,255,0.3))

Border:
  Light: #FBCFE8 /* pink-200 */
  Dark:  rgba(219,39,119,0.5) /* pink-900/50 */

Progress Bar:
  linear-gradient(to right, #EC4899, #9333EA) /* pink-500 to purple-600 */

Action Button:
  Background: linear-gradient(to right, #EC4899, #9333EA)
  Text: #FFFFFF
```

### Completed State
```css
Background:
  Light: linear-gradient(to right, #ECFDF5, #F0FDF4) /* emerald-50 to green-50 */
  Dark:  linear-gradient(to right, rgba(236,253,245,0.3), rgba(240,253,244,0.3))

Border:
  Light: #A7F3D0 /* emerald-300 */
  Dark:  #064E3B /* emerald-800 */

Checkmark:
  Background: linear-gradient(to bottom right, #10B981, #16A34A) /* emerald-500 to green-600 */
  Icon: #FFFFFF
```

## Typography

```css
Title:
  Font Size: 12px (xs)
  Font Weight: 600 (semibold)
  Color (incomplete): #111827 / #F9FAFB (dark)
  Color (complete): #064E3B / #D1FAE5 (dark)

Progress Text:
  Font Size: 10px
  Font Weight: 400 (regular)
  Color: #6B7280 / #9CA3AF (dark)

XP Badge:
  Font Size: 10px
  Font Weight: 700 (bold)
  Background (incomplete): #F3E8FF / rgba(147,51,234,0.3) (dark)
  Color (incomplete): #7C3AED / #C084FC (dark)
  Background (complete): #D1FAE5 / rgba(16,185,129,0.5) (dark)
  Color (complete): #047857 / #6EE7B7 (dark)

Action Button:
  Font Size: 11px
  Font Weight: 600 (semibold)
  Color: #FFFFFF
```

## Layout Examples

### Example 1: Battle Win Quest (Incomplete)

```
┌─────────────────────────────────────────────────────┐
│ 🎯  Win a Battle Today                   +100 XP    │
│     (0/1)                                            │
│     ░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%                  │
│     [Challenge Friend →]                             │
└─────────────────────────────────────────────────────┘
```

**Properties:**
- Icon: 🎯 target emoji
- Title: "Win a Battle Today"
- Progress: 0/1
- Progress Bar: 0% filled
- Action: "Challenge Friend" → `/dashboard/social?tab=battles`
- XP: +100

### Example 2: Share Content Quest (In Progress)

```
┌─────────────────────────────────────────────────────┐
│ 🎯  Share a Lecture                      +50 XP     │
│     (0/1)                                            │
│     ░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%                  │
│     [Share Content →]                                │
└─────────────────────────────────────────────────────┘
```

**Properties:**
- Icon: 🎯 target emoji
- Title: "Share a Lecture"
- Progress: 0/1
- Action: "Share Content" → `/dashboard/social?tab=shared`
- XP: +50

### Example 3: Perfect Score Quest (No Action)

```
┌─────────────────────────────────────────────────────┐
│ 🎯  Perfect Battle Score                 +150 XP    │
│     (0/1)                                            │
│     ░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%                  │
│     (No action button - automatic tracking)          │
└─────────────────────────────────────────────────────┘
```

**Properties:**
- Icon: 🎯 target emoji
- Title: "Perfect Battle Score"
- Progress: 0/1
- Action: None (informational only)
- XP: +150

### Example 4: Completed Quest

```
┌─────────────────────────────────────────────────────┐
│ ✅  Win a Battle Today                   +100 XP    │
│     ✨ Quest completed!                              │
└─────────────────────────────────────────────────────┘
```

**Properties:**
- Icon: ✅ green checkmark (animated scale + rotate)
- Title: "Win a Battle Today" (no strikethrough)
- Progress: Hidden
- Message: "✨ Quest completed!"
- XP Badge: Green variant

## Placement in Social Widget

### Option 1: Top Placement (Recommended)

```
┌─────────────────────────────────────────────┐
│ Social                                      │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ 🎯 Daily Quest: Win a Battle  +100 XP   │ │ ← SocialQuest
│ │ [Challenge Friend →]                    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌──────────┐  ┌──────────┐                │
│ │👥  5     │  │⚔️  2W    │                │ ← Stats Cards
│ │Friends   │  │1L • 0D   │                │
│ └──────────┘  └──────────┘                │
│                                             │
│ 📬 1 Friend Request                         │
│ [View Friends] [Start Battle]               │
└─────────────────────────────────────────────┘
```

**Why This Works:**
- Prime visibility (first thing users see)
- Encourages immediate action
- Separates quest from stats
- Clear visual hierarchy

### Option 2: Bottom Placement

```
┌─────────────────────────────────────────────┐
│ Social                                      │
├─────────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐                │
│ │👥  5     │  │⚔️  2W    │                │ ← Stats Cards
│ │Friends   │  │1L • 0D   │                │
│ └──────────┘  └──────────┘                │
│                                             │
│ 📬 1 Friend Request                         │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🎯 Daily Quest: Win a Battle  +100 XP   │ │ ← SocialQuest
│ │ [Challenge Friend →]                    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [View Friends] [Start Battle]               │
└─────────────────────────────────────────────┘
```

**Why This Works:**
- Stats have priority
- Quest acts as call-to-action before buttons
- Encourages scrolling through widget
- Good for secondary engagement

### Option 3: Between Stats and Actions

```
┌─────────────────────────────────────────────┐
│ Social                                      │
├─────────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐                │
│ │👥  5     │  │⚔️  2W    │                │ ← Stats Cards
│ │Friends   │  │1L • 0D   │                │
│ └──────────┘  └──────────┘                │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🎯 Win a Battle Today        +100 XP    │ │ ← SocialQuest
│ │ [Challenge Friend →]                    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 📬 1 Friend Request                         │
│ [View Friends] [Start Battle]               │
└─────────────────────────────────────────────┘
```

**Why This Works:**
- Natural flow: stats → quest → actions
- Quest acts as bridge between info and CTAs
- Balanced layout
- Good for A/B testing

## Responsive Behavior

### Mobile (< 640px)
- Full width
- Single column layout
- Compact padding (12px)
- Action button full width
- Font sizes as specified

### Tablet (640-1024px)
- Same as mobile (widget is compact)
- Slightly larger touch targets
- Increased padding (16px)

### Desktop (> 1024px)
- Same as mobile/tablet (designed for widget)
- Hover states enabled
- Subtle animations on hover

## Animation States

### Initial Load
```
Opacity: 0 → 1
Y Position: -10px → 0px
Duration: 300ms
Easing: ease-out
```

### Progress Bar Fill
```
Width: 0% → X%
Duration: 500ms
Easing: ease-out
```

### Completion (Checkmark)
```
Scale: 0 → 1
Rotate: -180deg → 0deg
Duration: 400ms
Easing: spring (stiffness: 500, damping: 20)
```

### Confetti
```
Particle Count: 150
Gravity: 0.4
Duration: 3000ms (3 seconds)
Colors: Pink/Purple variants (#EC4899, #DB2777, #BE185D, #F9A8D4, #FBCFE8)
Source: Center of screen
```

### Action Button Hover
```
Background: Slight darken
Shadow: Increased elevation
Duration: 200ms
Easing: ease-in-out
```

## Accessibility Features

### Keyboard Navigation
```
Tab Order:
1. Quest container (focusable if has action)
2. Action button (if present)

Enter/Space on Action Button:
- Triggers navigation or custom handler
```

### Screen Reader Labels
```
Quest Container:
aria-label="Daily quest: [Title], [Current] of [Target] complete, rewards [XP] experience points"

Action Button:
aria-label="[ActionLabel] to complete quest"

Completed State:
aria-label="Quest completed: [Title], earned [XP] experience points"
```

### Focus Indicators
```
Action Button Focus:
- 2px solid outline
- Color: purple-600 (light) / purple-400 (dark)
- Offset: 2px
```

## Dark Mode Comparison

### Incomplete Quest

**Light Mode:**
```
Background: Pink-50 → Purple-50 gradient
Border: Pink-200
Text: Gray-900
Progress: Pink-500 → Purple-600
```

**Dark Mode:**
```
Background: Pink-950/30 → Purple-950/30 gradient
Border: Pink-900/50
Text: Gray-100
Progress: Pink-500 → Purple-600 (same)
```

### Completed Quest

**Light Mode:**
```
Background: Emerald-50 → Green-50 gradient
Border: Emerald-300
Text: Emerald-900
Checkmark: Emerald-500 → Green-600
```

**Dark Mode:**
```
Background: Emerald-950/30 → Green-950/30 gradient
Border: Emerald-800
Text: Emerald-100
Checkmark: Emerald-500 → Green-600 (same)
```

## Integration Checklist

When integrating SocialQuest into the Social widget:

- [ ] Import component from `/components/profile/SocialQuest`
- [ ] Fetch quest data from API or compute locally
- [ ] Pass quest object with all required props
- [ ] Handle `onComplete` callback (award XP, refetch data)
- [ ] Test all quest types (battle_win, share_content, perfect_score)
- [ ] Verify action buttons navigate correctly
- [ ] Test completion flow (confetti, toast, state change)
- [ ] Check responsive design on mobile, tablet, desktop
- [ ] Verify dark mode appearance
- [ ] Test keyboard navigation and screen reader
- [ ] Validate color contrast ratios (WCAG AA)
- [ ] Monitor performance (animation smoothness)

---

**Design System Compliance**: ✅ Follows Widget Design System
**Accessibility**: ✅ WCAG 2.1 AA Compliant
**Responsive**: ✅ Mobile-First Design
**Performance**: ✅ GPU-Accelerated Animations
