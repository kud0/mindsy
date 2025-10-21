# Active Course Folder System - Testing Checklist

**Test File:** `tests/active-course-folders.test.ts`
**Run Command:** `npx tsx tests/active-course-folders.test.ts`

---

## ✅ Pre-Test Setup

- [ ] Environment variables configured:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL` (optional, defaults to `http://localhost:3001`)
- [ ] Supabase database is running and accessible
- [ ] Migrations applied (especially `023_add_active_course_support.sql` and `025_fix_active_folder_logic.sql`)
- [ ] Test dependencies installed (`@supabase/supabase-js`, `tsx`)

---

## 📋 Test Coverage

### 1. Database Functions

#### `get_course_year_folders(p_user_id, p_course_id)`

- [x] Returns only top-level folders (parent_folder_id IS NULL)
- [x] Returns folders in correct order (by folder_order)
- [x] Includes child_count for each folder
- [x] Returns empty array for course with no folders
- [x] Handles invalid course_id gracefully

#### `toggle_active_course(p_user_id, p_course_id, p_set_active, p_active_folder_id)`

- [x] **Activation validation:**
  - [x] Requires `p_active_folder_id` when `p_set_active = true`
  - [x] Returns error if folder_id is NULL when activating
  - [x] Validates enrollment exists before updating
  - [x] Enforces maximum 2 active courses per user
  - [x] Returns appropriate error message when limit reached
- [x] **Activation success:**
  - [x] Successfully activates course with valid folder_id
  - [x] Sets `is_active_course = true` in course_enrollments
  - [x] Sets `active_folder_id` to provided folder
  - [x] Returns success status with folder_id
- [x] **Deactivation:**
  - [x] Successfully deactivates course
  - [x] Clears `active_folder_id` (sets to NULL)
  - [x] Sets `is_active_course = false`
- [x] **Edge cases:**
  - [x] Handles invalid user_id
  - [x] Handles invalid course_id
  - [x] Handles invalid folder_id (foreign key constraint)
  - [x] Accepts both parent and child folders (no validation)

#### `get_active_courses(p_user_id)`

- [x] Returns only active courses (`is_active_course = true`)
- [x] Includes course details (code, name, institution)
- [x] Includes active_folder_id and active_folder_name
- [x] Returns total_years for progress calculation
- [x] Returns enrollment_id for updates
- [x] Returns maximum 2 courses per user
- [x] Returns empty array if no active courses

---

### 2. API Endpoints

#### `GET /api/courses/[courseId]/year-folders`

- [x] **Authentication:**
  - [x] Returns 401 without authentication
  - [x] Accepts valid auth token
- [x] **Success response:**
  - [x] Returns `{ success: true, folders: [...] }`
  - [x] Folders array contains top-level folders only
  - [x] Each folder has: folder_id, folder_name, folder_order, child_count
- [x] **Error handling:**
  - [x] Returns 500 on database error
  - [x] Returns appropriate error message

#### `PATCH /api/enrollments/[enrollmentId]`

- [x] **Authentication:**
  - [x] Returns 401 without authentication
  - [x] Verifies enrollment belongs to authenticated user
- [x] **Activation validation:**
  - [x] Returns 400 if `is_active_course = true` without `active_folder_id`
  - [x] Error message mentions required folder_id
  - [x] Returns 400 if max 2 active courses already exist
  - [x] Error message lists currently active courses
- [x] **Success response:**
  - [x] Returns `{ success: true, enrollment: {...} }`
  - [x] Includes updated enrollment data
  - [x] Includes nested course data
  - [x] Includes nested active_folder data (id, folder_name)
- [x] **Deactivation:**
  - [x] Allows deactivation without folder_id
  - [x] Clears active_folder_id when deactivating
- [x] **Error handling:**
  - [x] Returns 404 for non-existent enrollment
  - [x] Returns 404 if enrollment belongs to different user
  - [x] Returns 500 on database error

#### `GET /api/enrollments/[enrollmentId]`

- [x] Returns enrollment details
- [x] Includes course data
- [x] Includes active_year (backward compatibility)

---

### 3. Integration Tests - Full User Flow

**Scenario:** User activates a course with a specific year folder

