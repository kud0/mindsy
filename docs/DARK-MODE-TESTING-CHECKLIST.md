# Dark Mode Manual Testing Checklist
**Version:** 1.0
**Date:** 2025-10-21

Use this checklist to verify dark mode implementation before production deployment.

---

## Pre-Testing Setup

```bash
# Start development server
npm run dev

# Navigate to
http://localhost:3001/dashboard/lectures
```

---

## 1. Theme Toggle Test (5 min)

### Desktop
- [ ] Open app in light mode
- [ ] Toggle to dark mode (system preferences OR app toggle)
- [ ] **Verify:** No white flashes during transition
- [ ] **Verify:** Smooth color transition (~300ms)
- [ ] **Verify:** All visible text is readable
- [ ] **Verify:** All borders are visible
- [ ] Toggle back to light mode
- [ ] **Verify:** Transition works both ways
- [ ] Refresh page
- [ ] **Verify:** Theme persists after refresh

### Expected Results
- Light mode: Background `#FAFAFA`, text dark gray
- Dark mode: Background `#1C1C1E`, text light gray
- iOS address bar matches theme color

---

## 2. StudentDesk Component Test (15 min)

### Navigation & Header
- [ ] Open any lecture from lectures page
- [ ] **Verify:** Header background is correct (light/dark)
- [ ] **Verify:** Back arrow is visible
- [ ] **Verify:** Lecture title is readable
- [ ] **Verify:** Metadata text (difficulty, time, domain) is visible but muted

### Tab Strip
- [ ] **Verify:** Tab background matches theme
- [ ] **Verify:** Active tab has primary color indicator
- [ ] **Verify:** Inactive tabs are muted
- [ ] **Verify:** Border below tabs is visible
- [ ] Click each tab (Overview, Explanations, Summary, Questions, Study Time, Materials)
- [ ] **Verify:** Active state changes correctly

### Content Area (Test Each Tab)

**Overview Tab:**
- [ ] **Verify:** Section headings are readable (foreground color)
- [ ] **Verify:** Body text is readable
- [ ] **Verify:** Bullet points are visible
- [ ] **Verify:** Border separators are subtle but visible
- [ ] **Verify:** Icons (BookOpen, Target, List) are properly colored

**Explanations Tab:**
- [ ] **Verify:** Concept cards have correct background
- [ ] **Verify:** Card borders are visible
- [ ] **Verify:** Importance badges use semantic colors
- [ ] **Verify:** Expandable sections work
- [ ] **Verify:** Hover states are visible

**Summary Tab:**
- [ ] **Verify:** Section headings stand out
- [ ] **Verify:** Key points are readable
- [ ] **Verify:** Warning boxes (pitfalls) are visible
- [ ] **Verify:** Background colors for info boxes work in dark mode

**Questions Tab:**
- [ ] Click "Generate New Quiz"
- [ ] **Verify:** Config dialog background is correct
- [ ] Generate a quiz (any settings)
- [ ] **Verify:** Question text is readable
- [ ] **Verify:** Answer choices have visible borders
- [ ] **Verify:** Selected answer highlights correctly
- [ ] Answer questions and submit
- [ ] **Verify:** Correct answers show green background (with good contrast)
- [ ] **Verify:** Incorrect answers show red background (with good contrast)
- [ ] **Verify:** Feedback text is readable

**Study Time Tab:**
- [ ] **Verify:** Progress bars are visible
- [ ] **Verify:** Achievement cards have proper background
- [ ] **Verify:** Metrics text is readable
- [ ] **Verify:** Icons are properly colored

**Materials Tab:**
- [ ] **Verify:** File list items are readable
- [ ] **Verify:** Download buttons are visible
- [ ] **Verify:** File type icons are visible
- [ ] **Verify:** Hover states work

### Secondary Modes

**Transcript Mode:**
- [ ] Switch to Transcript mode (bottom nav)
- [ ] **Verify:** Transcript text is readable
- [ ] **Verify:** Timestamp links are visible and clickable
- [ ] **Verify:** Scroll works smoothly

**Mind Map Mode:**
- [ ] Switch to Mind Map mode (bottom nav)
- [ ] **Verify:** Node backgrounds are visible
- [ ] **Verify:** Connection lines show
- [ ] **Verify:** Text labels are readable
- [ ] **Verify:** Zoom controls work

