# Dark Mode Fix Examples - Copy-Paste Ready Code

**Exact before/after code for the 5 critical components**
**Developers: Copy these patterns to fix dark mode**

---

## 1. StudentDesk.tsx - CRITICAL

### Fix 1: Main Container (Line 629)

**BEFORE:**
```tsx
<div className="student-desk-page flex flex-col bg-white h-screen w-full max-w-full overflow-hidden">
```

**AFTER:**
```tsx
<div className="student-desk-page flex flex-col bg-background h-screen w-full max-w-full overflow-hidden">
```

---

### Fix 2: Header (Line 631)

**BEFORE:**
```tsx
<header className="sticky top-0 z-40 bg-white border-b border-gray-light w-full overflow-hidden shrink-0">
```

**AFTER:**
```tsx
<header className="sticky top-0 z-40 bg-background border-b border-border w-full overflow-hidden shrink-0">
```

---

### Fix 3: Title (Line 645)

**BEFORE:**
```tsx
<h1 className="text-lg font-semibold truncate text-black">
  {lectureData.metadata.title}
</h1>
```

**AFTER:**
```tsx
<h1 className="text-lg font-semibold truncate text-foreground">
  {lectureData.metadata.title}
</h1>
```

---

### Fix 4: Metadata Text (Line 648)

**BEFORE:**
```tsx
<div className="flex items-center gap-2 text-xs text-gray-medium">
```

**AFTER:**
```tsx
<div className="flex items-center gap-2 text-xs text-muted-foreground">
```

---

### Fix 5: Tab Border (Line 669)

**BEFORE:**
```tsx
className="w-full border-b border-gray-light transition-all..."
```

**AFTER:**
```tsx
className="w-full border-b border-border transition-all..."
```

---

### Fix 6: Loading Spinner (Lines 554-556)

**BEFORE:**
```tsx
<div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin mx-auto mb-4"></div>
<p className="text-gray-dark">Loading lecture content...</p>
<p className="text-sm text-gray-medium mt-1">Job ID: {jobId}</p>
```

**AFTER:**
```tsx
<div className="w-8 h-8 border-2 border-foreground border-t-transparent animate-spin mx-auto mb-4"></div>
<p className="text-foreground">Loading lecture content...</p>
<p className="text-sm text-muted-foreground mt-1">Job ID: {jobId}</p>
```

---

### Fix 7: Error State (Lines 566-572)

**BEFORE:**
```tsx
<div className="text-gray-dark mb-4">
  <Settings className="w-12 h-12 mx-auto mb-3" />
  <p className="text-lg font-semibold">
    {error?.includes('no content') ? 'No Content Available' : 'Failed to Load Lecture'}
  </p>
</div>
<p className="text-gray-medium mb-4 text-sm">{error || 'Unable to load lecture data'}</p>
```

**AFTER:**
```tsx
<div className="text-foreground mb-4">
  <Settings className="w-12 h-12 mx-auto mb-3" />
  <p className="text-lg font-semibold">
    {error?.includes('no content') ? 'No Content Available' : 'Failed to Load Lecture'}
  </p>
</div>
<p className="text-muted-foreground mb-4 text-sm">{error || 'Unable to load lecture data'}</p>
```

---

## 2. ShareModal.tsx - CRITICAL

### Fix 1: Modal Container (Line 154)

**BEFORE:**
```tsx
<div
  className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
  onClick={(e) => e.stopPropagation()}
>
```

**AFTER:**
```tsx
<div
  className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
  onClick={(e) => e.stopPropagation()}
>
```

---

### Fix 2: Header Border (Line 158)

**BEFORE:**
```tsx
<div className="flex items-center justify-between p-6 border-b border-gray-200">
```

**AFTER:**
```tsx
<div className="flex items-center justify-between p-6 border-b border-border">
```

---

### Fix 3: Icon Background (Line 160)

**BEFORE:**
```tsx
<div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
  <Share2 className="w-5 h-5 text-blue-600" />
</div>
```

**AFTER:**
```tsx
<div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/30 rounded-full flex items-center justify-center border border-blue-200 dark:border-blue-800">
  <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
</div>
```

---

### Fix 4: Header Text (Lines 164-165)

**BEFORE:**
```tsx
<h2 className="text-xl font-bold text-gray-900">Share Lecture</h2>
<p className="text-sm text-gray-500 truncate max-w-xs">{lectureTitle}</p>
```

**AFTER:**
```tsx
<h2 className="text-xl font-bold text-foreground">Share Lecture</h2>
<p className="text-sm text-muted-foreground truncate max-w-xs">{lectureTitle}</p>
```

