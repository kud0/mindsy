#!/usr/bin/env node

/**
 * Test script for enhanced PDF generation with beautiful styling and title suggestions
 * This script demonstrates the new features added to the Gotenberg and OpenAI clients
 */

import { createGotenbergClient } from '../src/lib/gotenberg-client.ts';
import { generateTitleSuggestions, generateCornellNotesWithTitleSuggestions, convertMarkdownToHtml } from '../src/lib/openai-client.ts';
import fs from 'fs';
import path from 'path';

// Sample transcript for testing
const sampleTranscript = `
Today we're going to discuss the fundamentals of machine learning and how neural networks work.

Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions without being explicitly programmed for every task. There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning.

Supervised learning uses labeled data to train models. For example, if we want to classify emails as spam or not spam, we would train our model using a dataset of emails that are already labeled as spam or legitimate.

Neural networks are inspired by the human brain and consist of interconnected nodes called neurons. Each neuron receives inputs, processes them, and produces an output. The strength of connections between neurons is determined by weights, which are adjusted during training.

The training process involves feeding data through the network, comparing the output to the expected result, and adjusting the weights to minimize the error. This process is repeated many times until the network can make accurate predictions.

Deep learning is a subset of machine learning that uses neural networks with multiple hidden layers. These deep networks can learn complex patterns and representations from data, making them particularly effective for tasks like image recognition and natural language processing.
`;

const samplePdfText = `
Additional reading material:

Backpropagation Algorithm:
The backpropagation algorithm is used to train neural networks by calculating gradients and updating weights. It works by propagating errors backward through the network layers.

Activation Functions:
Common activation functions include ReLU (Rectified Linear Unit), Sigmoid, and Tanh. Each has different properties that make them suitable for different types of problems.

Overfitting and Regularization:
Overfitting occurs when a model learns the training data too well and fails to generalize to new data. Regularization techniques like dropout and L2 regularization help prevent overfitting.
`;

async function testTitleSuggestions() {
  console.log('🎯 Testing Title Suggestions...\n');
  
  try {
    const titleResult = await generateTitleSuggestions({
      transcript: sampleTranscript,
      pdfText: samplePdfText,
      courseSubject: 'Computer Science - Machine Learning',
      context: 'Introduction to Neural Networks'
    });

    if (titleResult.success && titleResult.suggestions) {
      console.log('✅ Generated Title Suggestions:');
      titleResult.suggestions.forEach((title, index) => {
        console.log(`   ${index + 1}. ${title}`);
      });
      console.log();
      return titleResult.suggestions[0]; // Return first suggestion for PDF generation
    } else {
      console.error('❌ Title generation failed:', titleResult.error);
      return 'Machine Learning Fundamentals';
    }
  } catch (error) {
    console.error('❌ Error generating titles:', error.message);
    return 'Machine Learning Fundamentals';
  }
}

