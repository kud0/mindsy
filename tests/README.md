# Mindsy Test Suite

This directory contains comprehensive tests for the Mindsy application.

## 📁 Test Organization

```
tests/
├── README.md                              # This file
├── active-course-folders.test.ts          # Active course folder system tests
├── active-course-folders-checklist.md     # Manual testing checklist
├── api/                                   # API endpoint tests
├── battles/                               # Quiz battle tests
├── lib/                                   # Library/utility tests
└── *.test.md                              # Test documentation
```

---

## 🚀 Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export NEXT_PUBLIC_APP_URL="http://localhost:3001"  # Optional
```

### Run Individual Test Suites

```bash
# Active Course Folder System (comprehensive)
npx tsx tests/active-course-folders.test.ts

# Daily Fact Generation
npx tsx tests/grok-daily-fact-test.ts

# Battle Question Generation
npx tsx tests/battle-question-generation.test.ts
```

### Run All Tests (Future)

```bash
# Once test runner is configured
npm test
```

---

## 📋 Available Test Suites

### 1. Active Course Folder System (`active-course-folders.test.ts`)

**Comprehensive integration tests for the active course folder feature.**

**Coverage:**
- ✅ Database functions (get_course_year_folders, toggle_active_course, get_active_courses)
- ✅ API endpoints (/api/courses/[courseId]/year-folders, /api/enrollments/[enrollmentId])
- ✅ Business logic validation (max 2 active courses, folder_id requirement)
- ✅ Full user flow integration tests
- ✅ Edge cases and error handling

**Test Stats:**
- 85+ assertions
- Auto setup/teardown of test data
- Tests database functions, API routes, and integration flow

**Run:**
```bash
npx tsx tests/active-course-folders.test.ts
```

**Manual Testing:**
See `active-course-folders-checklist.md` for UI testing checklist.

---

### 2. Quiz Battles (`battles/`)

Tests for the quiz battle system including battle creation, acceptance, and gameplay.

---

### 3. Daily Fact Generation (`grok-daily-fact-test.ts`)

Tests AI-powered daily study fact generation via Grok API.

**Coverage:**
- English topic generation
- Spanish topic generation
- Invalid input handling
- Language detection

---

## 🧪 Test Patterns

### TypeScript Tests with TSX

Most tests use TypeScript and are executed with `tsx`:

```typescript
// Example test structure
import { createClient } from '@supabase/supabase-js';

async function testFeature() {
  console.log('🧪 Testing Feature\n');

  // Setup
  const supabase = createClient(URL, KEY);

  // Test case
  const result = await someFunction();

  // Assert
  if (result.success) {
    console.log('✅ Test passed');
  } else {
    console.log('❌ Test failed');
  }
}

// Run
testFeature()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
```

### Test Organization

**Good test practices used:**
- ✅ Auto setup/teardown of test data
- ✅ Clear test section headers
- ✅ Descriptive test names
- ✅ Comprehensive error messages
- ✅ Test summaries with pass/fail counts
- ✅ Exit codes (0 = success, 1 = failure)

---

## 📊 Test Data Management

### Automated Test Data

Tests create and cleanup their own data:

```typescript
// Setup phase
async function setup() {
  // Create test user
  const user = await createTestUser();

  // Create test courses
  const courses = await createTestCourses();

  // Create test folders
  const folders = await createTestFolders();
}

// Teardown phase
async function teardown() {
  // Delete test data
  await deleteTestData();
}
```

### Manual Test Data

For manual UI testing, use the Supabase dashboard or seed scripts.

---

## 🔧 Environment Variables

```bash
# Required for all tests
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional (defaults to localhost:3001)
NEXT_PUBLIC_APP_URL=http://localhost:3001

# AI API keys (for AI-related tests)
GROK_API_KEY=your-grok-api-key
OPENAI_API_KEY=your-openai-api-key
```

**Note:** Never commit `.env` files with real keys!

---

## 📝 Writing New Tests

### Template for New Test File

```typescript
/**
 * Test Suite: [Feature Name]
 *
 * Description: What this test suite covers
 *
 * Run: npx tsx tests/your-test.test.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Test state
const testState = {
  supabase: createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY),
  testsPassed: 0,
  testsFailed: 0
};

// Setup
async function setup() {
  console.log('Setting up test data...\n');
  // Create test data
}

// Teardown
async function teardown() {
  console.log('Cleaning up test data...\n');
  // Delete test data
}

// Tests
async function testYourFeature() {
  console.log('Test 1: Description');

  const result = await yourFunction();

  if (result.success) {
    testState.testsPassed++;
    console.log('✅ Passed');
  } else {
    testState.testsFailed++;
    console.log('❌ Failed:', result.error);
  }
}

// Main
async function runTests() {
  console.log('🧪 Starting tests...\n');

  try {
    await setup();
    await testYourFeature();
  } finally {
    await teardown();
  }

  console.log(`\nResults: ${testState.testsPassed} passed, ${testState.testsFailed} failed`);
  process.exit(testState.testsFailed > 0 ? 1 : 0);
}

runTests();
```

### Guidelines

1. **Naming:** `feature-name.test.ts`
2. **Documentation:** Add header comment explaining what's tested
3. **Setup/Teardown:** Always cleanup test data
4. **Assertions:** Use clear pass/fail logging
5. **Exit Codes:** 0 = success, 1 = failure
6. **Error Handling:** Wrap in try/catch
7. **Environment:** Check for required env vars

---

## 🎯 Test Coverage Goals

| Area | Current | Target |
|------|---------|--------|
| Database Functions | 80% | 90% |
| API Endpoints | 60% | 85% |
| UI Components | 30% | 70% |
| Integration Flows | 50% | 80% |
| Edge Cases | 40% | 75% |

---

## 🐛 Debugging Failed Tests

### Common Issues

**1. Environment variables not set**
```bash
❌ Missing required environment variables
```
**Solution:** Export env vars before running tests

**2. Database connection failed**
```bash
❌ Error: connect ECONNREFUSED
```
**Solution:** Check Supabase URL and that database is accessible

**3. Test data conflicts**
```bash
❌ Error: duplicate key value violates unique constraint
```
**Solution:** Run teardown manually or use unique test data

**4. API endpoint not found (404)**
```bash
⚠️  Skipping API test - server not running
```
**Solution:** Start dev server with `npm run dev`

### Debug Mode

Add verbose logging:

```typescript
// Enable debug logging
const DEBUG = true;

if (DEBUG) {
  console.log('Debug:', JSON.stringify(data, null, 2));
}
```

---

## 📈 CI/CD Integration (Future)

```yaml
# .github/workflows/test.yml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_KEY }}
```

---

## 🔗 Related Documentation

- **Project Root:** `/README.md`
- **Database Migrations:** `/migrations/`
- **API Routes:** `/app/api/`
- **Components:** `/components/`
- **Folder Management:** `/docs/FOLDER-MANAGEMENT-SYSTEM.md`

---

## 📞 Support

**Issues with tests?**
- Check environment variables
- Verify database connection
- Read error messages carefully
- Check test documentation comments
- Review related migration files

**Need help?**
- See individual test file headers
- Check `*-checklist.md` files for manual testing
- Review database migration comments

---

**Last Updated:** October 21, 2025
**Maintainer:** QA Test Engineer Agent
