# Glassmorphism Quick Reference Card

**For Developers - Copy/Paste Glassmorphism Patterns**

---

## 🎯 STANDARD PATTERNS

### Full Modal with Glassmorphism

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent
    className={cn(
      "w-[95vw] max-w-2xl h-[85vh] overflow-hidden p-0 flex flex-col",
      "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl",
      "border border-gray-200/50 dark:border-gray-700/50",
      "shadow-xl"
    )}
  >
    {/* Header */}
    <DialogHeader className="border-b border-gray-200/50 dark:border-gray-700/50 p-4 flex-shrink-0 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
      <DialogTitle>Modal Title</DialogTitle>
    </DialogHeader>

    {/* Content */}
    <div className="flex-1 overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col p-4">
        {/* Tab List */}
        <TabsList className="grid w-full grid-cols-3 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 p-0.5 rounded-lg flex-shrink-0 mb-3">
          <TabsTrigger
            value="tab1"
            className="data-[state=active]:bg-white/95 dark:data-[state=active]:bg-gray-900/95 data-[state=active]:backdrop-blur-xl data-[state=active]:shadow-sm rounded-md transition-all"
          >
            Tab 1
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="tab1" className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Glass card */}
          <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl p-4">
            Card content
          </div>
        </TabsContent>
      </Tabs>
    </div>

    {/* Footer */}
    <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-4 flex-shrink-0 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
      <Button>Action</Button>
    </div>
  </DialogContent>
</Dialog>
```

---

## 📦 COMPONENT PARTS

### 1. Main Modal Container

```tsx
className={cn(
  "w-[95vw] max-w-2xl h-[85vh] overflow-hidden p-0 flex flex-col",
  "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl",
  "border border-gray-200/50 dark:border-gray-700/50",
  "shadow-xl"
)}
```

**Use for:** Full-screen modals, dialogs

---

### 2. Header/Footer Section

```tsx
className="border-b border-gray-200/50 dark:border-gray-700/50 p-4 flex-shrink-0 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm"
```

**Use for:** Modal headers, footers

---

### 3. Tab Navigation

```tsx
className="grid w-full grid-cols-3 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 p-0.5 rounded-lg"
```

**Use for:** Tab lists, segmented controls

---

### 4. Active Tab

```tsx
className="data-[state=active]:bg-white/95 dark:data-[state=active]:bg-gray-900/95 data-[state=active]:backdrop-blur-xl data-[state=active]:shadow-sm rounded-md transition-all"
```

**Use for:** Active tab state

---

### 5. Glass Card/List Item

```tsx
className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl p-4"
```

**Use for:** Cards, list items inside modals

---

### 6. Bottom Navigation Bar

```tsx
className="bg-background/80 dark:bg-background/90 backdrop-blur-xl border border-border/50"
```

**Use for:** Bottom navbar, top navbar

---

### 7. Accent Elements (Colored Glass)

```tsx
// Blue glass
className="bg-blue-100 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"

// Purple glass
className="bg-purple-100 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800"

// Green glass
className="bg-green-100 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
```

**Use for:** Icon containers, accent badges

---

## 🎨 COLOR REFERENCE

### Opacity Levels

| Usage | Light Mode | Dark Mode | Reason |
|-------|-----------|-----------|--------|
| **Main Content** | `95%` | `95%` | Readability |
| **Navigation** | `80%` | `90%` | More opaque in dark |
| **Header/Footer** | `80%` | `80%` | Layering |
| **Cards** | `5%` | `5%` | Subtle accent |

### Border Opacity

**Always use 50% opacity:**
```tsx
border-gray-200/50  // Light mode
border-gray-700/50  // Dark mode
```

### Blur Strength

```tsx
backdrop-blur-xl  // 24px - Main modals
backdrop-blur-sm  // 4px  - Headers/footers
```

---

## ❌ COMMON MISTAKES

### DON'T: Use solid backgrounds

```tsx
// ❌ BAD
className="bg-white dark:bg-gray-900"
```

### DO: Use semi-transparent backgrounds

```tsx
// ✅ GOOD
className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl"
```

---

### DON'T: Forget backdrop blur

```tsx
// ❌ BAD
className="bg-white/95 dark:bg-gray-900/95"
```

### DO: Always include backdrop-blur

```tsx
// ✅ GOOD
className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl"
```

---

### DON'T: Use full opacity borders

```tsx
// ❌ BAD
className="border border-gray-200 dark:border-gray-700"
```

### DO: Use 50% opacity borders

```tsx
// ✅ GOOD
className="border border-gray-200/50 dark:border-gray-700/50"
```

---

### DON'T: Mix hardcoded colors

```tsx
// ❌ BAD
className="bg-gray-50 text-black"
```

### DO: Use semantic tokens

```tsx
// ✅ GOOD
className="bg-muted text-foreground"
```

---

## 🧪 TESTING CHECKLIST

After implementing glassmorphism, verify:

- [ ] Background is semi-transparent (95% opacity)
- [ ] Backdrop blur is visible (content behind is blurred)
- [ ] Border is subtle but visible (50% opacity)
- [ ] Component appears to "float" above background
- [ ] Dark mode uses same pattern with adjusted colors
- [ ] Text is readable on glass surface
- [ ] Animations maintain glass effect
- [ ] Mobile responsive (w-[95vw], max-w-2xl)

---

## 📱 MOBILE CONSIDERATIONS

### Always include:

```tsx
className="w-[95vw] max-w-2xl"  // Responsive width
className="h-[85vh]"            // Leaves space for keyboard
className="overflow-y-auto"     // Scrollable content
```

### Touch targets:

```tsx
className="min-h-[44px] min-w-[44px]"  // Minimum 44px
```

---

## 🎯 QUICK COPY/PASTE

### Glass Modal

```tsx
"w-[95vw] max-w-2xl h-[85vh] overflow-hidden p-0 flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl"
```

### Glass Header

```tsx
"border-b border-gray-200/50 dark:border-gray-700/50 p-4 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm"
```

### Glass Tab List

```tsx
"bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
```

### Glass Card

```tsx
"rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl"
```

### Glass Navbar

```tsx
"bg-background/80 dark:bg-background/90 backdrop-blur-xl border border-border/50"
```

---

## 🔧 DEBUGGING

### Check if glassmorphism is working:

```javascript
// Open browser DevTools
// Inspect element
// Computed tab → Look for:
backdrop-filter: blur(24px);
background: rgba(17, 24, 39, 0.95);
border: rgba(55, 65, 81, 0.5);
```

### Browser support check:

```javascript
if (CSS.supports('backdrop-filter', 'blur(10px)')) {
  console.log('✅ Glassmorphism supported');
} else {
  console.log('⚠️ Fallback to solid background');
}
```

---

## 📚 REFERENCES

- **Full Testing Guide:** `docs/GLASSMORPHISM-DARK-MODE-TEST-CHECKLIST.md`
- **Visual Guide:** `docs/GLASSMORPHISM-VISUAL-TEST-GUIDE.md`
- **QA Report:** `docs/QA-GLASSMORPHISM-DARK-MODE-REPORT.md`

---

**Last Updated:** 2025-10-21
**Version:** 1.0