async function testCornellNotesGeneration(title) {
  console.log('📝 Testing Cornell Notes Generation...\n');
  
  try {
    const result = await generateCornellNotesWithTitleSuggestions({
      transcript: sampleTranscript,
      pdfText: samplePdfText,
      lectureTitle: title,
      courseSubject: 'Computer Science - Machine Learning'
    });

    if (result.notes.success && result.notes.notes) {
      console.log('✅ Cornell Notes generated successfully');
      console.log(`📄 Notes length: ${result.notes.notes.length} characters\n`);
      return result.notes.notes;
    } else {
      console.error('❌ Cornell Notes generation failed:', result.notes.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error generating Cornell Notes:', error.message);
    return null;
  }
}

async function testBeautifulPdfGeneration(cornellNotes, title) {
  console.log('🎨 Testing Beautiful PDF Generation...\n');
  
  try {
    const gotenbergClient = createGotenbergClient();
    
    // Convert Markdown to HTML
    console.log('🔄 Converting Markdown to HTML...');
    const htmlContent = await convertMarkdownToHtml(cornellNotes);
    
    // Generate beautiful PDF
    console.log('📄 Generating PDF with beautiful styling...');
    const pdfResult = await gotenbergClient.generateCornellNotesPdf(
      htmlContent,
      title,
      true // Indicate HTML content
    );

    if (pdfResult.success && pdfResult.pdfBuffer) {
      // Save the PDF to a file
      const outputDir = path.join(process.cwd(), 'test-output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filename = `beautiful-cornell-notes-${Date.now()}.pdf`;
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(filepath, Buffer.from(pdfResult.pdfBuffer));
      
      console.log('✅ Beautiful PDF generated successfully!');
      console.log(`📁 Saved to: ${filepath}`);
      console.log(`📊 File size: ${(pdfResult.pdfBuffer.byteLength / 1024).toFixed(2)} KB\n`);
      
      return filepath;
    } else {
      console.error('❌ PDF generation failed:', pdfResult.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error generating PDF:', error.message);
    return null;
  }
}

async function testPlainTextPdf(title) {
  console.log('📄 Testing Plain Text PDF (for comparison)...\n');
  
  try {
    const gotenbergClient = createGotenbergClient();
    
    // Generate PDF from plain text
    const plainTextNotes = `
${title}

Cue Column:
- What is machine learning?
- Types of machine learning
- How do neural networks work?
- What is deep learning?

Notes:
Machine learning is a subset of AI that enables computers to learn without explicit programming.

Three main types:
1. Supervised learning - uses labeled data
2. Unsupervised learning - finds patterns in unlabeled data  
3. Reinforcement learning - learns through rewards and penalties

Neural networks are inspired by the human brain and consist of interconnected neurons.
Training involves adjusting weights to minimize prediction errors.

Deep learning uses neural networks with multiple hidden layers for complex pattern recognition.

Summary:
Machine learning enables computers to learn from data. Neural networks, inspired by the brain, 
can be trained to recognize patterns and make predictions. Deep learning extends this with 
multiple layers for more complex tasks.
    `;

    const pdfResult = await gotenbergClient.generateCornellNotesPdf(
      plainTextNotes,
      title,
      false // Plain text content
    );

    if (pdfResult.success && pdfResult.pdfBuffer) {
      const outputDir = path.join(process.cwd(), 'test-output');
      const filename = `plain-cornell-notes-${Date.now()}.pdf`;
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(filepath, Buffer.from(pdfResult.pdfBuffer));
      
      console.log('✅ Plain text PDF generated for comparison');
      console.log(`📁 Saved to: ${filepath}\n`);
      
      return filepath;
    } else {
      console.error('❌ Plain text PDF generation failed:', pdfResult.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error generating plain text PDF:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Enhanced PDF Generation Test Suite\n');
  console.log('This script tests the new beautiful PDF styling and title suggestions.\n');
  
  try {
    // Test 1: Generate title suggestions
    const suggestedTitle = await testTitleSuggestions();
    
    // Test 2: Generate Cornell Notes with the suggested title
    const cornellNotes = await testCornellNotesGeneration(suggestedTitle);
    
    if (cornellNotes) {
      // Test 3: Generate beautiful PDF from Cornell Notes
      const beautifulPdfPath = await testBeautifulPdfGeneration(cornellNotes, suggestedTitle);
      
      // Test 4: Generate plain text PDF for comparison
      const plainPdfPath = await testPlainTextPdf(suggestedTitle);
      
      // Summary
      console.log('📋 Test Summary:');
      console.log('================');
      if (beautifulPdfPath) {
        console.log(`✅ Beautiful PDF: ${beautifulPdfPath}`);
      }
      if (plainPdfPath) {
        console.log(`✅ Plain PDF: ${plainPdfPath}`);
      }
      console.log('\n🎨 Compare the two PDFs to see the enhanced styling!');
      console.log('The beautiful PDF should have:');
      console.log('  • Modern typography with Inter font');
      console.log('  • Colorful gradient header');
      console.log('  • Styled sections with borders and backgrounds');
      console.log('  • Enhanced readability with proper spacing');
      console.log('  • Professional color scheme');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testTitleSuggestions, testCornellNotesGeneration, testBeautifulPdfGeneration };