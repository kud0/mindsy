# UI Download End-to-End Testing Documentation

## Overview

This document provides detailed information about the end-to-end tests for the UI download functionality. These tests verify that the UI displays job information correctly, the download functionality works with different job statuses, and error messages are displayed properly.

## Test Coverage

The end-to-end tests cover the following requirements:

### UI Display Requirements (1.1, 1.2, 1.3)
- Verify that no file paths are displayed in the UI
- Check that NULL values are not shown to users
- Ensure only relevant information is displayed to users

### Download Functionality Requirements (2.1, 2.2, 2.3, 2.4)
- Test that the download API successfully retrieves jobs from the database
- Verify that the API handles multiple jobs with the same ID gracefully
- Check that appropriate error messages are returned when no job exists
- Ensure PDF files are properly streamed to the user's browser

### Error Handling Requirements (3.1, 3.2, 3.3, 3.4)
- Verify that detailed error information is logged
- Check that 404 status codes are returned for non-existent jobs
- Test error messages when jobs have no output file
- Verify fallback storage options are attempted before failing

## Test Scripts

### 1. UI Download End-to-End Test (`test-ui-download-e2e.js`)

This script performs comprehensive testing of the UI display and download functionality:

#### UI Display Tests
- Checks the dashboard page for file paths in job listings
- Verifies that NULL values are not displayed
- Ensures only relevant information (title, status, etc.) is shown

#### Download Functionality Tests
- Tests downloading completed jobs (should succeed)
- Tests downloading processing jobs (should fail with appropriate error)
- Tests downloading failed jobs (should fail with appropriate error)
- Tests downloading non-existent jobs (should return 404)

#### Error Message Tests
- Verifies error messages for job not found are clear and helpful
- Checks error messages for jobs not ready for download
- Tests error messages when a job has no output file

### 2. Server Check Script (`check-server.js`)

This utility script verifies that the server is running before executing the end-to-end tests.

## Running the Tests

### Prerequisites

1. Ensure the application is running locally:
   ```bash
   npm run dev
   ```

2. Make sure the following environment variables are set in your `.env` file:
   ```
   # Test User Credentials
   TEST_USER_EMAIL=test@example.com
   TEST_USER_PASSWORD=TestPassword123!
   API_BASE_URL=http://localhost:3000
   ```

### Running All Tests

To run the complete UI download end-to-end test suite:

```bash
npm run test-ui-download
```

This command will:
1. Check if the server is running
2. Run the UI download end-to-end tests
3. Display a detailed test summary

### Running Individual Tests

To check if the server is running:

```bash
npm run check-server
```

To run only the UI download tests (assuming the server is already running):

```bash
node --experimental-modules scripts/test-ui-download-e2e.js
```

## Test Results

The test script outputs a detailed summary of all tests run, including:
- Whether each test passed or failed
- Details about why a test failed or was skipped
- A final summary indicating if all tests passed

Example output:

```
=== Test Summary ===

UI Display Tests:
✓ PASS No File Paths: No file paths found in the UI
✓ PASS No Null Values: No NULL values found in the UI
✓ PASS Relevant Info Only: Only relevant information is displayed

Download Functionality Tests:
✓ PASS Completed Job: Successfully downloaded PDF
✓ PASS Processing Job: Correctly rejected with status 400
✓ PASS Failed Job: Correctly rejected with status 400
✓ PASS Nonexistent Job: Correctly returned 404

Error Messages Tests:
✓ PASS Job Not Found: Clear error message provided
✓ PASS Job Not Ready: Clear error message provided
✓ PASS No Output File: Clear error message provided

All end-to-end tests passed!
```

## Troubleshooting

If tests are failing, check the following:

1. **Server not running**: Ensure the application is running locally or the `API_BASE_URL` is set correctly
2. **Authentication issues**: Verify that the test user credentials are correct
3. **No test data**: Ensure the test user has access to jobs with various statuses
4. **Environment variables**: Check that all required environment variables are set
5. **Network issues**: Verify that the API endpoints are accessible

## Extending the Tests

To add new tests:

1. Add new test cases to the appropriate test function in `test-ui-download-e2e.js`
2. Update the test results tracking object with the new test case
3. Add the test case to the test summary output

## Continuous Integration

These tests can be integrated into a CI/CD pipeline by:

1. Setting up the required environment variables in the CI environment
2. Starting the server in the CI environment
3. Running the tests with `npm run test-ui-download`
4. Using the exit code to determine if the tests passed or failed