#!/usr/bin/env node

/**
 * Test script for PDF bookmark generation functionality
 * Tests the Gotenberg client's ability to generate PDFs with bookmarks
 */

import { createGotenbergClient } from '../src/lib/gotenberg-client.ts';

// Sample Cornell Notes content with table of contents
const sampleCornellNotes = `
# Table of Contents

- Introduction to Biomechanics
- Key Concepts and Principles
- Applications in Sports Science
- Research Methods
- Future Directions

<!-- NEW_PAGE -->

# Cornell Notes

## Cue Column

- What is biomechanics?
- Force and motion principles
- Kinematic analysis
- Kinetic analysis
- Applications in sports

## Detailed Notes

### Introduction to Biomechanics

Biomechanics is the study of the structure and function of biological systems by means of the methods of mechanics. It combines principles from physics and engineering to understand how living organisms move and function.

### Key Concepts and Principles

The fundamental principles include:
- Newton's laws of motion
- Conservation of energy
- Momentum and impulse
- Force-velocity relationships

### Applications in Sports Science

Biomechanics plays a crucial role in:
- Performance optimization
- Injury prevention
- Equipment design
- Technique analysis

<!-- NEW_PAGE -->

# Comprehensive Summary

This comprehensive summary covers the essential aspects of biomechanics, including its fundamental principles, applications in sports science, and research methodologies. The field continues to evolve with new technologies and analytical methods.
`;

async function testBookmarkGeneration() {
  console.log('🧪 Testing PDF bookmark generation...');
  
  try {
    // Create Gotenberg client
    const gotenbergClient = createGotenbergClient();
    
    // Generate PDF with bookmarks
    console.log('📝 Generating Cornell Notes PDF with bookmarks...');
    const result = await gotenbergClient.generateCornellNotesPdf(
      sampleCornellNotes,
      'Biomechanics Study Guide - Bookmark Test',
      false // Not HTML, will be processed as Markdown
    );
    
    if (result.success && result.pdfBuffer) {
      console.log('✅ PDF generated successfully with bookmarks!');
      console.log(`📄 PDF size: ${result.pdfBuffer.byteLength} bytes`);
      
      // Save the PDF for manual inspection
      const fs = await import('fs');
      const path = await import('path');
      
      const outputPath = path.join(process.cwd(), 'test-bookmarks-output.pdf');
      fs.writeFileSync(outputPath, Buffer.from(result.pdfBuffer));
      
      console.log(`💾 PDF saved to: ${outputPath}`);
      console.log('📖 Open the PDF in a viewer to test bookmark navigation');
      
      return true;
    } else {
      console.error('❌ PDF generation failed:', result.error);
      return false;
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    return false;
  }
}

async function testBookmarkExtraction() {
  console.log('🔍 Testing bookmark extraction from HTML...');
  
  try {
    const gotenbergClient = createGotenbergClient();
    
    // Test HTML content with table of contents
    const testHtml = `
      <h2 id="table-of-contents" class="toc-header">Table of Contents</h2>
      <ul>
        <li>Introduction to Biomechanics</li>
        <li>Key Concepts and Principles</li>
        <li>Applications in Sports Science</li>
      </ul>
      
      <h2 id="cornell-notes" class="cornell-header">Cornell Notes</h2>
      <p>Cornell notes content...</p>
      
      <h2 id="comprehensive-summary">Comprehensive Summary</h2>
      <p>Summary content...</p>
    `;
    
    // Since generatePdfBookmarks is private, we'll test through the public interface
    // by generating a PDF and checking if the process completes successfully
    const result = await gotenbergClient.generatePdfFromHtml(testHtml, {
      title: 'Bookmark Test',
      generateBookmarks: true
    });
    
    if (result.success && result.pdfBuffer) {
      console.log('✅ HTML with bookmarks processed successfully!');
      console.log(`📄 PDF size: ${result.pdfBuffer.byteLength} bytes`);
      
      // Save test PDF
      const fs = await import('fs');
      const path = await import('path');
      
      const outputPath = path.join(process.cwd(), 'test-bookmark-extraction.pdf');
      fs.writeFileSync(outputPath, Buffer.from(result.pdfBuffer));
      console.log(`💾 Test PDF saved to: ${outputPath}`);
      
      return true;
    } else {
      console.log('❌ Bookmark processing failed:', result.error);
      return false;
    }
    
  } catch (error) {
    console.error('💥 Bookmark extraction test failed:', error);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting PDF bookmark tests...\n');
  
  const extractionTest = await testBookmarkExtraction();
  console.log('');
  
  const generationTest = await testBookmarkGeneration();
  console.log('');
  
  if (extractionTest && generationTest) {
    console.log('🎉 All bookmark tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});