**Content Summary Mode:**
- [ ] Switch to Content Summary mode (bottom nav)
- [ ] **NOTE:** This tab has known minor issues (see QA report)
- [ ] Check readability anyway

### Error States
- [ ] Navigate to a lecture with no content
- [ ] **Verify:** Error message is readable
- [ ] **Verify:** Info box background works in dark mode
- [ ] **Verify:** "Retry" and "Back" buttons are visible
- [ ] **Verify:** Border is visible

---

## 3. ShareModal Test (5 min)

- [ ] Click the floating share button (bottom-right)
- [ ] **Verify:** Modal backdrop is semi-transparent (not fully opaque)
- [ ] **Verify:** Modal card has correct background (`bg-card`)
- [ ] **Verify:** Header blue accent circle is visible
- [ ] **Verify:** Header text is readable
- [ ] **Verify:** Friend list items are readable
- [ ] **Verify:** Friend list item borders are visible
- [ ] **Verify:** Hover state changes background subtly
- [ ] Select one or more friends
- [ ] **Verify:** Selected state (blue border) is clear
- [ ] **Verify:** Checkboxes are visible
- [ ] **Verify:** Checkbox checkmarks show when selected
- [ ] Type a message in the textarea
- [ ] **Verify:** Textarea background is correct
- [ ] **Verify:** Textarea border is visible
- [ ] **Verify:** Typed text is readable
- [ ] **Verify:** Character counter is visible
- [ ] **Verify:** "Cancel" and "Share" buttons are clear
- [ ] Click Cancel
- [ ] **Verify:** Modal closes smoothly

---

## 4. BottomNavbar Test (5 min)

### Default State (Not Scrolled)
- [ ] **Verify:** Nav pill background is semi-transparent with blur
- [ ] **Verify:** Nav pill border is subtle but visible
- [ ] **Verify:** All 5 icons are visible (Hub, Courses, Upload, Social, Search)
- [ ] **Verify:** Active icon has primary color
- [ ] **Verify:** Inactive icons are muted
- [ ] **Verify:** Icon labels are readable

### Scrolled State
- [ ] Scroll down on the lectures page
- [ ] **Verify:** Nav pill shrinks to show only Hub + Search
- [ ] **Verify:** Icons remain visible
- [ ] **Verify:** Active state still works

### Hover States
- [ ] Hover over each icon
- [ ] **Verify:** Hover background (`bg-accent/50`) is subtle
- [ ] **Verify:** Icon doesn't shift position

### Navigation
- [ ] Click Hub icon → Dashboard
- [ ] Click Courses icon → Courses page
- [ ] Click Social icon → Social page
- [ ] **Verify:** Active indicator follows navigation

---

## 5. Mobile Testing (15 min)

### Setup
```
Chrome DevTools → Toggle Device Toolbar
Device: iPhone SE (375 x 667)
```

### Viewport Test
- [ ] **Verify:** No horizontal scroll
- [ ] **Verify:** All content fits within viewport
- [ ] **Verify:** Bottom navbar doesn't overlap content
- [ ] **Verify:** Share button is accessible (not covered)

### Touch Targets
- [ ] **Verify:** All buttons are at least 44px × 44px
- [ ] **Verify:** Tab items are tappable (not too small)
- [ ] **Verify:** Bottom nav icons are easy to tap
- [ ] **Verify:** Modal close button (X) is tappable

### StudentDesk Mobile
- [ ] Open a lecture
- [ ] **Verify:** Header doesn't feel cramped
- [ ] **Verify:** Lecture title doesn't overflow
- [ ] **Verify:** Tab strip is horizontally scrollable if needed
- [ ] Swipe left/right on content
- [ ] **Verify:** Swipe navigation works between tabs
- [ ] **Verify:** Swipe doesn't interfere with scrolling

