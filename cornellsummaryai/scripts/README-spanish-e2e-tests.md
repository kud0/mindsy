# Spanish Site End-to-End Testing

This directory contains test scripts for validating the Spanish site workflow implementation.

## Main Test Script

### `test-spanish-e2e-workflow.js`

This comprehensive end-to-end test script validates the complete Spanish user workflow including:
- File upload functionality
- Processing status updates with Spanish translations
- Download functionality with Spanish labels
- Error handling scenarios with Spanish messages
- Feature parity with English site

#### Requirements Tested
- 1.1: Spanish site uses the same `/api/generate` endpoint as the English version
- 2.1: Spanish site displays processing status with progress indicators
- 3.1: Spanish site maintains Spanish translations for all UI elements
- 4.1: Spanish site uses the same backend logic as the English site

#### Test Suites
1. **API Integration**: Verifies the Spanish site uses the correct API endpoint and request/response format
2. **Processing Status UI**: Checks for proper implementation of processing status indicators
3. **Spanish Translations**: Validates that all UI text is properly translated to Spanish
4. **Download Functionality**: Tests the PDF download functionality with Spanish labels
5. **Feature Parity**: Compares the Spanish site with the English site for feature completeness
6. **Form Reset**: Validates form reset and state management functionality
7. **Error Handling**: Tests various error scenarios and their Spanish messages
8. **Translation Content**: Verifies the content of Spanish translations
9. **Translation System**: Checks integration with the translation system
10. **Browser-Based Testing**: Performs live browser tests of the Spanish site workflow

#### Running the Tests

To run the static code analysis tests:
```bash
node scripts/test-spanish-e2e-workflow.js
```

To run the complete test suite including browser-based tests:
1. Start the development server:
```bash
npm run dev
```

2. In another terminal, run the test script:
```bash
node scripts/test-spanish-e2e-workflow.js
```

#### Dependencies
- Node.js
- Puppeteer (for browser-based tests)

## Additional Test Scripts

### `test-spanish-api-integration.js`
Tests the Spanish dashboard API integration with the `/api/generate` endpoint.

### `test-spanish-download-functionality.js`
Tests the download functionality with Spanish labels and error messages.

### `test-spanish-form-reset.js`
Tests the form reset and UI state management in the Spanish site.

### `test-spanish-form-error-handling.js`
Tests error handling scenarios with Spanish error messages.

### `test-spanish-progress-updates.js`
Tests real-time progress updates during processing with Spanish labels.

### `test-spanish-translations.js`
Tests Spanish translations for all UI elements.

### `test-spanish-download-e2e.js`
Tests the end-to-end download workflow in the Spanish site.

## Running All Tests

To run all Spanish site tests:
```bash
npm run test:spanish
```

This will execute all the Spanish site test scripts and report the results.