#!/usr/bin/env node

/**
 * Test Script: Generate Notes from Saved Transcript File
 * 
 * This script uses a saved transcript file to generate notes,
 * perfect for testing when you don't have database access.
 * 
 * Usage:
 * - node scripts/test-with-saved-transcript.js path/to/transcript.txt "Lecture Title" [lang]
 * - node scripts/test-with-saved-transcript.js transcript.txt "Database Design" es
 * 
 * Environment variables required:
 * - OPENAI_KEY
 * - GOTENBERG_API_URL
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Load environment variables
const openaiKey = process.env.OPENAI_KEY;
const gotenbergUrl = process.env.GOTENBERG_API_URL;

if (!openaiKey || !gotenbergUrl) {
  log('red', '❌ Missing required environment variables:');
  console.log('Required: OPENAI_KEY, GOTENBERG_API_URL');
  console.log('Optional: Set these in your .env file');
  process.exit(1);
}

async function generateNotesWithOpenAI(transcript, lectureTitle, language = 'en') {
  log('blue', `🤖 Generating ${language === 'es' ? 'Spanish' : 'English'} notes with OpenAI...`);
  
  const systemPrompt = language === 'es' 
    ? `Eres un asistente experto en educación que crea apuntes perfectos usando el Método Cornell. 

INSTRUCCIONES ESPECÍFICAS:
- Crea apuntes en ESPAÑOL usando el sistema Cornell
- Organiza en 3 secciones: Conceptos Clave, Notas Detalladas, Resumen Final  
- Incluye 5-7 preguntas de práctica con respuestas
- Usa un lenguaje claro y académico en español
- Formato perfecto para estudiar y repasar

ESTRUCTURA REQUERIDA:
# [TÍTULO DE LA CLASE]

## 🎯 CONCEPTOS CLAVE
- [Conceptos principales numerados]

## 📝 NOTAS DETALLADAS  
[Desarrollo completo del contenido]

## 📋 RESUMEN FINAL
[Síntesis de los puntos más importantes]

## 🧠 PREGUNTAS DE PRÁCTICA
[5-7 preguntas con respuestas para autoevaluación]`
    : `You are an expert educational assistant that creates perfect study notes using the Cornell Note-Taking Method.

SPECIFIC INSTRUCTIONS:
- Create notes in ENGLISH using the Cornell system
- Organize into 3 sections: Key Concepts, Detailed Notes, Summary
- Include 5-7 practice questions with answers
- Use clear, academic language
- Perfect format for studying and review

REQUIRED STRUCTURE:
# [LECTURE TITLE]

## 🎯 KEY CONCEPTS
- [Main concepts numbered]

## 📝 DETAILED NOTES
[Full content development]

## 📋 SUMMARY
[Synthesis of most important points]

## 🧠 PRACTICE QUESTIONS
[5-7 questions with answers for self-assessment]`;

  const userPrompt = `Transcript of the lecture "${lectureTitle}":

${transcript}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const notes = data.choices[0].message.content;
    
    log('green', `✅ Generated ${language === 'es' ? 'Spanish' : 'English'} notes (${notes.length} characters)`);
    return notes;
    
  } catch (error) {
    throw new Error(`OpenAI generation failed: ${error.message}`);
  }
}

async function generatePDF(markdownContent, lectureTitle, language = 'en') {
  log('blue', '📄 Converting to PDF with Gotenberg...');
  
  const htmlContent = `
<!DOCTYPE html>
<html lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${lectureTitle} - ${language === 'es' ? 'Apuntes Cornell' : 'Cornell Notes'}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        h1 {
            color: #2563eb;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        h2 {
            color: #1e40af;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        h3 {
            color: #1e3a8a;
            margin-top: 20px;
        }
        ul, ol {
            padding-left: 25px;
        }
        li {
            margin-bottom: 8px;
        }
        .concept-item {
            background: #eff6ff;
            padding: 10px;
            margin: 8px 0;
            border-left: 4px solid #3b82f6;
            border-radius: 4px;
        }
        .summary-box {
            background: #f0f9ff;
            padding: 20px;
            margin: 20px 0;
            border: 2px solid #0ea5e9;
            border-radius: 8px;
        }
        .question {
            background: #fefce8;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #eab308;
            border-radius: 4px;
        }
        .answer {
            background: #f0fdf4;
            padding: 10px;
            margin-top: 10px;
            border-left: 4px solid #16a34a;
            border-radius: 4px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    ${markdownContent
      .replace(/^# (.*)/gm, '<h1>$1</h1>')
      .replace(/^## (.*)/gm, '<h2>$1</h2>')  
      .replace(/^### (.*)/gm, '<h3>$1</h3>')
      .replace(/^- (.*)/gm, '<div class="concept-item">$1</div>')
      .replace(/^\d+\. (.*)/gm, '<div class="concept-item">$1</div>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h\/]|<div|<p|<strong|<em)(.+)$/gm, '<p>$1</p>')}
    <div class="footer">
        <p>${language === 'es' ? 'Generado con MySummary APP' : 'Generated with MySummary APP'} • ${new Date().toLocaleDateString()}</p>
    </div>
</body>
</html>`;

  const formData = new FormData();
  formData.append('files', new Blob([htmlContent], { type: 'text/html' }), 'index.html');
  formData.append('marginTop', '0.5');
  formData.append('marginBottom', '0.5');
  formData.append('marginLeft', '0.5');
  formData.append('marginRight', '0.5');

  try {
    const response = await fetch(`${gotenbergUrl}/forms/chromium/convert/html`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Gotenberg API error: ${response.status} - ${errorText}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    log('green', `✅ Generated PDF (${pdfBuffer.byteLength} bytes)`);
    return Buffer.from(pdfBuffer);
    
  } catch (error) {
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

// Create sample transcript if none provided
function createSampleTranscript() {
  const sampleText = `Welcome to today's lecture on Database Design Fundamentals. 

Today we're going to cover the essential principles of database design, including normalization, entity-relationship modeling, and best practices for creating efficient database schemas.

First, let's talk about what makes a good database design. A well-designed database should be efficient, scalable, and maintainable. The key principles include data integrity, normalization, and proper indexing.

Normalization is the process of organizing data to reduce redundancy and dependency. We have several normal forms: First Normal Form requires atomic values, Second Normal Form eliminates partial dependencies, and Third Normal Form removes transitive dependencies.

Entity-Relationship modeling helps us visualize the structure of our database. We identify entities, which are objects or concepts, and relationships, which describe how entities are connected.

Primary keys uniquely identify each record in a table, while foreign keys establish relationships between tables. Indexes improve query performance but require additional storage space.

When designing schemas, consider the types of queries you'll be running most frequently. Design your tables and relationships to optimize for these common operations.

Best practices include using consistent naming conventions, documenting your schema, and regularly reviewing and optimizing your design as requirements change.

That concludes today's overview of database design fundamentals. Next week we'll dive deeper into query optimization techniques.`;
  
  return sampleText;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    log('red', '❌ Usage: node scripts/test-with-saved-transcript.js <transcript-file> <lecture-title> [language]');
    log('yellow', '\nExamples:');
    console.log('  node scripts/test-with-saved-transcript.js transcript.txt "Database Design"');
    console.log('  node scripts/test-with-saved-transcript.js transcript.txt "Database Design" es');
    console.log('  node scripts/test-with-saved-transcript.js --sample "Database Design" es');
    log('blue', '\nUse --sample as filename to use built-in sample transcript');
    return;
  }

  const transcriptFile = args[0];
  const lectureTitle = args[1];
  const language = args[2] || 'en';

  try {
    log('bold', `🚀 Testing note generation from saved transcript`);
    log('blue', `📖 Title: ${lectureTitle}`);
    log('blue', `📖 Language: ${language === 'es' ? 'Español' : 'English'}`);
    
    // 1. Read transcript from file or use sample
    let transcript;
    if (transcriptFile === '--sample') {
      log('blue', '📄 Using built-in sample transcript...');
      transcript = createSampleTranscript();
    } else {
      log('blue', `📄 Reading transcript from: ${transcriptFile}`);
      try {
        transcript = readFileSync(transcriptFile, 'utf-8');
      } catch (error) {
        throw new Error(`Could not read transcript file: ${error.message}`);
      }
    }
    
    log('green', `✅ Loaded transcript (${transcript.length} characters)`);

    // 2. Generate notes using OpenAI (in specified language)
    const notes = await generateNotesWithOpenAI(transcript, lectureTitle, language);

    // 3. Generate PDF
    const pdfBuffer = await generatePDF(notes, lectureTitle, language);

    // 4. Save outputs
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const lang_suffix = language === 'es' ? '_es' : '_en';
    const safeName = lectureTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const fs = await import('fs/promises');
    
    const mdFilename = `./test-output-${safeName}${lang_suffix}_${timestamp}.md`;
    const pdfFilename = `./test-output-${safeName}${lang_suffix}_${timestamp}.pdf`;
    
    await fs.writeFile(mdFilename, notes);
    await fs.writeFile(pdfFilename, pdfBuffer);
    
    log('green', `✅ Test completed successfully!`);
    log('green', `📄 Markdown: ${mdFilename}`);
    log('green', `📄 PDF: ${pdfFilename}`);
    
    log('magenta', '\n📊 Performance Summary:');
    console.log(`- Skipped transcription (saved ~30-120 seconds)`);
    console.log(`- Generated ${language === 'es' ? 'Spanish' : 'English'} notes from saved transcript`);
    console.log(`- Total processing: <10 seconds vs normal ~60-180 seconds`);
    
    if (language === 'es') {
      log('green', '\n🇪🇸 Perfect for testing your improved Spanish translations!');
    }

  } catch (error) {
    log('red', `❌ Test failed: ${error.message}`);
    if (error.message.includes('OpenAI')) {
      log('yellow', '💡 Check your OPENAI_KEY environment variable');
    }
    if (error.message.includes('Gotenberg')) {
      log('yellow', '💡 Make sure Gotenberg service is running and GOTENBERG_API_URL is correct');
    }
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  log('red', `💥 Unhandled error: ${error.message}`);
  process.exit(1);
});