---

### Fix 5: Close Button (Lines 169-171)

**BEFORE:**
```tsx
<button
  onClick={onClose}
  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
>
  <X className="w-5 h-5 text-gray-500" />
</button>
```

**AFTER:**
```tsx
<button
  onClick={onClose}
  className="p-2 hover:bg-muted rounded-full transition-colors"
>
  <X className="w-5 h-5 text-muted-foreground" />
</button>
```

---

### Fix 6: Section Label (Line 180-182)

**BEFORE:**
```tsx
<label className="text-sm font-medium text-gray-700 mb-3 block">
  Select Friends ({selectedFriends.size} selected)
</label>
```

**AFTER:**
```tsx
<label className="text-sm font-medium text-foreground mb-3 block">
  Select Friends ({selectedFriends.size} selected)
</label>
```

---

### Fix 7: Empty State (Lines 189-192)

**BEFORE:**
```tsx
<div className="text-center py-8 text-gray-500">
  <p className="font-medium">No friends yet</p>
  <p className="text-sm mt-1">Add friends to share content with them</p>
</div>
```

**AFTER:**
```tsx
<div className="text-center py-8 text-muted-foreground">
  <p className="font-medium">No friends yet</p>
  <p className="text-sm mt-1">Add friends to share content with them</p>
</div>
```

---

### Fix 8: Friend Selection Buttons (Lines 202-206)

**BEFORE:**
```tsx
<button
  key={friend.id}
  onClick={() => toggleFriend(friend.user.id)}
  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
    isSelected
      ? 'border-blue-500 bg-blue-50'
      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
  }`}
>
```

**AFTER:**
```tsx
<button
  key={friend.id}
  onClick={() => toggleFriend(friend.user.id)}
  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
    isSelected
      ? 'border-primary bg-accent'
      : 'border-border hover:border-border/70 hover:bg-muted'
  }`}
>
```

---

### Fix 9: User Info Text (Lines 217-222)

**BEFORE:**
```tsx
<div className="flex-1 text-left min-w-0">
  <p className="font-medium text-gray-900 truncate">
    {friend.user.full_name || 'Unknown'}
  </p>
  <p className="text-sm text-gray-500 truncate">
    {friend.user.email}
  </p>
</div>
```

**AFTER:**
```tsx
<div className="flex-1 text-left min-w-0">
  <p className="font-medium text-foreground truncate">
    {friend.user.full_name || 'Unknown'}
  </p>
  <p className="text-sm text-muted-foreground truncate">
    {friend.user.email}
  </p>
</div>
```

---

### Fix 10: Checkbox (Lines 227-231)

**BEFORE:**
```tsx
<div
  className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
    isSelected
      ? 'bg-blue-600 border-blue-600'
      : 'border-gray-300'
  }`}
>
```

**AFTER:**
```tsx
<div
  className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
    isSelected
      ? 'bg-primary border-primary'
      : 'border-border'
  }`}
>
```

---

### Fix 11: Textarea (Lines 247-255)

**BEFORE:**
```tsx
<textarea
  id="share-message"
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  placeholder="Add a note for your friends..."
  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
  rows={3}
  maxLength={200}
/>
```

**AFTER:**
```tsx
<textarea
  id="share-message"
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  placeholder="Add a note for your friends..."
  className="w-full p-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-foreground placeholder:text-muted-foreground"
  rows={3}
  maxLength={200}
/>
```

---

### Fix 12: Character Counter (Line 256-258)

**BEFORE:**
```tsx
<p className="text-xs text-gray-500 mt-1">
  {message.length}/200 characters
</p>
```

**AFTER:**
```tsx
<p className="text-xs text-muted-foreground mt-1">
  {message.length}/200 characters
</p>
```

---

### Fix 13: Footer Border (Line 263)

**BEFORE:**
```tsx
<div className="flex items-center justify-between p-6 border-t border-gray-200">
```

**AFTER:**
```tsx
<div className="flex items-center justify-between p-6 border-t border-border">
```

---

### Fix 14: Cancel Button (Lines 264-269)

**BEFORE:**
```tsx
<button
  onClick={onClose}
  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
  disabled={loading}
>
  Cancel
</button>
```

**AFTER:**
```tsx
<button
  onClick={onClose}
  className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
  disabled={loading}
>
  Cancel
</button>
```

---

### Fix 15: Share Button (Lines 271-286)

**BEFORE:**
```tsx
<button
  onClick={handleShare}
  disabled={loading || selectedFriends.size === 0}
  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
```

