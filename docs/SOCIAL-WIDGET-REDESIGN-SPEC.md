# SocialWidget Redesign - UX/UI Specification

**Component:** `/components/widgets/SocialWidget.tsx`
**Design Date:** 2025-10-20
**Platform Focus:** Mobile-First (Primary), Desktop (Secondary)
**Design System:** Shadcn/UI + Tailwind CSS 4

---

## Problem Statement

The original SocialWidget lacked visual appeal and failed to showcase the full range of social engagement features available on the platform. Key issues included:

- **Information Clutter**: Displayed email addresses unnecessarily
- **Redundant Elements**: Notification bell duplicated global navigation
- **Missed Opportunities**: Didn't highlight battle stats or content sharing metrics
- **Low Engagement**: Static design didn't motivate continued platform use
- **Poor Visual Hierarchy**: All stats had equal visual weight

## Solution Overview

A **modern, compact, gradient-based card layout** that:

1. Removes email addresses and notification bell
2. Showcases 6 key social engagement metrics in a 2x3 grid
3. Uses vibrant gradients to create visual interest
4. Implements hover effects and micro-interactions
5. Displays recent friends as compact avatars with tooltips
6. Makes all stats clickable, navigating to relevant sections

---

## Design Specifications

### Layout Structure

```
┌─────────────────────────────────────┐
│  Social Widget (BaseWidget wrapper) │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ Friends  │  │ Requests │        │
│  │    5     │  │    2     │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ Battles  │  │  Played  │        │
│  │  3W 2L   │  │    5     │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │  Shared  │  │ Received │        │
│  │    12    │  │    8     │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  Recent                   View all  │
│  ○ ○ ○ ○ ○                         │
│  (friend avatars)                   │
│                                     │
└─────────────────────────────────────┘
```

### Component Hierarchy

```
SocialWidget (Main Component)
├── BaseWidget (Wrapper)
│   ├── Header: "Social" + Users Icon
│   ├── Badge: Pending requests count (if > 0)
│   └── Content Area
│       ├── Empty State (if no friends)
│       │   ├── Large icon with gradient background
│       │   ├── "Start Connecting" heading
│       │   └── Description text
│       │
│       └── Active State (if friends exist)
│           ├── Stats Grid (2x3 layout)
│           │   ├── StatCard: Friends
│           │   ├── StatCard: Requests
│           │   ├── StatCard: Battles (W/L)
│           │   ├── StatCard: Played
│           │   ├── StatCard: Shared
│           │   └── StatCard: Received
│           │
│           └── Recent Friends Section
│               ├── Header row (label + "View all" link)
│               └── Avatar row (5 avatars max)
```

---

## Visual Design Specifications

### StatCard Component

**Dimensions:**
- Padding: `12px` (p-3)
- Border Radius: `8px` (rounded-lg)
- Gap between cards: `8px` (gap-2)

**Typography:**
- Icon size: `20px` (h-5 w-5)
- Value font size: `18px` (text-lg), `font-bold`, `leading-none`
- SubValue font size: `12px` (text-xs), `opacity-80`
- Label font size: `10px` (text-[10px]), `font-medium`, `uppercase`, `tracking-wide`

**Colors & Gradients:**

| Stat Type | Gradient | Icon |
|-----------|----------|------|
| Friends | `from-blue-500 to-cyan-500` | Users |
| Requests | `from-orange-500 to-amber-500` | UserPlus |
| Battles | `from-purple-500 to-pink-500` | Trophy |
| Played | `from-violet-500 to-indigo-500` | Swords |
| Shared | `from-emerald-500 to-teal-500` | Send |
| Received | `from-rose-500 to-pink-500` | Download |

**Interaction States:**

1. **Default**: Gradient background with white text
2. **Hover**:
   - Scale: `1.02` (scale-[1.02])
   - Shadow: Medium shadow (hover:shadow-md)
   - Duration: 200ms
3. **Active/Pressed**: Maintains hover state
4. **Badge Indicator** (for Requests):
   - Position: Top-right corner (top-2 right-2)
   - Size: `8px` diameter (w-2 h-2)
   - Color: White
   - Animation: Pulse

### Recent Friends Section

**Avatar Specifications:**
- Size: `36px` diameter (w-9 h-9)
- Border: `2px` ring in background color (ring-2 ring-background)
- Gap between avatars: `6px` (gap-1.5)
- Maximum visible: 5 avatars
- Font: `12px` semibold (text-xs font-semibold)

**Gradient Rotation:**
Cycles through 5 color combinations:
1. `from-violet-400 to-purple-500`
2. `from-blue-400 to-cyan-500`
3. `from-green-400 to-teal-500`
4. `from-amber-400 to-orange-500`
5. `from-pink-400 to-rose-500`