- [x] **Step 1:** User views inactive course widget
- [x] **Step 2:** User clicks to activate course
- [x] **Step 3:** Year selector dialog opens
- [x] **Step 4:** Fetch year folders via `get_course_year_folders()`
- [x] **Step 5:** Display folders with child counts
- [x] **Step 6:** User selects "Year 2" folder
- [x] **Step 7:** Call `toggle_active_course()` with folder_id
- [x] **Step 8:** Verify enrollment updated in database
- [x] **Step 9:** Widget refreshes via `get_active_courses()`
- [x] **Step 10:** Badge displays "Year 2" folder name
- [x] **Step 11:** Progress bar calculates from total_years (future feature)

**Verification Points:**
- [x] Course activation persists in database
- [x] Folder name displays correctly in UI
- [x] Other components refresh with new active status
- [x] Max 2 active courses validation prevents third activation

---

### 4. UI Component Tests

#### `YearSelectorDialog.tsx`

**Props validation:**
- [x] Accepts all required props
- [x] Handles optional currentActiveFolderId
- [x] Calls onYearSelected callback on success

**State management:**
- [x] Loads year folders on dialog open
- [x] Shows loading spinner during fetch
- [x] Displays folders after successful fetch
- [x] Handles empty folders state
- [x] Handles fetch errors

**Folder selection:**
- [x] Highlights selected folder
- [x] Shows checkmark on selected folder
- [x] Shows "(current)" badge on current active folder
- [x] Updates selection on click
- [x] Disables save button if same folder selected

**Save action:**
- [x] Calls PATCH /api/enrollments/[enrollmentId]
- [x] Sends is_active_course: true
- [x] Sends active_folder_id: selectedFolderId
- [x] Shows loading state during save
- [x] Displays success toast on save
- [x] Closes dialog on success
- [x] Calls onYearSelected callback
- [x] Shows error toast on failure

**Visual elements:**
- [x] Displays course code in title
- [x] Displays course name in description
- [x] Shows folder icon for each folder
- [x] Shows child count (e.g., "5 subjects")
- [x] Cancel button works
- [x] Proper styling (purple theme, backdrop blur)

---

## 🧪 Manual Testing Checklist

### Database Layer

```bash
# Test 1: Get year folders
psql -d mindsy -c "
  SELECT * FROM get_course_year_folders(
    'user-uuid'::UUID,
    'course-uuid'::UUID
  );
"

# Test 2: Activate course with folder
psql -d mindsy -c "
  SELECT toggle_active_course(
    'user-uuid'::UUID,
    'course-uuid'::UUID,
    true,
    'folder-uuid'::UUID
  );
"

# Test 3: Get active courses
psql -d mindsy -c "
  SELECT * FROM get_active_courses('user-uuid'::UUID);
"
```

### API Layer

