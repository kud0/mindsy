# Folder Display Changes - Lectures Page

## Summary
Removed the interactive FolderSelector dropdown from the lectures page and replaced it with a simple read-only folder display badge. This eliminates 403 errors and simplifies the UX by making folder assignment only available from the course page.

## Changes Made

### 1. Created FolderBadge Component
**File:** `/components/lectures/StudiesWithLectures.tsx`

Added a simple read-only badge component to display folder assignment:
```typescript
const FolderBadge = ({ folderName }: { folderName: string | null }) => {
  if (!folderName) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground border border-border/50">
      <Folder className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate max-w-[100px] md:max-w-[150px]">
        {folderName}
      </span>
    </div>
  );
};
```

**Features:**
- Shows folder icon and name
- Responsive truncation (100px mobile, 150px desktop)
- Only displays when lecture is assigned to a folder
- Styled with muted colors for visual hierarchy
- No click interaction (read-only)

### 2. Removed FolderSelector Import
**File:** `/components/lectures/StudiesWithLectures.tsx`

**Removed:**
```typescript
import FolderSelector from '@/components/lectures/FolderSelector';
```

### 3. Updated Database Query
**File:** `/components/lectures/StudiesWithLectures.tsx`

**Added folder join to fetch folder information:**
```typescript
const { data: lectures, error: lecturesError } = await supabase
  .from('jobs')
  .select(`
    job_id,
    lecture_title,
    course_subject,
    created_at,
    status,
    user_folder_id,
    user_folders (
      id,
      folder_name
    )
  `)
  .eq('user_id', user.id)
  .in('status', ['processing', 'completed', 'failed'])
  .order('created_at', { ascending: false });
```

### 4. Updated Grid View (LectureCard)
**File:** `/components/lectures/StudiesWithLectures.tsx`

**Before:**
```typescript
<div className="mt-auto pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
  <FolderSelector
    lectureId={lecture.job_id}
    currentFolderId={lecture.user_folder_id}
    onFolderChange={(folderId) => {
      onFolderUpdate?.(lecture.job_id, folderId);
    }}
  />
</div>
```

**After:**
```typescript
<div className="mt-auto pt-2 border-t border-border">
  <FolderBadge folderName={lecture.user_folders?.folder_name || null} />
</div>
```

### 5. Updated List View Desktop (LectureRowCard)
**File:** `/components/lectures/StudiesWithLectures.tsx`

**Column headers updated:**
- Changed grid columns from `[...60px_120px]` to `[...60px_140px]`
- Changed "Folder" header alignment to `text-left pl-2`

**Before:**
```typescript
<div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
  <FolderSelector
    lectureId={lecture.job_id}
    currentFolderId={lecture.user_folder_id}
    onFolderChange={(folderId) => {
      onFolderUpdate?.(lecture.job_id, folderId);
    }}
  />
</div>
```

**After:**
```typescript
<div className="flex items-start justify-start pl-2">
  <FolderBadge folderName={lecture.user_folders?.folder_name || null} />
</div>
```

### 6. Updated List View Mobile (LectureRowCard)
**File:** `/components/lectures/StudiesWithLectures.tsx`

**Before:**
```typescript
<div className="md:hidden mt-2 ml-7">
  <div onClick={(e) => e.stopPropagation()}>
    <FolderSelector
      lectureId={lecture.job_id}
      currentFolderId={lecture.user_folder_id}
      onFolderChange={(folderId) => {
        onFolderUpdate?.(lecture.job_id, folderId);
      }}
    />
  </div>
</div>
```

**After:**
```typescript
<div className="md:hidden mt-2 ml-7">
  <FolderBadge folderName={lecture.user_folders?.folder_name || null} />
</div>
```

### 7. Removed onFolderUpdate Props
**File:** `/components/lectures/StudiesWithLectures.tsx`

**Removed from LectureCardProps interface:**
```typescript
onFolderUpdate?: (lectureId: string, folderId: string | null) => void;
```

**Removed from component calls:**
- Removed from `<LectureCard>` in grid view
- Removed from `<LectureRowCard>` in list view
- Removed from function signatures

### 8. Updated TypeScript Types
**File:** `/types/database.ts`

**Added folder relationship to Note interface:**
```typescript
export interface Note {
  job_id: string;
  lecture_title: string;
  course_subject: string | null;
  created_at: string;
  status: string;
  marked_for_review?: boolean;
  review_reason?: string | null;
  user_folder_id?: string | null;
  user_id?: string;
  user_folders?: {
    id: string;
    folder_name: string;
  } | null;
}
```

## Files Modified

1. `/components/lectures/StudiesWithLectures.tsx` - Main component with all changes
2. `/types/database.ts` - Updated Note interface

## Files Not Modified (Still Needed)

1. `/components/lectures/FolderSelector.tsx` - Still used in course pages for folder assignment

## User Experience Changes

### Before:
- Lectures page had dropdown selector for folder assignment
- Users could assign/reassign folders directly from lectures list
- Caused 403 errors when trying to load folder list
- Cluttered UI with interactive elements

### After:
- Lectures page shows simple badge indicating current folder
- Badge is read-only (no interaction)
- Clean, minimal UI
- Folder assignment happens only from course page

## Benefits

1. **No More 403 Errors** - Removed API call to `/api/enrollments/my-courses` from lectures page
2. **Cleaner UX** - Clear separation of concerns:
   - Lectures page = View and access lectures
   - Course page = Organize lectures into folders
3. **Better Performance** - No unnecessary API calls on lectures page
4. **Improved Mobile Experience** - Simpler interface with fewer interactive elements
5. **Consistent Pattern** - Follows standard UX pattern where organization happens in dedicated views

## Testing Checklist

- [x] File syntax is valid
- [ ] Lectures page loads without 403 errors
- [ ] FolderBadge displays correctly for assigned lectures
- [ ] No badge shown for unassigned lectures
- [ ] Badge truncates long folder names properly
- [ ] Desktop grid view shows badge
- [ ] Desktop list view shows badge in correct column
- [ ] Mobile list view shows badge below lecture info
- [ ] Dark mode styling looks correct
- [ ] Can still assign lectures from course folder page
- [ ] Can still remove lectures from folders on course page

## Next Steps

1. Test in development environment
2. Verify no TypeScript compilation errors
3. Test on mobile devices
4. Verify dark mode styling
5. Test folder assignment still works from course page

## Related Documentation

- Original task specification in conversation
- Folder Management System: `/docs/FOLDER-MANAGEMENT-SYSTEM.md`