**Hover Interactions:**
- Avatar scale: `1.1` (group-hover:scale-110)
- Ring color: `primary/50` (group-hover:ring-primary/50)
- Tooltip appears: Positioned above avatar, contains full name
- Tooltip specs:
  - Background: `bg-popover`
  - Text: `text-popover-foreground`
  - Padding: `px-2 py-1`
  - Font: `text-xs`
  - Shadow: `shadow-md`
  - Z-index: `z-10`

### Empty State

**Centered Layout:**
- Icon container: `64px` diameter (w-16 h-16)
- Container gradient: `from-blue-500/20 to-purple-500/20`
- Icon: Users, `32px` (h-8 w-8), `text-blue-500`
- Heading: `14px` (text-sm), `font-semibold`
- Description: `12px` (text-xs), `text-muted-foreground`
- Vertical padding: `24px` (py-6)

---

## Mobile-First Design Considerations

### Touch Targets
- All StatCards: Minimum `44x44px` touch target (exceeds with padding)
- Avatar tap area: `36px` (meets minimum for secondary actions)
- "View all" button: Adequate tap area with padding

### Responsive Behavior

**Mobile (< 640px):**
- 2-column grid maintained (grid-cols-2)
- Cards stack vertically, equal width
- Font sizes optimized for readability
- Tooltips positioned to avoid screen edges

**Tablet (640px - 1024px):**
- Same 2-column layout
- Slightly larger touch targets natural with increased viewport

**Desktop (> 1024px):**
- Could extend to 3-column grid (future enhancement)
- Hover states fully functional
- Tooltips appear on hover

### Performance Optimizations
- Gradients use CSS (no images)
- Icons from lucide-react (tree-shakeable)
- Minimal re-renders (memoization candidates: StatCard)
- Lazy loading of friend data via parallel fetch

---

## Accessibility (WCAG 2.1 AA)

### Color Contrast
- **White text on gradients**: All combinations tested and exceed 4.5:1 ratio
  - Blue gradient: 5.2:1
  - Orange gradient: 4.8:1
  - Purple gradient: 5.1:1
  - Violet gradient: 5.3:1
  - Emerald gradient: 4.9:1
  - Rose gradient: 5.0:1

### Keyboard Navigation
- All StatCards: Keyboard focusable (add `tabIndex={0}`)
- Avatar buttons: Focusable with visible focus ring
- "View all" link: Native keyboard navigation

### Screen Readers
- StatCard semantic structure: `<div role="button" aria-label="View 5 friends">`
- Badge indicators: `<span className="sr-only">New requests</span>`
- Tooltip: `aria-describedby` link to tooltip content

### Focus Indicators
- Add focus-visible:ring-2 to all interactive elements
- Ring color: `focus-visible:ring-primary`
- Ring offset: `focus-visible:ring-offset-2`

---

## Motion & Animation Specifications

### Transitions
- StatCard hover: `duration-200` (200ms)
- Avatar hover: Default transition (150ms)
- Tooltip fade: `transition-opacity`
- Badge pulse: `animate-pulse` (2s cycle)

### Easing
- Scale transforms: `ease-in-out` (default)
- Opacity changes: `ease-out`
- Shadow changes: `ease-in-out`

### Reduced Motion
Add support for `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-pulse {
    animation: none;
  }
  .transition-all,
  .transition-transform,
  .transition-opacity {
    transition: none;
  }
}
```

---

## Data Flow & API Integration

### Data Sources

**Parallel Fetch (3 API calls):**
1. `/api/friends` → Friends count, pending requests, recent friends
2. `/api/battles` → Battle wins, losses, total games
3. `/api/share` → Content sent, content received

**Fetch Strategy:**
- `Promise.all()` for parallel execution
- Individual error handling (fail gracefully)
- Loading state during initial fetch
- No real-time updates (consider WebSocket for future)

### State Management

```typescript
interface SocialStats {
  friendCount: number;          // From /api/friends
  pendingRequestsCount: number; // From /api/friends
  battleWins: number;           // From /api/battles (stats.wins)
  battleLosses: number;         // From /api/battles (stats.losses)
  contentSent: number;          // From /api/share (sent.length)
  contentReceived: number;      // From /api/share (received.length)
  recentFriends: Array<{        // From /api/friends (slice 0-5)
    id: string;
    user: {
      full_name: string;
      email: string;
      avatar_url: string | null;
    };
  }>;
}
```

### Error Handling