**AFTER:**
```tsx
<button
  onClick={handleShare}
  disabled={loading || selectedFriends.size === 0}
  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
```

---

## 3. BottomNavbar.tsx - CRITICAL

### Fix 1: Main Nav Container (Line 95)

**BEFORE:**
```tsx
<div className={cn("bg-white/80 backdrop-blur-xl rounded-full shadow-lg border border-gray-200/50 pointer-events-auto transition-all duration-300", !isScrolled && "flex-1")}>
```

**AFTER:**
```tsx
<div className={cn("bg-background/80 backdrop-blur-xl rounded-full shadow-lg border border-border/50 pointer-events-auto transition-all duration-300", !isScrolled && "flex-1")}>
```

---

### Fix 2: Hub Icon (Lines 107-120)

**BEFORE:**
```tsx
<div className={cn(
  "transition-colors duration-200",
  isActive(hubItem) ? "text-blue-600" : "text-gray-600"
)}>
  <Home className={cn("transition-all duration-200", isScrolled ? "w-6 h-6" : "w-5 h-5")} strokeWidth={isActive(hubItem) ? 2.5 : 1.5} />
</div>
{!isScrolled && (
  <span className={cn(
    "text-[9px] font-medium truncate mt-0.5",
    isActive(hubItem) ? "text-blue-600" : "text-gray-600"
  )}>
    Hub
  </span>
)}
```

**AFTER:**
```tsx
<div className={cn(
  "transition-colors duration-200",
  isActive(hubItem) ? "text-primary" : "text-muted-foreground"
)}>
  <Home className={cn("transition-all duration-200", isScrolled ? "w-6 h-6" : "w-5 h-5")} strokeWidth={isActive(hubItem) ? 2.5 : 1.5} />
</div>
{!isScrolled && (
  <span className={cn(
    "text-[9px] font-medium truncate mt-0.5",
    isActive(hubItem) ? "text-primary" : "text-muted-foreground"
  )}>
    Hub
  </span>
)}
```

---

### Fix 3: Middle Items (Lines 138-149)

**BEFORE:**
```tsx
<div className={cn(
  "transition-colors duration-200",
  active ? "text-blue-600" : "text-gray-600"
)}>
  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
</div>
<span className={cn(
  "text-[9px] font-medium truncate mt-0.5",
  active ? "text-blue-600" : "text-gray-600"
)}>
  {item.label}
</span>
```

**AFTER:**
```tsx
<div className={cn(
  "transition-colors duration-200",
  active ? "text-primary" : "text-muted-foreground"
)}>
  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
</div>
<span className={cn(
  "text-[9px] font-medium truncate mt-0.5",
  active ? "text-primary" : "text-muted-foreground"
)}>
  {item.label}
</span>
```

---

### Fix 4: Search Button (Lines 157-170)

**BEFORE:**
```tsx
<button
  onClick={openCommandBar}
  className={cn(
    "bg-white/80 backdrop-blur-xl rounded-full shadow-lg border border-gray-200/50 pointer-events-auto",
    "flex items-center justify-center w-14 h-14 transition-all duration-200",
    "hover:bg-gray-100/50 active:scale-95"
  )}
  aria-label="Open search"
>
  <Search
    className="w-6 h-6 text-gray-600 transition-colors duration-200"
    strokeWidth={1.5}
  />
</button>
```

**AFTER:**
```tsx
<button
  onClick={openCommandBar}
  className={cn(
    "bg-background/80 backdrop-blur-xl rounded-full shadow-lg border border-border/50 pointer-events-auto",
    "flex items-center justify-center w-14 h-14 transition-all duration-200",
    "hover:bg-muted/50 active:scale-95"
  )}
  aria-label="Open search"
>
  <Search
    className="w-6 h-6 text-muted-foreground transition-colors duration-200"
    strokeWidth={1.5}
  />
</button>
```

---

## 4. OverviewTab.tsx - Example Pattern

**This same pattern applies to ALL 9 tab components.**

### Find & Replace Pattern

**Step 1: Text Colors**
```tsx
// Find all instances and replace:
"text-gray-900"  →  "text-foreground"
"text-gray-800"  →  "text-foreground"
"text-gray-700"  →  "text-foreground"
"text-gray-600"  →  "text-muted-foreground"
"text-gray-500"  →  "text-muted-foreground"
"text-gray-400"  →  "text-muted-foreground/70"
```

**Step 2: Borders**
```tsx
"border-gray-200"  →  "border-border"
"border-gray-300"  →  "border-border"
```

