# CharacterHeader Visual Reference

## Component Layout

```
┌─────────────────────────────────────────────────────┐
│                                      [Logout] ←─┐   │
│  ┌────────┐  Name                              │   │
│  │        │  Level 12 Scholar ←─ Dynamic Title │   │
│  │ Avatar │                                     │   │
│  │  +XP   │                                     │   │
│  └────────┘                                     │   │
│                                                 │   │
│  Level 12                  3450 / 5000 XP       │   │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░ ←─ Progress Bar    │   │
│                                                 │   │
│            🔥 7 Days  ←─ Streak Badge          │   │
└─────────────────────────────────────────────────────┘
```

## Visual Hierarchy

1. **Avatar** (Primary Focus)
   - Size: 64px (mobile) → 80px (desktop)
   - Gradient border: Blue → Purple → Pink
   - Fallback: User initials on gradient background

2. **User Name** (Secondary)
   - Font: 18-20px, Bold
   - Color: Gray-900 (light) / White (dark)

3. **Dynamic Title** (Tertiary)
   - Font: 14-16px, Semibold
   - Color: Custom per level tier
   - Examples:
     - "Level 5 Student" (Gray)
     - "Level 12 Scholar" (Blue)
     - "Level 25 Expert" (Purple)
     - "Level 35 Master" (Amber)

4. **XP Progress Bar** (Supporting)
   - Height: 10px (mobile) → 12px (desktop)
   - Gradient: Blue → Purple → Pink
   - Smooth 500ms animation

5. **Streak Badge** (Accent)
   - Conditional: Only shows if currentStreak > 0
   - Pulse animation: Activates at 7+ days
   - Background: Orange/Red gradient

## Color Palette

### Light Mode
- Background: `from-blue-50 to-purple-50`
- Text Primary: `text-gray-900`
- Text Secondary: `text-gray-600`
- Progress Bar: `from-blue-500 via-purple-500 to-pink-500`
- Streak Badge: `from-orange-500 to-red-500`

### Dark Mode
- Background: `dark:from-blue-950/40 dark:to-purple-950/40`
- Text Primary: `dark:text-white`
- Text Secondary: `dark:text-gray-400`
- Progress Bar: (Same gradient, adjusted opacity)
- Streak Badge: `dark:text-orange-500`

## Spacing

```
Padding: 16px (mobile) | 20px (desktop)
├── Avatar → Name Gap: 16px
├── Name → Title Gap: 4px
├── Title → Progress Gap: 16px
├── Progress → Streak Gap: 12px
└── Logout Button Position: top-3 right-3
```

## Interactive States

### Default
- Avatar: Gradient border, scale(1)
- Progress Bar: 0% → N% (animated)
- Streak Badge: Visible if streak > 0

### Hover (Desktop Only)
- Avatar: scale(1.05)
- Logout Button: Background lightens, icon turns red

### Focus (Keyboard Navigation)
- Avatar: Visible focus ring
- Logout Button: Visible focus ring

### Active/Pressed
- Avatar: scale(0.98)
- Logout Button: scale(0.95)

## Responsive Breakpoints

### Mobile (< 768px)
```
Avatar: 64px
Name: 18px
Title: 14px
Progress: 10px height
Streak: 14px text
```

### Desktop (≥ 768px)
```
Avatar: 80px
Name: 20px
Title: 16px
Progress: 12px height
Streak: 16px text
```

## Animation Details

### Progress Bar Fill
- Duration: 500ms
- Easing: ease-out
- Trigger: On component mount/update

### Streak Badge Pulse
- Condition: currentStreak >= 7
- Duration: 2s infinite
- Effect: Opacity 100% → 70% → 100%

### Logout Button Hover
- Duration: 300ms
- Effect: scale(1.05) + color change

## Accessibility Features

### ARIA Labels
```tsx
// Logout button
aria-label="Log out"

// Avatar (when clickable)
role="button"
tabIndex={0}

// Streak badge
aria-label="7 day study streak"
```

### Keyboard Navigation
- Tab Order: Logout → Avatar
- Enter/Space: Activate button/link
- Focus Indicators: Visible ring on all interactive elements

### Screen Reader Announcements
- "Alex, Level 12 Scholar"
- "3450 out of 5000 XP, 69% progress"
- "7 day streak"
- "Log out button"

## Example Configurations

### Beginner (Low Level)
```tsx
{
  level: 3,
  xp: 450,
  xpForNextLevel: 1000,
  xpProgress: 45,
  currentStreak: 2,
  title: "Level 3 Student",
  titleColor: "text-gray-600"
}
```

### Intermediate (Mid Level)
```tsx
{
  level: 15,
  xp: 6800,
  xpForNextLevel: 10000,
  xpProgress: 68,
  currentStreak: 12,
  title: "Level 15 Scholar",
  titleColor: "text-blue-600"
}
```

### Advanced (High Level)
```tsx
{
  level: 28,
  xp: 45000,
  xpForNextLevel: 50000,
  xpProgress: 90,
  currentStreak: 45,
  title: "Level 28 Expert",
  titleColor: "text-purple-600"
}
```

### Master (Elite Level)
```tsx
{
  level: 42,
  xp: 95000,
  xpForNextLevel: 100000,
  xpProgress: 95,
  currentStreak: 100,
  title: "Level 42 Master",
  titleColor: "text-amber-600"
}
```

## Component Props Quick Reference

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `user` | object | ✅ | Supabase user object |
| `stats` | object | ✅ | Level, XP, streak data |
| `onLogout` | function | ✅ | Logout handler |
| `onClick` | function | ⬜ | Avatar click handler |

## File Locations

```
components/profile/
├── CharacterHeader.tsx          # Main component
├── CharacterHeaderExample.tsx   # Usage examples
└── README.md                    # Full documentation

docs/
├── CHARACTER_HEADER_INTEGRATION.md  # Integration guide
└── CHARACTER_HEADER_VISUAL.md       # This file
```

## Design System Compliance

✅ **Mobile-First**: Responsive at 320px, 768px, 1024px
✅ **Touch Targets**: 48px minimum (logout button)
✅ **Color Palette**: Blue/Purple gradient theme
✅ **Spacing**: 16px padding, 12px gaps
✅ **Typography**: Bold/Semibold hierarchy
✅ **Accessibility**: WCAG AA, keyboard nav
✅ **Dark Mode**: Proper dark variants
✅ **Animations**: 300-500ms, ease-out

## Common Issues & Solutions

### Avatar not loading
**Solution**: Check `user.user_metadata.avatar_url` exists, verify CORS settings

### Progress bar not animating
**Solution**: Ensure `xpProgress` is 0-100 (not 0-1 fraction)

### Streak badge not showing
**Solution**: Verify `currentStreak > 0`, check conditional rendering

### Dark mode colors wrong
**Solution**: Use `dark:` prefix, check Tailwind config

### Logout button not working
**Solution**: Verify `onLogout` function is passed, check Supabase client

---

**Last Updated**: 2025-10-21
**Status**: Production Ready
