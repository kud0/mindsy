#!/usr/bin/env node

/**
 * Test Script: Generate Notes from Existing Transcript
 * 
 * This script fetches an existing transcript from the database and uses it
 * to generate notes, bypassing the expensive transcription step for testing.
 * 
 * Usage:
 * - node scripts/test-with-existing-transcript.js [jobId] [lang]
 * - node scripts/test-with-existing-transcript.js --list (to see available transcripts)
 * - node scripts/test-with-existing-transcript.js abc123 es (to use Spanish)
 * 
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - OPENAI_KEY
 * - GOTENBERG_API_URL
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_KEY;
const gotenbergUrl = process.env.GOTENBERG_API_URL;

if (!supabaseUrl || !supabaseServiceKey || !openaiKey || !gotenbergUrl) {
  log('red', '❌ Missing required environment variables:');
  console.log('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_KEY, GOTENBERG_API_URL');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAvailableTranscripts() {
  log('blue', '🔍 Fetching available transcripts from database...');
  
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('job_id, lecture_title, txt_file_path, md_file_path, created_at, status')
    .not('txt_file_path', 'is', null)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    log('red', `❌ Error fetching transcripts: ${error.message}`);
    return;
  }

  if (!jobs || jobs.length === 0) {
    log('yellow', '⚠️  No completed jobs with transcripts found in database');
    return;
  }

  log('green', `✅ Found ${jobs.length} available transcripts:\n`);
  console.table(jobs.map(job => ({
    'Job ID': job.job_id,
    'Title': job.lecture_title,
    'Created': new Date(job.created_at).toLocaleDateString(),
    'Has TXT': job.txt_file_path ? '✅' : '❌',
    'Has MD': job.md_file_path ? '✅' : '❌'
  })));

  log('blue', '\n📝 To use a transcript, run:');
  console.log(`node scripts/test-with-existing-transcript.js ${jobs[0].job_id}`);
  console.log(`node scripts/test-with-existing-transcript.js ${jobs[0].job_id} es`);
}

async function downloadTranscript(txtFilePath) {
  log('blue', '📥 Downloading transcript from Supabase Storage...');
  
  const { data, error } = await supabase.storage
    .from('generated-notes')
    .download(txtFilePath.replace('generated-notes/', ''));
  
  if (error) {
    throw new Error(`Failed to download transcript: ${error.message}`);
  }

  const text = await data.text();
  log('green', `✅ Downloaded transcript (${text.length} characters)`);
  return text;
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
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
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
      throw new Error(`Gotenberg API error: ${response.status} ${response.statusText}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    log('green', `✅ Generated PDF (${pdfBuffer.byteLength} bytes)`);
    return Buffer.from(pdfBuffer);
    
  } catch (error) {
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--list') || args.length === 0) {
    await listAvailableTranscripts();
    return;
  }

  const jobId = args[0];
  const language = args[1] || 'en';

  if (!jobId) {
    log('red', '❌ Please provide a job ID');
    log('blue', 'Usage: node scripts/test-with-existing-transcript.js <jobId> [language]');
    return;
  }

  try {
    log('bold', `🚀 Testing note generation with job ID: ${jobId}`);
    log('blue', `📖 Language: ${language === 'es' ? 'Español' : 'English'}`);
    
    // 1. Fetch job details from database
    log('blue', '🔍 Fetching job details...');
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'completed')
      .single();

    if (jobError) {
      throw new Error(`Failed to fetch job: ${jobError.message}`);
    }

    if (!job.txt_file_path) {
      throw new Error('Job does not have a transcript file');
    }

    log('green', `✅ Found job: "${job.lecture_title}"`);

    // 2. Download the existing transcript
    const transcript = await downloadTranscript(job.txt_file_path);

    // 3. Generate notes using OpenAI (in specified language)
    const notes = await generateNotesWithOpenAI(transcript, job.lecture_title, language);

    // 4. Generate PDF
    const pdfBuffer = await generatePDF(notes, job.lecture_title, language);

    // 5. Save outputs
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const lang_suffix = language === 'es' ? '_es' : '_en';
    
    const fs = await import('fs/promises');
    
    await fs.writeFile(`./test-output-${jobId}${lang_suffix}_${timestamp}.md`, notes);
    await fs.writeFile(`./test-output-${jobId}${lang_suffix}_${timestamp}.pdf`, pdfBuffer);
    
    log('green', `✅ Test completed successfully!`);
    log('green', `📄 Markdown: test-output-${jobId}${lang_suffix}_${timestamp}.md`);
    log('green', `📄 PDF: test-output-${jobId}${lang_suffix}_${timestamp}.pdf`);
    
    log('magenta', '\n📊 Performance Summary:');
    console.log(`- Skipped transcription (saved ~30-120 seconds)`);
    console.log(`- Generated ${language === 'es' ? 'Spanish' : 'English'} notes from existing transcript`);
    console.log(`- Total processing: <10 seconds vs normal ~60-180 seconds`);

  } catch (error) {
    log('red', `❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  log('red', `💥 Unhandled error: ${error.message}`);
  process.exit(1);
});