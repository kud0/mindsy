# Active Course System

**Feature Status:** ✅ Complete
**Database Migrations:** 023, 024, 026
**Last Updated:** 2025-10-21

## Overview

The Active Course System allows students to mark 1-2 courses as "active" and select which year/semester folder they're currently working on. The dashboard widget displays a swipeable interface showing active courses with upcoming deadlines and progress tracking.

## Core Concepts

### Active Courses (Max 2)
- Students can set **up to 2 courses as active** at any time
- Limit enforced at database level via trigger
- Active courses appear in the dashboard widget
- Inactive courses don't show in the widget

### Year/Semester Selection
- Each course has hierarchical folder structure:
  - **Top-level folders** = Years/Semesters ("Primer curso", "Segundo curso", "Year 1", "Semester 1")
  - **Child folders** = Subjects/Topics ("Fisiopatología", "Microbiología")
- When activating a course, users **must select which year/semester folder** is active
- This determines which content, deadlines, and progress to display

### Progress Tracking
- Progress calculated based on **active folder tree** only
- Recursive calculation: counts completed lectures in active folder + all descendants
- Shows completion percentage (e.g., "23% - 5/22 lectures completed")

### Deadline Integration
- Displays **next closest deadline** (essays, assignments, etc.) within 14 days
- Always shows **next exam** regardless of date
- Color-coded urgency:
  - 🔴 Red: ≤2 days
  - 🟠 Amber: 2-5 days
  - 🟣 Purple: 5-7 days
  - 🔵 Blue: Exams

## Database Schema

### Migrations

**023_add_active_course_support.sql**
- Adds `is_active_course` column (boolean flag)
- Adds `active_year` column (deprecated, kept for backward compatibility)
- Adds `total_years` to courses table
- Creates trigger to enforce max 2 active courses
- Creates helper functions: `toggle_active_course()`, `get_active_courses()`

**024_add_deadline_support.sql**
- Adds deadline fields to `study_sessions`:
  - `course_id` - Links session to course
  - `deadline_type` - Essay, exam, assignment, quiz, project, presentation, lab, other
  - `is_deadline` - Quick boolean flag
  - `priority` - Low, medium, high, urgent
  - `completion_percentage` - 0-100%
- Creates helper functions: `get_upcoming_deadlines()`, `get_overdue_deadlines()`, `get_deadline_stats()`

**026_fix_active_folder_logic.sql**
- Adds `active_folder_id` pointing to year/semester folder
- Updates `toggle_active_course()` to require folder selection
- Updates `get_active_courses()` to return folder info
- Creates `get_course_year_folders()` to fetch selectable folders

### Key Tables

**course_enrollments**
```sql
id                   UUID PRIMARY KEY
user_id              UUID REFERENCES profiles(id)
course_id            UUID REFERENCES courses(id)
is_active            BOOLEAN (enrollment status)
is_active_course     BOOLEAN (user-selected active, max 2)
active_folder_id     UUID REFERENCES user_folders(id)
active_year          INTEGER (deprecated)
enrolled_at          TIMESTAMPTZ
```

**courses**
```sql
id                   UUID PRIMARY KEY
course_code          VARCHAR(50)
course_name          TEXT
institution          TEXT
total_years          INTEGER (for multi-year programs)
```

**study_sessions** (with deadline support)
```sql
id                      UUID PRIMARY KEY
user_id                 UUID
course_id               UUID REFERENCES courses(id)
user_folder_id          UUID REFERENCES user_folders(id)
deadline_type           VARCHAR(50)
is_deadline             BOOLEAN
priority                VARCHAR(20)
completion_percentage   INTEGER
```

### Database Functions

**toggle_active_course(user_id, course_id, set_active, active_folder_id)**
- Safely activates/deactivates courses
- Enforces max 2 limit
- Requires folder selection when activating
- Returns JSONB with success status

**get_active_courses(user_id)**
- Returns user's active courses with folder info
- Joins with courses and user_folders
- Used by API endpoints

**get_course_year_folders(user_id, course_id)**
- Returns top-level folders for a course
- Shows child count for each folder
- Used in YearSelectorDialog

