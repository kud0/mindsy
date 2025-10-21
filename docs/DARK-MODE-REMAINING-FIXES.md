# Dark Mode - Remaining Fixes (Optional)

**Priority:** LOW (Non-blocking)
**Estimated Time:** 30 minutes total
**Impact:** Edge cases and secondary features

---

## Issue 1: QuestionsTab Number Input Border

**File:** `components/student-desk-v2/tabs/QuestionsTab.tsx`
**Line:** 568
**Current:**
```tsx
className={`
  px-4 py-2 border rounded-lg
  ${isSubmitted
    ? isCorrect
      ? 'bg-green-50 border-green-500 text-green-900'
      : 'bg-red-50 border-red-500 text-red-900'
    : 'border-gray-300'  // ❌ Hardcoded
  }
`}
```

**Fix:**
```tsx
className={`
  px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary
  ${isSubmitted
    ? isCorrect
      ? 'bg-green-50 dark:bg-green-950/30 border-green-500 text-green-900 dark:text-green-100'
      : 'bg-red-50 dark:bg-red-950/30 border-red-500 text-red-900 dark:text-red-100'
    : 'border-border'  // ✅ Semantic token
  }
`}
```

**Impact:** Number input border in default state (before submission)
**Effort:** 2 minutes

---

## Issue 2: QuestionsTab Error Messages

**File:** `components/student-desk-v2/tabs/QuestionsTab.tsx`
**Lines:** 634-635, 646-647, 658-659, 669-670

**Current:**
```tsx
<div className="p-4 border border-gray-200 rounded-lg">
  <p className="text-gray-500 text-sm">
    Error: Multiple choice question missing required fields
  </p>
</div>
```

**Fix:**
```tsx
<div className="p-4 border border-destructive bg-destructive/10 rounded-lg">
  <p className="text-destructive text-sm">
    Error: Multiple choice question missing required fields
  </p>
</div>
```

**Impact:** Developer-facing error messages (malformed quiz data)
**Effort:** 5 minutes (4 instances)

---

## Issue 3: QuestionsTab Lecture Quote

**File:** `components/student-desk-v2/tabs/QuestionsTab.tsx`
**Line:** 919

**Current:**
```tsx
<p className="text-gray-700 italic leading-relaxed">
  "{currentQuestion.sourceContext}"
</p>
```

**Fix:**
```tsx
<p className="text-foreground/80 italic leading-relaxed">
  "{currentQuestion.sourceContext}"
</p>
```

**Impact:** Quote text in submitted quiz (shown after answering)
**Effort:** 1 minute

---

## Issue 4: ContentSummaryTab - Full Conversion

**File:** `components/student-desk-v2/tabs/ContentSummaryTab.tsx`
**Lines:** 113, 120, 133, 138, 142, 144, 154, 158

**Current:**
```tsx
// Line 113
<h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">

// Line 120
<li className="flex items-start gap-2 text-gray-700">

// Line 133
<h2 className="text-lg font-semibold text-gray-900">

// Line 138
className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"

// Line 142
className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300"

// Line 144
<span className="text-gray-700 flex-1">{item}</span>

// Line 154
<h2 className="text-lg font-semibold text-gray-900">

// Line 158
<li className="flex items-start gap-3 text-gray-700">
```

**Fix:**
```tsx
// Line 113
<h2 className="text-lg font-semibold text-foreground flex items-center gap-2">

// Line 120
<li className="flex items-start gap-2 text-foreground">

// Line 133
<h2 className="text-lg font-semibold text-foreground">

// Line 138
className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border hover:bg-muted"

// Line 142
className="mt-1 w-4 h-4 text-primary rounded border-border"

// Line 144
<span className="text-foreground flex-1">{item}</span>

// Line 154
<h2 className="text-lg font-semibold text-foreground">

// Line 158
<li className="flex items-start gap-3 text-foreground">
```

**Impact:** Content Summary tab (secondary feature, rarely used)
**Effort:** 10 minutes

---

## Issue 5: MindMapTab Node Color

**File:** `components/student-desk-v2/tabs/MindMapTab.tsx`
**Line:** 50

**Current:**
```tsx
const nodeColor = node.color || (level === 0 ? 'bg-blue-500' : level === 1 ? 'bg-purple-500' : 'bg-gray-500');
```

**Fix:**
```tsx
const nodeColor = node.color || (level === 0 ? 'bg-blue-500' : level === 1 ? 'bg-purple-500' : 'bg-muted-foreground');
```

**Impact:** Mind map node colors (default fallback for level 2+ nodes)
**Effort:** 1 minute

---

## Quick Fix Script

Run these commands to fix all issues at once:

```bash
# Navigate to project root
cd /Users/alexsolecarretero/Public/projects/mindsy

# Backup files
cp components/student-desk-v2/tabs/QuestionsTab.tsx components/student-desk-v2/tabs/QuestionsTab.tsx.backup
cp components/student-desk-v2/tabs/ContentSummaryTab.tsx components/student-desk-v2/tabs/ContentSummaryTab.tsx.backup
cp components/student-desk-v2/tabs/MindMapTab.tsx components/student-desk-v2/tabs/MindMapTab.tsx.backup

# Apply fixes (use your preferred editor)
# See specific changes above
```

---

## Testing After Fixes

### Quick Test (5 minutes)

1. **QuestionsTab:**
   - [ ] Generate a quiz
   - [ ] Check number input border in light/dark
   - [ ] Submit quiz
   - [ ] Verify lecture quote is readable

2. **ContentSummaryTab:**
   - [ ] Switch to Content Summary mode
   - [ ] Check all headings in light/dark
   - [ ] Check action items checkboxes
   - [ ] Verify text contrast

3. **MindMapTab:**
   - [ ] Switch to Mind Map mode
   - [ ] Check node colors in light/dark
   - [ ] Verify text is readable

### Regression Test (5 minutes)

- [ ] Verify all other tabs still work
- [ ] No layout shifts introduced
- [ ] Build passes (`npm run build`)

---

## Decision Matrix

### Fix Now If:
- ✅ You have 30 minutes before deployment
- ✅ You want 100% semantic token coverage
- ✅ ContentSummaryTab is used by your users

### Fix Later If:
- ✅ You're deploying immediately
- ✅ Edge cases are low priority
- ✅ Users rarely use affected features

---

## Post-Deployment Plan

**Week 1:**
- Monitor user feedback
- Track dark mode adoption
- Check for contrast complaints

**Week 2:**
- Apply remaining fixes during maintenance window
- Update design system documentation
- Add dark mode to style guide

**Week 3:**
- Run full accessibility audit
- A/B test dark mode engagement
- Celebrate successful launch 🎉

---

## Commit Message Template

```
fix(dark-mode): polish remaining edge cases

- Update QuestionsTab number input border to use semantic token
- Fix error message colors in QuestionsTab (developer-facing)
- Convert ContentSummaryTab to full semantic tokens
- Fix MindMapTab node color fallback

Impact: Edge cases and secondary features
Testing: Manual visual testing in light/dark modes
```

---

**Last Updated:** 2025-10-21
**Effort Estimate:** 30 minutes
**Priority:** P3 (Low)
