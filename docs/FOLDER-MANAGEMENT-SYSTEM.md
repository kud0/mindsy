# Folder Management System

## Overview

Mindsy's course folder system allows hierarchical organization of lectures and materials. Folders can be:
- **AI-generated** from course syllabi (via OpenAI web search)
- **Manually created** by users
- **Nested** to any depth (parent → child → grandchild...)

## Database Schema

### Table: `user_folders`

```sql
CREATE TABLE user_folders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  parent_folder_id UUID REFERENCES user_folders(id) ON DELETE CASCADE,
  folder_name TEXT NOT NULL,
  folder_order INTEGER DEFAULT 0,
  created_from_template_id UUID REFERENCES course_templates(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**
- `parent_folder_id`: NULL = root folder, otherwise points to parent
- `folder_order`: Controls display order within siblings (same parent)
- `created_from_template_id`: Tracks if folder came from AI/template

**Cascade Behavior:**
- Deleting a folder → Deletes ALL children recursively (ON DELETE CASCADE)
- Deleting a course → Sets folder's course_id to NULL (ON DELETE SET NULL)

## Folder Hierarchy Structure

### Typical AI-Generated Structure (Spanish Universities):

```
Primer curso (parent_folder_id: null, folder_order: 0)
├── Biología (parent_folder_id: primer_curso_id, folder_order: 0)
├── Física (parent_folder_id: primer_curso_id, folder_order: 1)
└── Matemáticas (parent_folder_id: primer_curso_id, folder_order: 2)

Segundo curso (parent_folder_id: null, folder_order: 1)
├── Química (parent_folder_id: segundo_curso_id, folder_order: 0)
└── Biología II (parent_folder_id: segundo_curso_id, folder_order: 1)