**get_upcoming_deadlines(user_id, course_id, days_ahead, limit)**
- Returns upcoming deadlines sorted by priority and date
- Filters by course if provided
- Default: next 30 days, limit 10

## API Endpoints

### GET /api/enrollments/my-courses
**Query params:**
- `?active=true` - Filter to only active courses

**Returns:**
```typescript
{
  success: true,
  courses: [
    {
      id: string,
      course_code: string,
      course_name: string,
      institution: string,
      enrollment_id: string,
      enrollment_count: number,
      is_active_course: boolean,
      active_folder_id: string | null,
      active_folder_name: string | null,
      total_years: number
    }
  ]
}
```

### PATCH /api/enrollments/[enrollmentId]
**Body:**
```typescript
{
  is_active_course: boolean,
  active_folder_id?: string  // Required when activating
}
```

**Returns:**
```typescript
{
  success: boolean,
  enrollment?: object,
  error?: string
}
```

### GET /api/schedule/upcoming-deadlines
**Query params:**
- `?course_id=uuid` - Filter to specific course

**Returns:**
```typescript
{
  success: true,
  data: {
    nextClosestDeadline: {
      id: string,
      title: string,
      deadline_type: string,
      start_time: string,
      daysUntil: number,
      priority: string,
      subject: string,
      completion_percentage: number
    } | null,
    nextExam: {
      // Same structure as deadline
    } | null
  }
}
```

### GET /api/courses/[courseId]/year-folders
**Returns:**
```typescript
{
  success: true,
  folders: [
    {
      folder_id: string,
      folder_name: string,
      folder_order: number,
      child_count: number
    }
  ]
}
```

### GET /api/courses/[courseId]/progress
**Query params:**
- `?folderId=uuid` - Calculate progress for folder tree

**Returns:**
```typescript
{
  success: true,
  progress: number,      // 0-100 percentage
  completed: number,     // Count of completed lectures
  total: number          // Total lectures in folder tree
}
```

## UI Components

### CoursesWidget
**Location:** `components/widgets/CoursesWidget.tsx`

**Features:**
- Loads only active courses (`?active=true`)
- Swipeable between courses (Framer Motion)
- Shows current index (e.g., "Active Courses (1/2)")
- Arrow navigation buttons
- Dot indicators
- Fetches deadlines and progress in parallel
- Empty state if no active courses

**Props:** None (self-contained)

### ActiveCourseCard
**Location:** `components/widgets/ActiveCourseCard.tsx`

**Features:**
- Displays course header with code, name, institution
- Shows active folder badge ("Primer curso")
- Progress bar with gradient (purple → green)
- Next deadline card (color-coded by urgency)
- Next exam card (always blue)
- Empty state if no deadlines

**Props:**
```typescript
{
  course: {
    id: string,
    course_code: string,
    course_name?: string,
    institution: string,
    active_folder_id?: string | null,
    active_folder_name?: string | null,
    enrollment_id: string
  },
  nextDeadline?: Deadline | null,
  nextExam?: Deadline | null,
  progress?: number  // 0-100
}
```

### YearSelectorDialog
**Location:** `components/courses/YearSelectorDialog.tsx`

**Features:**
- Opens when activating course or clicking settings icon
- Shows top-level folders with child counts
- Radio button selection
- Save button activates course with selected folder
- Toast confirmation

**Props:**
```typescript
{
  open: boolean,
  onOpenChange: (open: boolean) => void,
  courseCode: string,
  courseName: string,
  courseId: string,
  enrollmentId: string,
  currentActiveFolderId?: string | null,
  onYearSelected: () => void
}
```

### Courses Page
**Location:** `app/dashboard/courses/page.tsx`

**Features:**
- Lists all enrolled courses
- Active badge on active courses
- "Set Active" button (max 2 enforced with toast)
- Settings icon to change active folder
- Shows active folder name badge
- Course cards are clickable to view details

## User Experience Flow

### 1. Activating a Course

