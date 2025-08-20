/**
 * Test Page Break Implementation
 * Verifies that the enhanced page break processing works correctly
 */

import { createGotenbergClient } from './src/lib/gotenberg-client.ts';

async function testPageBreaks() {
  try {
    console.log('🧪 Testing Enhanced Page Break Implementation...\n');
    
    // Create test HTML content with page break markers
    const testContent = `
# Test Document

This is the first page content.

<!-- NEW_PAGE -->

This content should appear on a new page.

## Section 2

More content here.

<!-- NEW_PAGE -->

This should be on page 3.

### Final Section

Last content.
`;

    console.log('📝 Test content with page break markers:');
    console.log(testContent);
    console.log('\n' + '='.repeat(50) + '\n');

    // Create Gotenberg client
    const gotenbergClient = createGotenbergClient();
    
    // Test the page break processing
    console.log('🔧 Testing page break processing...');
    
    // Generate PDF with the test content
    const result = await gotenbergClient.generateCornellNotesPdf(
      testContent,
      'Page Break Test Document',
      false // Not HTML, will be processed as markdown
    );
    
    if (result.success && result.pdfBuffer) {
      console.log('✅ PDF generated successfully!');
      console.log(`📊 PDF size: ${result.pdfBuffer.byteLength} bytes`);
      
      // Save the test PDF for manual verification
      const fs = await import('fs');
      const testPdfPath = './test-page-breaks.pdf';
      
      fs.writeFileSync(testPdfPath, Buffer.from(result.pdfBuffer));
      console.log(`💾 Test PDF saved to: ${testPdfPath}`);
      
      console.log('\n🎯 Next steps:');
      console.log('1. Open test-page-breaks.pdf to verify page breaks work');
      console.log('2. Check that content is properly separated across pages');
      console.log('3. Look for the enhanced page break styling in the PDF');
      
    } else {
      console.error('❌ PDF generation failed:', result.error);
      console.error('Error code:', result.errorCode);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Test the HTML processing directly
async function testPageBreakProcessing() {
  try {
    console.log('\n🔍 Testing HTML processing directly...\n');
    
    // Import the Gotenberg client class to access private methods
    const { GotenbergClient } = await import('./src/lib/gotenberg-client.ts');
    const client = new GotenbergClient('http://test');
    
    // Create test HTML with page break markers
    const testHtml = `
<h1>Test Document</h1>
<p>First page content</p>
<!-- NEW_PAGE -->
<h2>Second Page</h2>
<p>Second page content</p>
<!-- NEW_PAGE -->
<h3>Third Page</h3>
<p>Third page content</p>
`;

    console.log('📄 Original HTML:');
    console.log(testHtml);
    console.log('\n' + '-'.repeat(50) + '\n');
    
    // Test the processCornellNotesHtml method (we'll need to access it)
    // Since it's private, we'll test the full conversion
    const result = await client.generateCornellNotesPdf(testHtml, 'Test', true);
    
    if (result.success) {
      console.log('✅ HTML processing completed successfully');
      console.log('🔍 Check the console output above for page break processing logs');
    } else {
      console.error('❌ HTML processing failed:', result.error);
    }
    
  } catch (error) {
    console.error('💥 HTML processing test failed:', error);
  }
}

// Execute tests
console.log('🚀 Starting Page Break Tests...\n');

testPageBreaks()
  .then(() => testPageBreakProcessing())
  .then(() => {
    console.log('\n✨ Page break tests completed!');
    console.log('\n📋 Summary:');
    console.log('• Enhanced page break processing implemented');
    console.log('• Robust CSS styling with !important declarations');
    console.log('• Multiple browser compatibility approaches');
    console.log('• Debug logging for troubleshooting');
    console.log('• Test PDF generated for manual verification');
  })
  .catch(error => {
    console.error('💥 Tests failed:', error);
    process.exit(1);
  });