**Step 3: Backgrounds**
```tsx
"bg-gray-50"         →  "bg-muted"
"hover:bg-gray-50"   →  "hover:bg-muted"
"hover:bg-gray-100"  →  "hover:bg-accent"
```

**Example Before:**
```tsx
<div className="space-y-4">
  <h2 className="text-2xl font-semibold text-gray-900">Overview</h2>
  <p className="text-gray-600 leading-relaxed">
    {overview.mainTopic}
  </p>
  <div className="border-t border-gray-200 pt-4">
    <h3 className="text-xl font-semibold text-gray-900 mb-3">Key Objectives</h3>
    {overview.keyObjectives.map((obj, i) => (
      <div key={i} className="flex items-start gap-3 text-gray-700">
        <BookOpen className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
        <span>{obj}</span>
      </div>
    ))}
  </div>
</div>
```

**Example After:**
```tsx
<div className="space-y-4">
  <h2 className="text-2xl font-semibold text-foreground">Overview</h2>
  <p className="text-muted-foreground leading-relaxed">
    {overview.mainTopic}
  </p>
  <div className="border-t border-border pt-4">
    <h3 className="text-xl font-semibold text-foreground mb-3">Key Objectives</h3>
    {overview.keyObjectives.map((obj, i) => (
      <div key={i} className="flex items-start gap-3 text-foreground">
        <BookOpen className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <span>{obj}</span>
      </div>
    ))}
  </div>
</div>
```

---

## 5. layout.tsx - Meta Tags

### Fix: Color Scheme Meta (Lines 41-42)

**BEFORE:**
```tsx
<meta name="color-scheme" content="light" />
<meta name="theme-color" content="#ffffff" />
```

**AFTER (Static approach - quickest fix):**
```tsx
<meta name="color-scheme" content="light dark" />
<meta name="theme-color" content="#FAFAFA" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#1C1C1E" media="(prefers-color-scheme: dark)" />
```

**OR (Dynamic approach - better UX):**
```tsx
// Use ThemeProvider context to set theme-color dynamically
// This requires a client component wrapper
```

---

## Verification Steps

After applying fixes to each component:

1. **Start dev server:** `npm run dev`
2. **Open component in browser**
3. **Toggle dark mode** (theme toggle in UI)
4. **Check for white backgrounds** - should see dark backgrounds
5. **Check for black text** - should see light text
6. **Verify borders are visible** - should be subtle but present
7. **Test hover states** - should be subtle highlights
8. **Check contrast** - all text should be easily readable

---

## Common Mistakes to Avoid

❌ **Mixing hardcoded and semantic tokens:**
```tsx
<div className="bg-white text-foreground">  // Inconsistent
```

✅ **Use semantic tokens consistently:**
```tsx
<div className="bg-background text-foreground">  // Consistent
```

---

❌ **Forgetting dark: variants for status colors:**
```tsx
<div className="bg-green-50 text-green-700">  // Only light mode
```

✅ **Always add dark: variants:**
```tsx
<div className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300">
```

---

❌ **Using pure black/white:**
```tsx
<div className="bg-black text-white">  // Too harsh
```

✅ **Use semantic tokens for softer contrast:**
```tsx
<div className="bg-background text-foreground">  // Easier on eyes
```

---

## IDE Tips

### VSCode: Find & Replace (Multiple Files)

1. Press `Cmd+Shift+F` (Mac) or `Ctrl+Shift+F` (Windows)
2. Enable "Use Regular Expression" (.\* icon)
3. Enter pattern from this guide
4. Click "Replace All"

### Example Regex for Multiple Replacements

**Find all text-gray-\* in className:**
```regex
className="([^"]*?)text-gray-(900|800|700)([^"]*?)"
```

**Replace with:**
```
className="$1text-foreground$3"
```

---

## Success Criteria

You've successfully fixed dark mode when:

✅ No white backgrounds appear in dark mode (except intentional cards)
✅ All text is readable in both light and dark mode
✅ Borders are visible but subtle in both modes
✅ Hover states work in both modes
✅ Status colors (success/error/warning) display correctly in both modes
✅ No console errors related to theming
✅ Theme toggle works instantly without flicker
✅ Contrast ratios pass WCAG AA (4.5:1 minimum)

---

## Questions?

Refer to:
- Main design system: `DARK-MODE-DESIGN-SYSTEM.md`
- Color reference: `DARK-MODE-COLOR-REFERENCE.md`
- Original audit: `DARK-MODE-AUDIT.md`
