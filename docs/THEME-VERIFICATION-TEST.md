# Theme System Verification Test

## Quick Test (5 minutes)

### Prerequisites
```bash
npm run dev
# Open http://localhost:3003 (or whichever port Next.js starts on)
```

### Test 1: Theme Persistence ✅
1. Go to Settings → Appearance tab
2. Click on **Dark** theme
   - ✅ Page should immediately switch to dark mode
   - ✅ Checkmark should appear on Dark card
3. **Refresh the page (F5 or Cmd+R)**
   - ✅ Page should load in dark mode
   - ✅ Dark theme should still be selected in settings
4. Click on **Light** theme
   - ✅ Page should immediately switch to light mode
5. **Refresh again**
   - ✅ Page should load in light mode

**Expected:** Theme persists across page reloads
**localStorage key:** `mindsy-ui-theme`

### Test 2: System Mode Detection ✅
1. Go to Settings → Appearance
2. Click on **System** theme
   - ✅ Page theme should match your macOS setting
3. Open macOS System Settings → Appearance
4. Switch macOS between Light/Dark
   - ✅ App should auto-switch without refresh
   - ✅ System option should stay selected
5. **Refresh the page**
   - ✅ System theme should still be selected
   - ✅ Theme should still match macOS

**Expected:** App follows system preference in real-time

### Test 3: AppearanceTab UI ✅
1. Go to Settings → Appearance
2. Verify visual states:
   - ✅ Three cards visible: Light, Dark, System
   - ✅ Selected card has purple border
   - ✅ Selected card has checkmark in top-right
   - ✅ Preview section shows sample UI
3. Click each theme option:
   - ✅ Toast notification appears
   - ✅ Visual selection changes immediately
   - ✅ Preview section updates

### Test 4: ThemeToggle Component ✅
1. Find the theme toggle switch (if visible in UI)
2. Test toggle:
   - ✅ In light mode: shows sun icon, gray background
   - ✅ In dark mode: shows moon icon, purple background
   - ✅ Click toggles between light/dark
   - ✅ Animation is smooth

**Note:** Toggle only switches light/dark, not system mode

### Test 5: Console Check ✅
1. Open DevTools Console (F12)
2. Check for errors:
   - ✅ No hydration warnings
   - ✅ No localStorage errors
   - ✅ No theme-related errors
3. Check localStorage:
   ```js
   localStorage.getItem('mindsy-ui-theme')
   // Should return: "light", "dark", or "system"
   ```

### Test 6: Cross-Tab Sync ✅
1. Open app in two browser tabs
2. In Tab 1: Change theme to Dark
3. In Tab 2:
   - ✅ Should auto-update to dark mode
   - ✅ No refresh needed

**Expected:** Theme syncs across tabs

## Manual localStorage Test

Open browser console and run:

```js
// Test 1: Check current theme
localStorage.getItem('mindsy-ui-theme')
// Should return: "light", "dark", or "system"

// Test 2: Manually set to dark
localStorage.setItem('mindsy-ui-theme', 'dark')
location.reload()
// Page should load in dark mode

// Test 3: Manually set to system
localStorage.setItem('mindsy-ui-theme', 'system')
location.reload()
// Page should match macOS preference

// Test 4: Clear (should default to system)
localStorage.removeItem('mindsy-ui-theme')
location.reload()
// Should default to system mode
```

## Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| Select Light | Switches to light, persists on reload |
| Select Dark | Switches to dark, persists on reload |
| Select System | Follows macOS, persists on reload |
| Change macOS theme | App auto-updates (if system mode) |
| Reload page | Theme remains as set |
| Open new tab | Same theme applies |
| Clear localStorage | Defaults to system mode |

## Known Issues to Report

If any of these occur, report them:

- [ ] Theme doesn't persist on reload
- [ ] System mode doesn't follow macOS
- [ ] Hydration warnings in console
- [ ] Flash of wrong theme (FOUC)
- [ ] Theme doesn't sync across tabs
- [ ] Settings page shows wrong selected theme

## Success Criteria

All tests should pass:
- ✅ Theme persists across reloads
- ✅ System mode follows macOS preference
- ✅ No console errors
- ✅ UI correctly shows selected theme
- ✅ Smooth transitions without flashing

---

**Test Duration:** ~5 minutes
**Status:** Ready for testing
**Date:** 2025-10-21