Optativas (parent_folder_id: null, folder_order: 2)
├── Subject A (parent_folder_id: optativas_id, folder_order: 0)
└── Subject B (parent_folder_id: optativas_id, folder_order: 1)
```

### Building Tree from Flat List:

Frontend receives flat array from API, then builds tree:

```typescript
const buildFolderTree = (folders: Folder[]): Folder[] => {
  const folderMap = new Map<string, Folder>();
  const rootFolders: Folder[] = [];

  // First pass: create map
  folders.forEach(folder => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  // Second pass: build tree
  folders.forEach(folder => {
    const currentFolder = folderMap.get(folder.id)!;
    if (folder.parent_folder_id === null) {
      rootFolders.push(currentFolder);
    } else {
      const parent = folderMap.get(folder.parent_folder_id);
      if (parent) {
        parent.children.push(currentFolder);
      }
    }
  });

  return rootFolders;
};
```

## API Endpoints

### 1. Get Folders for Course
**GET** `/api/courses/[courseId]/folders`

Returns flat list of all user's folders for the course, ordered by `folder_order`.

### 2. Create Folder
**POST** `/api/courses/[courseId]/folders`

**Body:**
```json
{
  "folder_name": "My Folder",
  "parent_folder_id": "uuid-or-null",
  "folder_order": 0  // optional, auto-calculated if omitted
}
```

**Auto-calculation:** If `folder_order` not provided, calculates as `max(siblings.folder_order) + 1`

### 3. Update Folder
**PATCH** `/api/folders/[folderId]`

**Body:**
```json
{
  "folder_name": "New Name",     // optional
  "folder_order": 5              // optional
}
```

Used for:
- Renaming folders
- Reordering folders (swap orders with siblings)

### 4. Delete Folder
**DELETE** `/api/folders/[folderId]`

**Cascade Delete:** Deletes folder + ALL descendants recursively.

**Returns:**
```json
{
  "success": true,
  "deleted_count": 15,
  "message": "Deleted 15 folder(s)"
}
```

## AI Folder Generation

### How It Works:

1. User creates/enrolls in course
2. System calls `/api/courses/[courseId]/generate-folders`
3. Backend calls OpenAI (gpt-5) with web search enabled
4. OpenAI searches for official course syllabus
5. OpenAI returns folder structure as JSON
6. Backend recursively creates folders in database

### OpenAI Integration:

**File:** `/lib/openai-course-generator.ts`

**Key Function:**
```typescript
export async function generateCourseFoldersWithOpenAI(input: CourseFolderInput): Promise<CourseFolderResult>
```

**Prompt Strategy:**
- Acts as "web scraper" to find official course structure
- Copies EXACT hierarchy from university website
- Returns hierarchical JSON: `FolderHierarchy[]`

**FolderHierarchy Interface:**
```typescript
interface FolderHierarchy {
  name: string;
  children?: (string | FolderHierarchy)[];  // Recursive nesting
}
```

**Example Response:**
```json
{
  "folders": [
    {
      "name": "Primer curso",
      "children": [
        "Biología",
        "Física",
        "Matemáticas"
      ]
    },
    {
      "name": "Segundo curso",
      "children": [
        "Química",
        "Biología II"
      ]
    }
  ]
}
```

### Recursive Folder Creation:

**File:** `/app/api/courses/[courseId]/generate-folders/route.ts`

```typescript
async function createFoldersRecursively(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
  items: (string | FolderHierarchy)[],
  parentFolderId: string | null = null,
  startOrder: number = 0
): Promise<number>
```

Handles unlimited nesting depth:
- `string` → Simple folder
- `FolderHierarchy` → Parent folder with children (recurse)

## UI Components

### Course Page: `/app/dashboard/courses/[courseId]/page.tsx`

**Visual Structure:**

```
📁 Primer curso (10 subjects)  [⋮ menu]
   ├── [Card] Biología          [⋮ menu]
   ├── [Card] Física            [⋮ menu]
   └── [Card] Matemáticas       [⋮ menu]

📁 Segundo curso (8 subjects)  [⋮ menu]
   ├── [Card] Química           [⋮ menu]
   └── [Card] Biología II       [⋮ menu]
```

**Section Header Actions (Parent Folders):**
- Edit Name
- Create Subfolder
- Delete (cascade)

**Child Folder Actions:**
- Edit Name
- Move Up / Move Down
- Delete

### Context Menu Implementation:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm">
      <MoreVertical className="w-4 h-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => handleEdit()}>
      <Edit className="w-4 h-4 mr-2" />
      Edit Name
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleDelete()}>
      <Trash2 className="w-4 h-4 mr-2" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Folder Detail Page: `/app/dashboard/courses/[courseId]/folders/[folderId]/page.tsx`

**Header Actions:**
- Edit Name (3-dot menu in header)
- Delete Folder (navigates back to course page after deletion)

## Key Features

### 1. Collapse/Expand

**State:**
```typescript
const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
```

**Default:** All folders expanded on load

**Toggle:**
```typescript
const toggleFolder = (folderId: string) => {
  setExpandedFolders(prev => {
    const newSet = new Set(prev);
    if (newSet.has(folderId)) {
      newSet.delete(folderId);
    } else {
      newSet.add(folderId);
    }
    return newSet;
  });
};
```

### 2. Reordering (Move Up / Move Down)

**How It Works:**

1. Fetch all folders for course
2. Filter siblings (same `parent_folder_id`)
3. Sort by `folder_order`
4. Find current folder's index
5. Calculate swap index (up = -1, down = +1)
6. Swap `folder_order` values via two PATCH requests

**Example:**
```typescript
// Original:
Biología (order: 0)
Física (order: 1)
Matemáticas (order: 2)

// After "Move Down" on Biología:
Física (order: 0)       // was 1, now 0
Biología (order: 1)     // was 0, now 1
Matemáticas (order: 2)
```

**Why Two PATCH Requests:**
- Cannot swap in one transaction
- Swap orders of both folders
- Refresh folder list after both complete

### 3. Cascade Delete

**Behavior:**
- Deleting parent → Deletes ALL descendants (children, grandchildren, etc.)
- Enforced by database: `ON DELETE CASCADE`

**UI Warning:**
```
⚠️ Warning: Cascade Delete
This will permanently delete this folder and ALL its subfolders and lectures.
```

**Backend Logic:**
```typescript
// Get all descendant IDs recursively
const getAllDescendantIds = (parentId: string, folders: any[]): string[] => {
  const children = folders.filter(f => f.parent_folder_id === parentId);
  let ids = children.map(c => c.id);
  children.forEach(child => {
    ids = ids.concat(getAllDescendantIds(child.id, folders));
  });
  return ids;
};

// Returns count: { deleted_count: 15 }
```

### 4. Section Headers (Non-clickable)

**UI Pattern:**
- "Primer curso", "Segundo curso" = Visual separators only
- NOT clickable folders (no navigation on click)
- Only children (Biología, Física) are clickable → navigate to folder detail page

**Why:**
- Avoids redundant navigation (can't click parent AND children)
- Cleaner UX - sections organize, subjects are destinations
- Parent folders still have actions (edit, delete, create subfolder)

## Toast Notifications

All operations show feedback via `toast` (sonner):

```typescript
toast.success('Folder renamed successfully');
toast.error('Failed to delete folder');
toast.success(`Deleted ${deleted_count} folder(s)`);
toast.error('Cannot move folder further in that direction');
```

## Dialogs

### Edit Name Dialog:
- Input pre-filled with current name
- Enter key submits
- Validates non-empty name

### Delete Confirmation Dialog:
- Red warning box about cascade delete
- Shows folder name
- Destructive button (red)

### Create Folder Dialog:
- Detects root vs subfolder context
- Auto-focuses input
- Enter key submits

## Future Enhancements

### Potential Features:
1. **Drag & Drop Reordering** - Visual drag-and-drop instead of Move Up/Down
2. **Drag & Drop Nesting** - Drag folder onto another to make it a child
3. **Folder Icons** - Custom icons/colors per folder
4. **Folder Templates** - Save/share folder structures
5. **Bulk Operations** - Select multiple folders, delete/move together
6. **Folder Permissions** - Share folders with specific users
7. **Lecture Count** - Show actual lecture count instead of "0 lectures"
8. **Search Folders** - Search/filter folders by name

## Common Issues & Solutions

### Issue: Folders not showing after AI generation
**Solution:** Check browser console for API errors. Verify OpenAI API key is set.

### Issue: Delete not working
**Solution:** Check RLS policies in Supabase. User must own the folder.

### Issue: Reorder not visible
**Solution:** Refresh page. Reorder swaps `folder_order` but UI needs refresh.

### Issue: Hierarchy looks wrong
**Solution:** Check `parent_folder_id` values in database. NULL = root level.

## Testing Checklist

- [ ] Create root folder manually
- [ ] Create subfolder inside root
- [ ] Edit folder name (root and child)
- [ ] Delete folder with no children
- [ ] Delete folder with children (cascade)
- [ ] Move folder up
- [ ] Move folder down
- [ ] Collapse/expand sections
- [ ] AI generate folders for course
- [ ] Navigate into folder detail page
- [ ] Edit folder from detail page
- [ ] Delete folder from detail page

## Related Files

### Backend:
- `/app/api/folders/[folderId]/route.ts` - PATCH/DELETE folder
- `/app/api/courses/[courseId]/folders/route.ts` - GET/POST folders
- `/app/api/courses/[courseId]/generate-folders/route.ts` - AI generation
- `/lib/openai-course-generator.ts` - OpenAI integration

### Frontend:
- `/app/dashboard/courses/[courseId]/page.tsx` - Course page with folder tree
- `/app/dashboard/courses/[courseId]/folders/[folderId]/page.tsx` - Folder detail page

### Database:
- `/migrations/009_create_user_folders_table.sql` - Initial schema
- `/migrations/013_add_parent_folder_support.sql` - Hierarchy support