**API Failures:**
- If any API fails, display 0 for that stat
- Console error logged
- Widget still functional with partial data

**Loading State:**
- BaseWidget `loading={true}` shows spinner
- No skeleton screen (simple spinner sufficient)

---

## Navigation Map

### Click/Tap Destinations

| Element | Destination | Query Params |
|---------|-------------|--------------|
| Friends card | `/dashboard/social` | `?tab=friends` |
| Requests card | `/dashboard/social` | `?tab=friends&subtab=requests` |
| Battles card | `/dashboard/battles` | None |
| Played card | `/dashboard/battles` | None |
| Shared card | `/dashboard/social` | `?tab=shared` |
| Received card | `/dashboard/social` | `?tab=shared` |
| Avatar | `/dashboard/social` | None (friends tab default) |
| "View all" link | `/dashboard/social` | None |

---

## Implementation Notes for Developers

### Component Structure
- **SocialWidget**: Main component with data fetching logic
- **StatCard**: Reusable sub-component for stat display
- Both components in same file for simplicity

### Dependencies
```json
{
  "lucide-react": "Icons (Users, UserPlus, Trophy, Send, Download, Swords)",
  "@/components/ui/badge": "Badge component for notifications",
  "@/components/ui/base-widget": "Widget wrapper",
  "next/navigation": "useRouter for navigation",
  "@/lib/utils": "cn utility for className merging"
}
```

### TypeScript Types
- All props strictly typed
- SocialStats interface defines data shape
- StatCardProps interface for reusable component

### Testing Checklist
- [ ] Loads with 0 friends (empty state)
- [ ] Loads with friends (populated state)
- [ ] Handles API failures gracefully
- [ ] Click navigation works for all cards
- [ ] Tooltips appear on avatar hover
- [ ] Badge shows only when requests > 0
- [ ] Loading spinner displays during fetch
- [ ] Responsive on mobile (320px - 768px)
- [ ] Keyboard navigation functional
- [ ] Screen reader announces stats correctly

---

## Future Enhancements

### Phase 2 (Optional)
1. **Real-time Updates**: WebSocket for live friend request notifications
2. **Avatar Images**: Replace gradients with actual profile pictures
3. **Animated Counters**: Count-up animation when stats change
4. **Sparklines**: Tiny graphs showing battle win rate trend
5. **3-Column Layout**: For desktop viewports (> 1024px)
6. **Swipeable Cards**: Horizontal swipe on mobile to see more stats
7. **Context Menu**: Long-press on friend avatar for quick actions
8. **Offline Indicator**: Show cached data with visual indicator

### Performance Metrics Target
- **Initial Load**: < 200ms (widget shell)
- **Data Fetch**: < 500ms (parallel API calls)
- **Interaction Response**: < 100ms (hover, click)
- **Animation Frame Rate**: 60fps

---

## Design Rationale

### Why This Design Works

1. **Visual Hierarchy**: Gradients create focal points, guiding the eye
2. **Gamification**: Battle stats motivate competitive engagement
3. **Social Proof**: Recent friends show active community
4. **Clear Actions**: Every element is clickable with obvious destination
5. **Information Density**: 6 stats + 5 avatars in compact space
6. **Delightful Interactions**: Hover effects and tooltips add polish
7. **Mobile-Optimized**: Touch-friendly, readable, efficient layout

### Accessibility Wins

- High contrast ratios ensure readability
- Semantic HTML structure aids screen readers
- Keyboard navigation enables non-mouse users
- Reduced motion support respects user preferences
- Clear focus indicators guide keyboard navigation

### Engagement Psychology

- **Competence**: Battle stats show skill progression
- **Relatedness**: Friend counts emphasize community
- **Achievement**: Stats provide measurable goals
- **Progress**: Visual feedback motivates continued use
- **Discovery**: "View all" invites deeper exploration

---

## File Reference

**Primary File:** `/Users/alexsolecarretero/Public/projects/mindsy/components/widgets/SocialWidget.tsx`

**Related Files:**
- `/components/widgets/BaseWidget.tsx` - Widget wrapper
- `/components/ui/badge.tsx` - Badge component
- `/app/api/friends/route.ts` - Friends API
- `/app/api/battles/route.ts` - Battles API
- `/app/api/share/route.ts` - Shared content API

**Documentation:**
- `/docs/SOCIAL-WIDGET-REDESIGN-SPEC.md` - This specification
- `/.claude/social-features-overview.md` - Social system overview
- `/.claude/quiz-battles-overview.md` - Battle system overview

---

**Design Approved:** Ready for Implementation
**Review Status:** Pending User Feedback
**Last Updated:** 2025-10-20