```bash
# Test 1: Get year folders
curl http://localhost:3001/api/courses/COURSE_ID/year-folders \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 2: Activate course
curl -X PATCH http://localhost:3001/api/enrollments/ENROLLMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active_course": true, "active_folder_id": "FOLDER_ID"}'

# Test 3: Get enrollment details
curl http://localhost:3001/api/enrollments/ENROLLMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### UI Layer

1. **Navigate to Dashboard**
   - [ ] See inactive course widgets (greyed out)
   - [ ] Click on inactive course
   - [ ] Year selector dialog opens

2. **Year Selector Dialog**
   - [ ] Dialog shows course code and name
   - [ ] Year folders load (e.g., "Year 1", "Year 2", "Year 3")
   - [ ] Each folder shows child count
   - [ ] First folder pre-selected if no current active
   - [ ] Current active folder highlighted if exists

3. **Select and Save**
   - [ ] Click different folder to select it
   - [ ] Selected folder gets purple border and checkmark
   - [ ] Click "Set Active" button
   - [ ] Dialog shows "Saving..." state
   - [ ] Success toast appears: "Active: Year 2"
   - [ ] Dialog closes

4. **Widget Updates**
   - [ ] Course widget now shows active state
   - [ ] Badge displays folder name (e.g., "Year 2")
   - [ ] Progress bar appears (when implemented)
   - [ ] Widget no longer greyed out

5. **Max 2 Courses Validation**
   - [ ] Activate first course ✅
   - [ ] Activate second course ✅
   - [ ] Try to activate third course ❌
   - [ ] Error toast: "Maximum 2 active courses allowed"
   - [ ] Error message lists current active courses

6. **Deactivation**
   - [ ] Click active course widget
   - [ ] Option to deactivate (or change folder)
   - [ ] Deactivate course
   - [ ] Widget returns to inactive state
   - [ ] Badge disappears
   - [ ] Can now activate another course

---

## 🐛 Known Edge Cases to Test

1. **Course with no folders:**
   - [ ] Dialog shows "No year folders found" message
   - [ ] Save button disabled
   - [ ] Prompt to create folders first

2. **Only child folders exist (no top-level):**
   - [ ] get_course_year_folders returns empty array
   - [ ] Dialog shows empty state

3. **User already has 2 active courses:**
   - [ ] Attempting to activate third fails
   - [ ] Clear error message with course names
   - [ ] User must deactivate one first

4. **Network errors:**
   - [ ] Loading state handles fetch failures
   - [ ] Error toast displays
   - [ ] Dialog remains open for retry

5. **Concurrent updates:**
   - [ ] User A activates course
   - [ ] User A tries to activate 3rd course in another tab
   - [ ] Database constraint prevents it
   - [ ] Error handled gracefully

6. **Invalid folder_id:**
   - [ ] Foreign key constraint prevents save
   - [ ] Error message displayed
   - [ ] User can select valid folder

7. **Deleted folder:**
   - [ ] ON DELETE SET NULL in schema
   - [ ] active_folder_id becomes NULL
   - [ ] Course remains active but no folder selected
   - [ ] User can select new folder

---

## 📊 Performance Checklist

- [ ] `get_course_year_folders()` uses index on (user_id, course_id, parent_folder_id)
- [ ] `get_active_courses()` uses index on (user_id, is_active_course)
- [ ] Child count calculated efficiently (subquery)
- [ ] API response time < 200ms for folder fetch
- [ ] API response time < 300ms for activation
- [ ] Dialog opens instantly (no lag)
- [ ] Folder list renders smoothly (100+ folders)

---

## 🔒 Security Checklist

- [ ] RLS policies on course_enrollments table
- [ ] User can only update their own enrollments
- [ ] User can only view their own folders
- [ ] Auth token validated on all API routes
- [ ] Course_id validated in API routes
- [ ] Enrollment ownership verified before update
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (React auto-escaping)

---

## 📝 Test Execution Log

**Date:** _________________
**Tester:** _________________
**Environment:** _________________

| Test Category | Total | Passed | Failed | Notes |
|--------------|-------|--------|--------|-------|
| Database Functions | 20 | | | |
| API Endpoints | 15 | | | |
| Integration Flow | 11 | | | |
| UI Components | 18 | | | |
| Edge Cases | 7 | | | |
| Performance | 6 | | | |
| Security | 8 | | | |
| **TOTAL** | **85** | | | |

---

## 🚀 Quick Start

```bash
# 1. Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 2. Run automated tests
npx tsx tests/active-course-folders.test.ts

# 3. Start dev server for manual UI testing
npm run dev

# 4. Navigate to http://localhost:3001/dashboard

# 5. Test activation flow manually
```

---

## 📈 Success Criteria

✅ **All automated tests pass (85+ assertions)**
✅ **Manual UI flow works smoothly**
✅ **Max 2 active courses enforced**
✅ **Folder names display correctly in widgets**
✅ **No console errors or warnings**
✅ **Performance < 300ms for all operations**
✅ **Security: RLS policies working**
✅ **Edge cases handled gracefully**

---

## 🔗 Related Documentation

- **Database Schema:** `migrations/023_add_active_course_support.sql`
- **Database Functions:** `migrations/025_fix_active_folder_logic.sql`
- **API Routes:**
  - `app/api/courses/[courseId]/year-folders/route.ts`
  - `app/api/enrollments/[enrollmentId]/route.ts`
- **UI Component:** `components/courses/YearSelectorDialog.tsx`
- **Course System Docs:** `docs/FOLDER-MANAGEMENT-SYSTEM.md`

---

**Last Updated:** October 21, 2025
**Test Version:** 1.0.0
**Migration Version:** 025
