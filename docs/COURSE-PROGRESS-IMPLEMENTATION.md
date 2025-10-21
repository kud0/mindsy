# Course Progress Implementation

## Overview

Implemented a comprehensive progress tracking system for active courses based on folder tree structures. This allows students to see how much of their course year they have completed based on uploaded lectures.

## Implementation Date

October 21, 2025

## Files Created

### 1. `/lib/courses/progress.ts`

Core utility for calculating folder progress. Contains:

- `calculateFolderProgress(userId, folderId)` - Main function to calculate progress
- `getAllDescendantFolderIds()` - Recursive helper to get all child folders
- `calculateMultipleFolderProgress()` - Batch operation for multiple folders

**Logic:**
1. Recursively fetches all descendant folder IDs from a parent folder
2. Counts total lectures in all folders (`jobs` table with `status` IN ('processing', 'completed', 'failed'))
3. Counts completed lectures (`status = 'completed'`)
4. Returns percentage: `(completed / total) * 100`

### 2. `/app/api/courses/[courseId]/progress/route.ts`

API endpoint for fetching progress data.

**Endpoint:** `GET /api/courses/[courseId]/progress?folderId=xxx`

**Query Parameters:**
- `folderId` (required) - The root folder ID to calculate progress from

**Response:**
```json
{
  "success": true,
  "progress": 45,
  "completed": 12,
  "total": 27,
  "folderIds": ["id1", "id2", "id3"]
}
```

**Security:**
- Verifies user authentication
- Checks course enrollment
- Validates folder ownership
- Ensures folder belongs to course

### 3. `/lib/courses/index.ts`

Central export file for course utilities.

### 4. `/components/widgets/CoursesWidget.tsx` (Updated)

**Changes:**
- Added `ProgressData` interface
- Added `progressData` state to store progress for each active course
- Modified `loadDeadlinesForCourses()` to fetch both deadlines AND progress in parallel
- Updated `ActiveCourseCard` to receive real progress instead of hardcoded `0`

**Behavior:**
- Fetches progress only if `active_folder_id` exists
- Defaults to 0% if no active folder or error occurs
- Progress updates in real-time when widget loads

## Database Schema

Uses existing tables:

### `jobs` table
- `job_id` (UUID) - Primary key
- `user_id` (UUID) - Owner
- `user_folder_id` (UUID) - Folder assignment
- `status` (TEXT) - 'processing' | 'completed' | 'failed'
- `lecture_title` (TEXT)

### `user_folders` table
- `id` (UUID) - Primary key
- `user_id` (UUID) - Owner
- `parent_folder_id` (UUID) - Parent folder (nullable)
- `folder_name` (TEXT)
- `course_id` (UUID) - Associated course

### `course_enrollments` table
- `id` (UUID) - Primary key
- `user_id` (UUID) - Student
- `course_id` (UUID) - Course
- `is_active_course` (BOOLEAN)
- `active_folder_id` (UUID) - Root folder for progress calculation

## How It Works

1. **Active Course Widget loads** → Fetches active courses with `active_folder_id`
2. **For each active course:**
   - API call to `/api/courses/[courseId]/progress?folderId={active_folder_id}`
3. **Progress calculation:**
   - Get all descendant folders recursively
   - Count lectures in `jobs` table where `user_folder_id IN (folderIds)`
   - Calculate: `completed / total * 100`
4. **Display:**
   - Progress bar shows percentage
   - Label shows "Year Progress" (e.g., "45%")
   - Color gradient: purple → green

## Example Flow

**User has active course:** "Biology 101"
- **Active folder:** "Segundo curso" (2nd year)
- **Folder structure:**
  ```
  Segundo curso
  ├── Biología Celular (3 lectures, 2 completed)
  ├── Genética (5 lectures, 4 completed)
  └── Ecología (4 lectures, 1 completed)
  ```
- **Calculation:**
  - Total: 12 lectures
  - Completed: 7 lectures
  - Progress: 58%

## API Usage Examples

### Fetch progress for a folder

```typescript
const response = await fetch(
  `/api/courses/${courseId}/progress?folderId=${folderId}`
);
const data = await response.json();

console.log(data);
// {
//   success: true,
//   progress: 58,
//   completed: 7,
//   total: 12,
//   folderIds: ['folder1', 'folder2', 'folder3']
// }
```

### Use in component

```typescript
import { calculateFolderProgress } from '@/lib/courses';

// Server-side only
const progressData = await calculateFolderProgress(userId, folderId);
```

## Error Handling

1. **Missing folder:** Returns 404
2. **Not enrolled in course:** Returns 404
3. **Folder doesn't belong to course:** Returns 400
4. **Database error:** Returns 500, logs error, defaults to 0% progress
5. **No lectures:** Returns 0% progress (valid state)

## Performance Considerations

- **Recursive queries:** Limited by folder depth (typically 2-3 levels max)
- **Parallel fetching:** Progress and deadlines fetched concurrently
- **Efficient counting:** Uses `count` queries instead of fetching full data
- **Caching opportunity:** Could add Redis cache for frequently accessed progress

## Future Enhancements

1. **Real-time updates:** Use Supabase Realtime to update progress when lectures complete
2. **Granular progress:** Show progress by chapter/topic instead of just year
3. **Progress history:** Track progress over time for analytics
4. **Completion predictions:** ML to predict when user will finish based on pace
5. **Caching:** Add Redis or in-memory cache for frequently accessed data

## Testing

**Manual testing:**
1. Create a course with folders
2. Set as active course with `active_folder_id`
3. Upload lectures to various folders
4. Mark some as completed
5. Check widget shows correct percentage

**Edge cases handled:**
- Empty folder (0 lectures) → 0%
- All lectures completed → 100%
- Nested folders (3+ levels deep) → Counts all descendants
- No active folder → 0%
- API error → Defaults to 0%, doesn't break UI

## Related Documentation

- Course & Folder Management: `/docs/FOLDER-MANAGEMENT-SYSTEM.md`
- Active Course System: `/docs/ACTIVE-COURSE-SELECTION.md` (if exists)
- Widget Design: `/docs/WIDGET-DESIGN-SYSTEM.md`

## Commit Information

**Agent:** nextjs-fullstack-engineer
**Task:** Implement progress calculation for active courses based on folder trees
**Date:** October 21, 2025