1. User goes to `/dashboard/courses`
2. Clicks **"Set Active"** on a course
3. **YearSelectorDialog opens** showing:
   ```
   Select Active Year/Semester for [Course Code]

   📁 Primer curso (6 subjects)
   📁 Segundo curso (5 subjects)
   ```
4. User selects **"Primer curso"**
5. Clicks **"Save"**
6. Toast: ✅ "Course set as active"
7. Page reloads, course now has:
   - Purple border
   - Active badge (⭐ Active)
   - Folder name badge ("Primer curso")
   - Settings icon (⚙️)

### 2. Max 2 Active Enforcement

1. User has 2 courses already active
2. Tries to activate a 3rd course
3. **Toast error appears:**
   ```
   ❌ Maximum 2 active courses
   You already have 2 active courses: BIOL101, CHEM201.
   Deactivate one first.
   ```
4. User must deactivate one before activating another

### 3. Changing Active Year

1. User is in active course card on courses page
2. Clicks **⚙️ settings icon**
3. YearSelectorDialog opens (same as activation)
4. User selects **"Segundo curso"** (moving to second year)
5. Clicks **"Save"**
6. Course updates:
   - Folder badge changes to "Segundo curso"
   - Progress recalculates for second year
   - Deadlines update to show second year only

### 4. Dashboard Widget

1. User goes to `/dashboard`
2. **CoursesWidget** shows:
   - Title: "Active Courses (1/2)" or "Active Course"
   - Swipeable cards (if 2 active)
   - Left/right arrows
   - Dot indicators

3. **Each card displays:**
   ```
   BIOL101                           [Primer curso]
   Introduction to Biology
   Universidad de Barcelona

   Year Progress                           23%
   [████████░░░░░░░░░░░░░░░░░░░░]

   📝 Essay in 3 days
   Cell Division Analysis
   Biology

   📅 Next Exam in 12 days
   Midterm Examination
   Biology
   ```

4. User can:
   - Swipe left/right (touch)
   - Click arrows
   - Click dots to jump to course
   - Click anywhere to go to `/dashboard/courses`

### 5. Empty States

**No Active Courses:**
```
   📚
   No active courses
   Set 1-2 courses as active to track upcoming deadlines
```

**No Deadlines:**
```
   📖
   No upcoming deadlines
   Add deadlines in your calendar
```

## Color System

### Urgency Colors (Deadlines)
- **≤2 days:** Red 600 / Red 50 bg / Red 200 border
- **2-5 days:** Amber 600 / Amber 50 bg / Amber 200 border
- **5-7 days:** Purple 600 / Purple 50 bg / Purple 200 border
- **7+ days:** Blue 600 / Blue 50 bg / Blue 200 border
- **Exams:** Always Blue (regardless of date)

### Progress Bar
- Gradient: Purple 500 → Green 500

### Active Badge
- Background: Purple 500
- Text: White
- Icon: Star (filled)

## Testing Checklist

- [ ] Can activate course and select year/semester
- [ ] Cannot activate more than 2 courses (toast error)
- [ ] Can deactivate active course
- [ ] Can change active folder via settings icon
- [ ] Widget shows only active courses
- [ ] Widget swipes between 2 active courses
- [ ] Progress calculates correctly for active folder
- [ ] Next deadline shows within 14 days
- [ ] Next exam always shows
- [ ] Color coding matches urgency
- [ ] Empty states display correctly
- [ ] Active badge and folder badge display
- [ ] Clicking widget navigates to courses page

## Future Enhancements

- [ ] Bulk activate/deactivate courses
- [ ] Auto-progress to next year/semester
- [ ] Deadline notifications
- [ ] Progress milestones (25%, 50%, 75%, 100%)
- [ ] Study time tracking per course
- [ ] Course completion certificates
- [ ] Archive completed years
- [ ] Export course progress reports

## Related Documentation

- `docs/FOLDER-MANAGEMENT-SYSTEM.md` - Hierarchical folder structure
- `migrations/023_add_active_course_support.sql` - Database schema
- `migrations/024_add_deadline_support.sql` - Deadline system
- `migrations/026_fix_active_folder_logic.sql` - Folder integration
