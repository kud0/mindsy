# UI Download End-to-End Tests

This directory contains test scripts for verifying the UI download functionality.

## Test Scripts

### `test-ui-download-e2e.js`

This script performs end-to-end testing of the UI display and download functionality:

1. **UI Display Tests**:
   - Verifies that no file paths are displayed in the UI
   - Checks that NULL values are not shown to users
   - Ensures only relevant information is displayed

2. **Download Functionality Tests**:
   - Tests downloading a completed job (should succeed)
   - Tests downloading a processing job (should fail with appropriate error)
   - Tests downloading a failed job (should fail with appropriate error)
   - Tests downloading a non-existent job (should return 404)

3. **Error Message Tests**:
   - Verifies that error messages for job not found are clear and helpful
   - Checks that error messages for jobs not ready for download are informative
   - Tests error messages when a job has no output file

## Running the Tests

To run the UI download end-to-end tests:

```bash
npm run test-ui-download
```

## Environment Variables

The test script requires the following environment variables to be set:

- `PUBLIC_SUPABASE_URL`: The URL of your Supabase instance
- `PUBLIC_SUPABASE_ANON_KEY`: The anonymous key for your Supabase instance
- `SUPABASE_SERVICE_ROLE_KEY`: The service role key for your Supabase instance
- `TEST_USER_EMAIL`: Email for a test user account
- `TEST_USER_PASSWORD`: Password for the test user account
- `API_BASE_URL` (optional): Base URL for the API, defaults to http://localhost:3000

## Test Results

The test script will output a detailed summary of all tests run, including:
- Whether each test passed or failed
- Details about why a test failed or was skipped
- A final summary indicating if all tests passed

## Troubleshooting

If tests are failing, check the following:

1. Ensure the application is running locally or the `API_BASE_URL` is set correctly
2. Verify that the test user has access to jobs with various statuses
3. Check that the Supabase credentials are correct
4. Make sure the environment variables are properly set