### ShareModal Mobile
- [ ] Open share modal
- [ ] **Verify:** Modal fits screen (doesn't overflow)
- [ ] **Verify:** Friend list is scrollable
- [ ] **Verify:** Keyboard doesn't hide "Share" button when typing

### Landscape Mode (Optional)
- [ ] Rotate to landscape
- [ ] **Verify:** Layout still works
- [ ] **Verify:** Bottom nav remains visible

---

## 6. Accessibility Testing (10 min)

### Contrast Ratios
```
Use DevTools > Lighthouse > Accessibility
OR: https://webaim.org/resources/contrastchecker/
```

**Required Ratios (WCAG AA):**
- Normal text (16px): 4.5:1
- Large text (18px+): 3:1
- UI components: 3:1

**Areas to Check:**
- [ ] Body text vs background (should be ≥4.5:1)
- [ ] Muted text vs background (should be ≥4.5:1)
- [ ] Button text vs button background (should be ≥4.5:1)
- [ ] Border vs background (should be ≥3:1)
- [ ] Info box text vs info box background (should be ≥4.5:1)

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] **Verify:** Focus indicators are visible
- [ ] **Verify:** Tab order is logical
- [ ] Press Escape on modal
- [ ] **Verify:** Modal closes

### Screen Reader (Optional)
- [ ] Turn on VoiceOver (Mac) or NVDA (Windows)
- [ ] Navigate through StudentDesk
- [ ] **Verify:** All headings are announced
- [ ] **Verify:** Buttons have clear labels

---

## 7. Cross-Browser Testing (15 min)

### Chrome (Primary)
- [ ] Test all above on Chrome
- [ ] **Verify:** Backdrop blur works
- [ ] **Verify:** CSS variables render correctly

### Safari (iOS Primary)
- [ ] Test on Safari Desktop
- [ ] **Verify:** Dark mode works
- [ ] **Verify:** Backdrop blur works (Safari 15+)
- [ ] **Verify:** Theme color shows in iOS address bar
- [ ] Test on iPhone Safari (if possible)
- [ ] **Verify:** Mobile experience is smooth

### Firefox
- [ ] Test on Firefox Desktop
- [ ] **Verify:** Dark mode works
- [ ] **Verify:** No layout shifts
- [ ] **Verify:** Border visibility

### Edge (Optional)
- [ ] Test on Edge Desktop
- [ ] **Verify:** Dark mode works

---

## 8. Regression Testing (10 min)

**Verify existing features still work:**

### Audio Player
- [ ] Open a lecture with audio
- [ ] **Verify:** Player controls are visible
- [ ] **Verify:** Play/pause works
- [ ] **Verify:** Timeline scrubbing works

### AI Tutor
- [ ] Select text in any tab
- [ ] Right-click → "Explain with AI Tutor"
- [ ] **Verify:** Tutor sheet opens
- [ ] **Verify:** Explanation is readable
- [ ] **Verify:** Sheet background is correct

### Swipe Gestures
- [ ] On mobile viewport, swipe between tabs
- [ ] **Verify:** Swipe navigation works
- [ ] **Verify:** No accidental tab switches during scroll

### Share Feature
- [ ] Share a lecture with a friend
- [ ] **Verify:** Success toast appears
- [ ] **Verify:** Toast is readable in dark mode

---

## Issues Tracker

### Critical Issues (Block Deployment)
_None found during code audit._

### Minor Issues (Fix Later)
- [ ] QuestionsTab line 568: `border-gray-300` on number input
- [ ] QuestionsTab lines 634-670: Gray error messages (rare edge case)
- [ ] ContentSummaryTab lines 113-160: Multiple gray colors (secondary tab)

### Browser-Specific Issues
_Record any browser-specific issues here._

---

## Final Checklist

### Before Production:
- [ ] All critical flows tested (Desktop)
- [ ] Mobile testing complete (375px viewport)
- [ ] Accessibility audit passed (contrast ratios)
- [ ] Safari iOS tested (if available)
- [ ] Cross-browser testing complete
- [ ] No critical issues found
- [ ] User acceptance sign-off received

### Sign-Off
- [ ] **Developer:** Dark mode implementation complete
- [ ] **QA Engineer:** Testing complete, approved for production
- [ ] **Product Manager:** UAT complete, approved for launch
- [ ] **Designer:** Visual review complete, design approved

---

## Notes Section

**Issues Found:**
_Document any issues discovered during testing._

**Follow-Up Actions:**
_List any follow-up tasks or improvements._

---

**Testing Completed By:** _______________
**Date:** _______________
**Time Spent:** ___ minutes
**Result:** ☐ PASS ☐ FAIL (with notes)
