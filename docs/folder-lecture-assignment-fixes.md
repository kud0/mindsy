# Folder-Lecture Assignment Fixes

## Issues Fixed

### Issue 1: Folder Count Not Updating After Adding Lectures
**Problem:** When adding a lecture to a folder from the folder detail page, the count showed "0 lectures" even after successfully adding lectures.

**Root Cause:** The folder detail page wasn't being notified when lectures were assigned to folders from other parts of the application (like the lectures list page).

**Solution:**
1. Added a custom browser event `folderLecturesChanged` that fires when a lecture is assigned to or removed from a folder
2. Updated `FolderSelector.tsx` to dispatch this event after successful folder assignment
3. Updated the folder detail page to listen for this event and reload data when it affects the current folder

**Files Changed:**
- `/components/lectures/FolderSelector.tsx` - Added event dispatch after successful assignment
- `/app/dashboard/courses/[courseId]/folders/[folderId]/page.tsx` - Added event listener to reload data

### Issue 2: Folder Selector Not Visible in Lectures List
**Problem:** The FolderSelector component was not visible in the lectures list view (both grid and row/list views).

**Root Cause:**
- In **grid view**: FolderSelector was present but `setAllLectures` was not properly accessible
- In **row/list view**: FolderSelector was completely missing from the component

**Solution:**
1. Added `onFolderUpdate` prop to both `LectureCard` and `LectureRowCard` components
2. Updated the grid view card to use the callback instead of trying to access `setAllLectures` directly
3. Added FolderSelector to the row/list view in a new 7th column for desktop
4. Added FolderSelector below the lecture info for mobile view
5. Updated column headers to include "Folder" column
6. Changed grid layout from 6 columns to 7 columns: `[40px_1fr_100px_60px_100px_60px_120px]`

**Files Changed:**
- `/components/lectures/StudiesWithLectures.tsx`
  - Added `onFolderUpdate` prop to `LectureCardProps` interface
  - Updated both card components to receive and use the callback
  - Added FolderSelector to row view (desktop and mobile)
  - Updated column headers and grid layout
  - Passed `onFolderUpdate` callback when rendering cards

## Column Layout (Desktop Row View)

| Column | Width | Content |
|--------|-------|---------|
| 1 | 40px | Status Icon |
| 2 | 1fr (flexible) | Lecture Title & Subject |
| 3 | 100px | Date |
| 4 | 60px | Files Icon |
| 5 | 100px | Study Time |
| 6 | 60px | Review Status |
| 7 | 120px | **Folder Selector** (NEW) |

## Mobile Layout

On mobile (< 768px):
- Uses a stacked two-line layout
- FolderSelector appears below the lecture info
- Indented with `ml-7` to align with content

## Testing Checklist

- [ ] Grid view shows FolderSelector in each card
- [ ] Row/list view shows FolderSelector in 7th column (desktop)
- [ ] Row/list view shows FolderSelector below content (mobile)
- [ ] Clicking folder selector in lectures list updates the lecture's folder assignment
- [ ] Folder detail page count updates immediately when lectures are added/removed
- [ ] Folder selector dropdown shows correct hierarchy
- [ ] Folder selector shows current folder (if assigned)
- [ ] "Remove from folder" option works correctly
- [ ] State updates properly in the lectures list after assignment

## Implementation Details

### Event-Based Communication
The fix uses browser custom events to communicate between components:

```typescript
// FolderSelector.tsx - Dispatch event
window.dispatchEvent(new CustomEvent('folderLecturesChanged', {
  detail: { folderId, lectureId }
}));

// Folder detail page - Listen for event
window.addEventListener('folderLecturesChanged', handleFolderLecturesChanged);
```

This approach allows loose coupling between components while ensuring data stays in sync.

### Callback Pattern
The folder update uses a callback pattern to maintain proper React state management:

```typescript
// Parent component
onFolderUpdate={(lectureId, folderId) => {
  setAllLectures(prev => prev.map(l =>
    l.job_id === lectureId
      ? { ...l, user_folder_id: folderId }
      : l
  ));
}}

// Child component
onFolderUpdate?.(lecture.job_id, folderId);
```

This ensures state updates flow correctly from child to parent component.
