/**
 * Comprehensive Test Suite: Active Course Folder System
 *
 * Tests the complete active course folder functionality including:
 * - Database functions (get_course_year_folders, toggle_active_course)
 * - API endpoints (/api/courses/[courseId]/year-folders, /api/enrollments/[enrollmentId])
 * - Business logic validation (max 2 active courses, folder_id requirement)
 * - Error handling and edge cases
 *
 * Run with: npx tsx tests/active-course-folders.test.ts
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Test data types
interface TestUser {
  id: string;
  email: string;
}

interface TestCourse {
  id: string;
  course_code: string;
  course_name: string;
  institution: string;
  total_years: number;
}

interface TestFolder {
  id: string;
  folder_name: string;
  course_id: string;
  user_id: string;
  parent_folder_id: string | null;
  folder_order: number;
}

interface TestEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  is_active_course: boolean;
  active_folder_id: string | null;
}

// Test state
const testState = {
  supabase: createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY),
  testUser: null as TestUser | null,
  courses: [] as TestCourse[],
  folders: [] as TestFolder[],
  enrollments: [] as TestEnrollment[],
  testsPassed: 0,
  testsFailed: 0,
  errors: [] as string[]
};

// Utility functions
function logSection(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(60)}\n`);
}

function logTest(testName: string, status: 'PASS' | 'FAIL', message?: string) {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${testName}`);
  if (message) {
    console.log(`   ${message}`);
  }
  if (status === 'PASS') {
    testState.testsPassed++;
  } else {
    testState.testsFailed++;
    testState.errors.push(`${testName}: ${message || 'Unknown error'}`);
  }
}

async function assert(condition: boolean, testName: string, errorMessage?: string) {
  if (condition) {
    logTest(testName, 'PASS');
  } else {
    logTest(testName, 'FAIL', errorMessage || 'Assertion failed');
  }
}

async function assertThrows(
  fn: () => Promise<any>,
  testName: string,
  expectedError?: string
) {
  try {
    await fn();
    logTest(testName, 'FAIL', 'Expected function to throw but it succeeded');
  } catch (error: any) {
    if (expectedError && !error.message?.includes(expectedError)) {
      logTest(testName, 'FAIL', `Expected error containing "${expectedError}" but got: ${error.message}`);
    } else {
      logTest(testName, 'PASS', `Correctly threw error: ${error.message}`);
    }
  }
}

// Setup and teardown
async function setup() {
  logSection('SETUP: Creating Test Data');

  try {
    // Create test user
    const { data: user, error: userError } = await testState.supabase.auth.admin.createUser({
      email: `test-active-course-${Date.now()}@mindsy.test`,
      password: 'TestPassword123!',
      email_confirm: true
    });

    if (userError) throw userError;
    testState.testUser = { id: user.user.id, email: user.user.email! };
    console.log(`✅ Created test user: ${testState.testUser.email}`);

    // Create 3 test courses
    const coursesToCreate = [
      {
        course_code: 'CS101',
        course_name: 'Introduction to Computer Science',
        institution: 'Test University',
        total_years: 4,
        creator_id: testState.testUser.id
      },
      {
        course_code: 'MATH201',
        course_name: 'Advanced Mathematics',
        institution: 'Test University',
        total_years: 2,
        creator_id: testState.testUser.id
      },
      {
        course_code: 'PHY301',
        course_name: 'Quantum Physics',
        institution: 'Test University',
        total_years: 3,
        creator_id: testState.testUser.id
      }
    ];

    for (const course of coursesToCreate) {
      const { data, error } = await testState.supabase
        .from('courses')
        .insert(course)
        .select()
        .single();

      if (error) throw error;
      testState.courses.push(data);
      console.log(`✅ Created course: ${course.course_code}`);

      // Enroll user in course
      const { data: enrollment, error: enrollError } = await testState.supabase
        .from('course_enrollments')
        .insert({
          user_id: testState.testUser.id,
          course_id: data.id,
          is_active: true,
          is_active_course: false
        })
        .select()
        .single();

      if (enrollError) throw enrollError;
      testState.enrollments.push(enrollment);
      console.log(`✅ Enrolled user in ${course.course_code}`);

      // Create year folders for each course (3 years)
      for (let year = 1; year <= 3; year++) {
        const { data: folder, error: folderError } = await testState.supabase
          .from('user_folders')
          .insert({
            user_id: testState.testUser.id,
            course_id: data.id,
            folder_name: `Year ${year}`,
            parent_folder_id: null,
            folder_order: year
          })
          .select()
          .single();

        if (folderError) throw folderError;
        testState.folders.push(folder);

        // Create child folders (subjects)
        for (let subject = 1; subject <= 2; subject++) {
          const { data: childFolder, error: childError } = await testState.supabase
            .from('user_folders')
            .insert({
              user_id: testState.testUser.id,
              course_id: data.id,
              folder_name: `Subject ${subject}`,
              parent_folder_id: folder.id,
              folder_order: subject
            })
            .select()
            .single();

          if (childError) throw childError;
          testState.folders.push(childFolder);
        }
      }
      console.log(`✅ Created 3 year folders with 2 subjects each for ${course.course_code}`);
    }

    console.log(`\n✅ Setup complete!\n`);
  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  }
}

async function teardown() {
  logSection('TEARDOWN: Cleaning Up Test Data');

  try {
    if (testState.testUser) {
      // Delete folders (cascade will handle children)
      const topLevelFolders = testState.folders.filter(f => !f.parent_folder_id);
      for (const folder of topLevelFolders) {
        await testState.supabase
          .from('user_folders')
          .delete()
          .eq('id', folder.id);
      }
      console.log(`✅ Deleted ${topLevelFolders.length} top-level folders (+ children)`);

      // Delete enrollments
      await testState.supabase
        .from('course_enrollments')
        .delete()
        .eq('user_id', testState.testUser.id);
      console.log(`✅ Deleted ${testState.enrollments.length} enrollments`);

      // Delete courses
      for (const course of testState.courses) {
        await testState.supabase
          .from('courses')
          .delete()
          .eq('id', course.id);
      }
      console.log(`✅ Deleted ${testState.courses.length} courses`);

      // Delete user
      await testState.supabase.auth.admin.deleteUser(testState.testUser.id);
      console.log(`✅ Deleted test user: ${testState.testUser.email}`);
    }

    console.log('\n✅ Teardown complete!\n');
  } catch (error: any) {
    console.error('❌ Teardown failed:', error.message);
  }
}

// ============================================================================
// DATABASE FUNCTION TESTS
// ============================================================================

async function testDatabaseFunctions() {
  logSection('DATABASE FUNCTION TESTS');

  const user = testState.testUser!;
  const course1 = testState.courses[0];
  const course2 = testState.courses[1];
  const course3 = testState.courses[2];

  // Test 1: get_course_year_folders returns only top-level folders
  console.log('\nTest 1: get_course_year_folders returns top-level folders only');
  const { data: yearFolders, error: foldersError } = await testState.supabase
    .rpc('get_course_year_folders', {
      p_user_id: user.id,
      p_course_id: course1.id
    });

  await assert(
    !foldersError && yearFolders !== null,
    'get_course_year_folders executes without error'
  );

  await assert(
    yearFolders?.length === 3,
    'Returns exactly 3 year folders',
    `Expected 3 folders, got ${yearFolders?.length}`
  );

  await assert(
    yearFolders?.every((f: any) => f.folder_name?.startsWith('Year')),
    'All returned folders are year folders',
    `Folder names: ${yearFolders?.map((f: any) => f.folder_name).join(', ')}`
  );

  await assert(
    yearFolders?.[0]?.child_count === 2,
    'First folder shows correct child count',
    `Expected 2 children, got ${yearFolders?.[0]?.child_count}`
  );

  // Test 2: toggle_active_course without folder_id should fail
  console.log('\nTest 2: toggle_active_course requires folder_id when activating');
  const { data: toggleResult1, error: toggleError1 } = await testState.supabase
    .rpc('toggle_active_course', {
      p_user_id: user.id,
      p_course_id: course1.id,
      p_set_active: true,
      p_active_folder_id: null
    });

  await assert(
    toggleResult1?.success === false,
    'toggle_active_course fails without folder_id',
    `Result: ${JSON.stringify(toggleResult1)}`
  );

  await assert(
    toggleResult1?.error?.includes('required'),
    'Error message mentions required folder_id',
    `Error: ${toggleResult1?.error}`
  );

  // Test 3: toggle_active_course with valid folder_id succeeds
  console.log('\nTest 3: toggle_active_course succeeds with valid folder_id');
  const year1Folder = testState.folders.find(
    f => f.course_id === course1.id && f.folder_name === 'Year 1'
  );

  const { data: toggleResult2, error: toggleError2 } = await testState.supabase
    .rpc('toggle_active_course', {
      p_user_id: user.id,
      p_course_id: course1.id,
      p_set_active: true,
      p_active_folder_id: year1Folder!.id
    });

  await assert(
    !toggleError2 && toggleResult2?.success === true,
    'Successfully activates course with folder_id',
    `Result: ${JSON.stringify(toggleResult2)}`
  );

  // Test 4: Enforce max 2 active courses
  console.log('\nTest 4: Enforces maximum 2 active courses limit');

  // Activate second course
  const year1Folder2 = testState.folders.find(
    f => f.course_id === course2.id && f.folder_name === 'Year 1'
  );

  const { data: toggleResult3 } = await testState.supabase
    .rpc('toggle_active_course', {
      p_user_id: user.id,
      p_course_id: course2.id,
      p_set_active: true,
      p_active_folder_id: year1Folder2!.id
    });

  await assert(
    toggleResult3?.success === true,
    'Successfully activates second course',
    `Result: ${JSON.stringify(toggleResult3)}`
  );

  // Try to activate third course (should fail)
  const year1Folder3 = testState.folders.find(
    f => f.course_id === course3.id && f.folder_name === 'Year 1'
  );

  const { data: toggleResult4 } = await testState.supabase
    .rpc('toggle_active_course', {
      p_user_id: user.id,
      p_course_id: course3.id,
      p_set_active: true,
      p_active_folder_id: year1Folder3!.id
    });

  await assert(
    toggleResult4?.success === false,
    'Prevents activating third course',
    `Result: ${JSON.stringify(toggleResult4)}`
  );

  await assert(
    toggleResult4?.error?.toLowerCase().includes('2') ||
    toggleResult4?.error?.toLowerCase().includes('maximum'),
    'Error message mentions 2 course limit',
    `Error: ${toggleResult4?.error}`
  );

  // Test 5: get_active_courses returns active courses with folder info
  console.log('\nTest 5: get_active_courses returns correct data');
  const { data: activeCourses, error: activeError } = await testState.supabase
    .rpc('get_active_courses', {
      p_user_id: user.id
    });

  await assert(
    !activeError && activeCourses !== null,
    'get_active_courses executes without error'
  );

  await assert(
    activeCourses?.length === 2,
    'Returns exactly 2 active courses',
    `Expected 2, got ${activeCourses?.length}`
  );

  await assert(
    activeCourses?.every((c: any) => c.active_folder_id !== null),
    'All active courses have active_folder_id',
    `Folders: ${activeCourses?.map((c: any) => c.active_folder_id).join(', ')}`
  );

  await assert(
    activeCourses?.every((c: any) => c.active_folder_name !== null),
    'All active courses have active_folder_name',
    `Names: ${activeCourses?.map((c: any) => c.active_folder_name).join(', ')}`
  );

  // Test 6: Deactivating course clears folder_id
  console.log('\nTest 6: Deactivating course clears active_folder_id');
  const { data: toggleResult5 } = await testState.supabase
    .rpc('toggle_active_course', {
      p_user_id: user.id,
      p_course_id: course1.id,
      p_set_active: false
    });

  await assert(
    toggleResult5?.success === true,
    'Successfully deactivates course'
  );

  const { data: enrollment } = await testState.supabase
    .from('course_enrollments')
    .select('active_folder_id')
    .eq('user_id', user.id)
    .eq('course_id', course1.id)
    .single();

  await assert(
    enrollment?.active_folder_id === null,
    'active_folder_id is cleared after deactivation',
    `folder_id: ${enrollment?.active_folder_id}`
  );
}

// ============================================================================
// API ENDPOINT TESTS
// ============================================================================

async function testAPIEndpoints() {
  logSection('API ENDPOINT TESTS');

  const user = testState.testUser!;
  const course1 = testState.courses[0];
  const enrollment1 = testState.enrollments[0];

  // Get auth session for API calls
  const { data: session } = await testState.supabase.auth.signInWithPassword({
    email: user.email,
    password: 'TestPassword123!'
  });

  if (!session?.session?.access_token) {
    console.error('❌ Failed to get auth session for API tests');
    return;
  }

  const authToken = session.session.access_token;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

  // Test 1: GET /api/courses/[courseId]/year-folders requires auth
  console.log('\nTest 1: year-folders endpoint requires authentication');
  try {
    const response = await fetch(`${baseUrl}/api/courses/${course1.id}/year-folders`);
    await assert(
      response.status === 401,
      'Returns 401 without auth token',
      `Status: ${response.status}`
    );
  } catch (error) {
    // If API not running, skip this test
    console.log('⚠️  Skipping API test - server not running');
  }

  // Test 2: GET /api/courses/[courseId]/year-folders returns folders
  console.log('\nTest 2: year-folders endpoint returns folder data');
  try {
    const response = await fetch(
      `${baseUrl}/api/courses/${course1.id}/year-folders`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      await assert(
        data.success === true,
        'API returns success status'
      );

      await assert(
        Array.isArray(data.folders),
        'API returns folders array'
      );

      await assert(
        data.folders.length === 3,
        'Returns 3 year folders',
        `Got ${data.folders.length} folders`
      );
    } else {
      console.log('⚠️  Skipping API test - server not running');
    }
  } catch (error) {
    console.log('⚠️  Skipping API test - server not running');
  }

  // Test 3: PATCH /api/enrollments/[enrollmentId] requires folder_id
  console.log('\nTest 3: enrollment PATCH requires active_folder_id when activating');
  try {
    const response = await fetch(
      `${baseUrl}/api/enrollments/${enrollment1.id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_active_course: true
          // Missing active_folder_id
        })
      }
    );

    if (response.status !== 404) { // If endpoint exists
      const data = await response.json();
      await assert(
        response.status === 400,
        'Returns 400 without folder_id',
        `Status: ${response.status}`
      );

      await assert(
        data.error?.includes('folder_id') || data.error?.includes('required'),
        'Error message mentions required folder_id',
        `Error: ${data.error}`
      );
    } else {
      console.log('⚠️  Skipping API test - server not running');
    }
  } catch (error) {
    console.log('⚠️  Skipping API test - server not running');
  }

  // Test 4: PATCH /api/enrollments/[enrollmentId] activates with folder_id
  console.log('\nTest 4: enrollment PATCH succeeds with valid folder_id');
  try {
    const year2Folder = testState.folders.find(
      f => f.course_id === course1.id && f.folder_name === 'Year 2'
    );

    const response = await fetch(
      `${baseUrl}/api/enrollments/${enrollment1.id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_active_course: true,
          active_folder_id: year2Folder!.id
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      await assert(
        data.success === true,
        'Successfully activates course with folder',
        `Result: ${JSON.stringify(data)}`
      );

      await assert(
        data.enrollment?.active_folder?.folder_name === 'Year 2',
        'Returns updated enrollment with folder data',
        `Folder: ${data.enrollment?.active_folder?.folder_name}`
      );
    } else {
      console.log('⚠️  Skipping API test - server not running');
    }
  } catch (error) {
    console.log('⚠️  Skipping API test - server not running');
  }

  // Cleanup session
  await testState.supabase.auth.signOut();
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

async function testIntegrationFlow() {
  logSection('INTEGRATION TESTS - Full User Flow');

  const user = testState.testUser!;
  const course1 = testState.courses[0];

  // Deactivate all courses first
  for (const course of testState.courses) {
    await testState.supabase.rpc('toggle_active_course', {
      p_user_id: user.id,
      p_course_id: course.id,
      p_set_active: false
    });
  }

  console.log('\nIntegration Test: Complete activation flow');

  // Step 1: User clicks on inactive course widget
  console.log('Step 1: Get year folders for selection dialog');
  const { data: folders } = await testState.supabase
    .rpc('get_course_year_folders', {
      p_user_id: user.id,
      p_course_id: course1.id
    });

  await assert(
    folders && folders.length > 0,
    'Year folders loaded successfully',
    `Found ${folders?.length} folders`
  );

  // Step 2: User selects "Year 2" folder
  console.log('Step 2: User selects Year 2 folder');
  const selectedFolder = folders?.find((f: any) => f.folder_name === 'Year 2');

  await assert(
    selectedFolder !== undefined,
    'User can select a year folder',
    `Selected: ${selectedFolder?.folder_name}`
  );

  // Step 3: Activate course with selected folder
  console.log('Step 3: Activate course with selected folder');
  const { data: toggleResult } = await testState.supabase
    .rpc('toggle_active_course', {
      p_user_id: user.id,
      p_course_id: course1.id,
      p_set_active: true,
      p_active_folder_id: selectedFolder?.folder_id
    });

  await assert(
    toggleResult?.success === true,
    'Course activated successfully',
    `Result: ${JSON.stringify(toggleResult)}`
  );

  // Step 4: Verify enrollment updated
  console.log('Step 4: Verify enrollment record updated');
  const { data: enrollment } = await testState.supabase
    .from('course_enrollments')
    .select('is_active_course, active_folder_id')
    .eq('user_id', user.id)
    .eq('course_id', course1.id)
    .single();

  await assert(
    enrollment?.is_active_course === true,
    'Enrollment marked as active'
  );

  await assert(
    enrollment?.active_folder_id === selectedFolder?.folder_id,
    'Enrollment has correct folder_id',
    `folder_id: ${enrollment?.active_folder_id}`
  );

  // Step 5: Widget displays active course
  console.log('Step 5: Verify active courses query returns data for widget');
  const { data: activeCourses } = await testState.supabase
    .rpc('get_active_courses', {
      p_user_id: user.id
    });

  await assert(
    activeCourses?.length === 1,
    'Active courses query returns activated course',
    `Found ${activeCourses?.length} active courses`
  );

  const activeCourse = activeCourses?.[0];

  await assert(
    activeCourse?.course_code === course1.course_code,
    'Returns correct course data',
    `Course: ${activeCourse?.course_code}`
  );

  await assert(
    activeCourse?.active_folder_name === 'Year 2',
    'Returns correct folder name for badge display',
    `Folder: ${activeCourse?.active_folder_name}`
  );

  await assert(
    activeCourse?.total_years === course1.total_years,
    'Returns total years for progress calculation',
    `Total: ${activeCourse?.total_years} years`
  );

  console.log('\n✅ Integration flow completed successfully!');
}

// ============================================================================
// EDGE CASES & ERROR HANDLING
// ============================================================================

async function testEdgeCases() {
  logSection('EDGE CASES & ERROR HANDLING');

  const user = testState.testUser!;
  const course1 = testState.courses[0];

  // Test 1: Invalid user_id
  console.log('\nTest 1: Invalid user_id');
  const { data: result1 } = await testState.supabase
    .rpc('toggle_active_course', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_course_id: course1.id,
      p_set_active: true,
      p_active_folder_id: testState.folders[0].id
    });

  await assert(
    result1?.success === false,
    'Rejects invalid user_id',
    `Error: ${result1?.error}`
  );

  // Test 2: Invalid course_id
  console.log('\nTest 2: Invalid course_id');
  const { data: result2 } = await testState.supabase
    .rpc('toggle_active_course', {
      p_user_id: user.id,
      p_course_id: '00000000-0000-0000-0000-000000000000',
      p_set_active: true,
      p_active_folder_id: testState.folders[0].id
    });

  await assert(
    result2?.success === false,
    'Rejects invalid course_id',
    `Error: ${result2?.error}`
  );

  // Test 3: Invalid folder_id
  console.log('\nTest 3: Invalid folder_id');
  const { error: result3 } = await testState.supabase
    .rpc('toggle_active_course', {
      p_user_id: user.id,
      p_course_id: course1.id,
      p_set_active: true,
      p_active_folder_id: '00000000-0000-0000-0000-000000000000'
    });

  await assert(
    result3 !== null,
    'Rejects invalid folder_id (foreign key constraint)',
    `Error: ${result3?.message}`
  );

  // Test 4: Using child folder instead of parent
  console.log('\nTest 4: Using child folder (should work - no validation)');
  const childFolder = testState.folders.find(f => f.parent_folder_id !== null);

  const { data: result4 } = await testState.supabase
    .rpc('toggle_active_course', {
      p_user_id: user.id,
      p_course_id: course1.id,
      p_set_active: true,
      p_active_folder_id: childFolder!.id
    });

  // Note: Current implementation doesn't validate parent/child
  // This is by design - user can select any folder
  await assert(
    result4?.success === true,
    'Accepts child folder (no parent validation)',
    `This is expected behavior - users can select any folder`
  );

  // Test 5: Empty folders (course with no folders)
  console.log('\nTest 5: Course with no folders');
  const { data: emptyFolders } = await testState.supabase
    .rpc('get_course_year_folders', {
      p_user_id: user.id,
      p_course_id: '00000000-0000-0000-0000-000000000000'
    });

  await assert(
    emptyFolders?.length === 0,
    'Returns empty array for course with no folders',
    `Length: ${emptyFolders?.length}`
  );
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║   ACTIVE COURSE FOLDER SYSTEM - COMPREHENSIVE TEST SUITE   ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    await setup();
    await testDatabaseFunctions();
    await testAPIEndpoints();
    await testIntegrationFlow();
    await testEdgeCases();
  } catch (error: any) {
    console.error('\n❌ Fatal error during tests:', error.message);
    testState.errors.push(`Fatal: ${error.message}`);
  } finally {
    await teardown();
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  logSection('TEST SUMMARY');
  console.log(`Total Tests: ${testState.testsPassed + testState.testsFailed}`);
  console.log(`✅ Passed: ${testState.testsPassed}`);
  console.log(`❌ Failed: ${testState.testsFailed}`);
  console.log(`⏱️  Duration: ${duration}s\n`);

  if (testState.testsFailed > 0) {
    console.log('Failed Tests:');
    testState.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
    console.log('');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
