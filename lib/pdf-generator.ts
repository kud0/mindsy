/**
 * PDF Generation Service
 * 
 * Handles conversion of study materials to beautifully formatted PDFs
 * Uses Puppeteer with different configurations for local vs production
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export interface StudyGuideContent {
  metadata?: {
    title: string;
    subject?: string;
    language?: string;
  };
  tableOfContents?: {
    items: Array<{ title: string; description: string }>;
  };
  questions: Array<{
    id: string;
    question: string;
    answer: string;
    type: string;
    difficulty: string;
  }>;
  explanations: Array<{
    id: string;
    title: string;
    content: string;
    keyPoints: string[];
    examples: string[];
  }>;
  summary: {
    overview: string;
    keyTakeaways: string[];
    learningObjectives: string[];
  };
}

/**
 * Generate beautiful PDF from study guide content
 */
export async function generateBeautifulPDF(studyGuide: StudyGuideContent): Promise<Buffer> {
  console.log('📄 Generating PDF for study guide:', studyGuide.metadata?.title);

  const html = generatePDFHTML(studyGuide);
  
  // Use different approach for local vs production
  const isLocal = process.env.NODE_ENV === 'development';
  
  let browser;
  if (isLocal) {
    // Local development - use system Chrome
    const puppeteerFull = await import('puppeteer');
    browser = await puppeteerFull.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } else {
    // Production - use optimized Chromium
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
  });
  
  await browser.close();
  
  console.log('✅ PDF generated successfully');
  return Buffer.from(pdfBuffer);
}

/**
 * Generate HTML template for PDF
 */
function generatePDFHTML(studyGuide: StudyGuideContent): string {
  const title = studyGuide.metadata?.title || 'Study Guide';
  const subject = studyGuide.metadata?.subject;
  const language = studyGuide.metadata?.language || 'en';

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          
          * { box-sizing: border-box; }
          
          body { 
            font-family: 'Inter', sans-serif; 
            margin: 0; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            font-size: 14px;
            line-height: 1.6;
          }
          
          .container { 
            max-width: 100%;
            margin: 20px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
            color: white;
            padding: 30px;
            text-align: center;
          }
          
          .title { 
            font-size: 2.2em; 
            font-weight: 700; 
            margin: 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            word-wrap: break-word;
          }
          
          .subject {
            font-size: 1.1em;
            opacity: 0.9;
            margin-top: 10px;
          }
          
          .content { 
            padding: 30px;
          }
          
          .section {
            margin-bottom: 30px;
          }
          
          .section-title {
            font-size: 1.6em;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
            border-bottom: 3px solid #4ECDC4;
            padding-bottom: 10px;
          }
          
          .question {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #4ECDC4;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            page-break-inside: avoid;
          }
          
          .question-title {
            font-size: 1.2em;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 12px;
          }
          
          .answer {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-top: 10px;
            border: 1px solid #e9ecef;
          }
          
          .bullet-point {
            margin: 8px 0;
            padding-left: 15px;
            position: relative;
            font-size: 0.95em;
          }
          
          .bullet-point:before {
            content: "•";
            color: #4ECDC4;
            font-weight: bold;
            position: absolute;
            left: 0;
          }
          
          .explanation {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 15px 0;
            border-left: 4px solid #FF6B6B;
          }
          
          .explanation-title {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 1.1em;
          }
          
          .summary {
            background: linear-gradient(135deg, #fff5cd 0%, #ffe4a3 100%);
            border-radius: 12px;
            padding: 25px;
            margin: 20px 0;
          }
          
          .summary-overview {
            margin-bottom: 15px;
            font-size: 1em;
            line-height: 1.7;
          }
          
          .takeaway {
            margin: 8px 0;
            padding-left: 15px;
            position: relative;
          }
          
          .takeaway:before {
            content: "✓";
            color: #28a745;
            font-weight: bold;
            position: absolute;
            left: 0;
          }
          
          .toc {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          
          .toc-item {
            margin: 5px 0;
            padding: 5px 0;
            border-bottom: 1px solid #dee2e6;
          }
          
          .toc-item:last-child {
            border-bottom: none;
          }
          
          @media print {
            body { background: white; }
            .container { margin: 0; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">${title}</h1>
            ${subject ? `<div class="subject">${subject}</div>` : ''}
          </div>
          
          <div class="content">
            ${generateTableOfContents(studyGuide, language)}
            ${generateQuestionsSection(studyGuide, language)}
            ${generateExplanationsSection(studyGuide, language)}
            ${generateSummarySection(studyGuide, language)}
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate Table of Contents section
 */
function generateTableOfContents(studyGuide: StudyGuideContent, language: string): string {
  if (!studyGuide.tableOfContents?.items?.length) return '';

  const title = language === 'es' ? 'Tabla de Contenidos' : 'Table of Contents';
  
  return `
    <div class="section">
      <h2 class="section-title">${title}</h2>
      <div class="toc">
        ${studyGuide.tableOfContents.items.map(item => 
          `<div class="toc-item">${item.title}: ${item.description}</div>`
        ).join('')}
      </div>
    </div>
  `;
}

/**
 * Generate Questions section
 */
function generateQuestionsSection(studyGuide: StudyGuideContent, language: string): string {
  if (!studyGuide.questions?.length) return '';

  const title = language === 'es' ? 'Preguntas de Estudio' : 'Study Questions';

  return `
    <div class="section">
      <h2 class="section-title">${title}</h2>
      ${studyGuide.questions.map((q, i) => `
        <div class="question">
          <div class="question-title">${i + 1}. ${q.question.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
          <div class="answer">
            ${formatAnswer(q.answer)}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Generate Explanations section
 */
function generateExplanationsSection(studyGuide: StudyGuideContent, language: string): string {
  if (!studyGuide.explanations?.length) return '';

  const title = language === 'es' ? 'Explicaciones Detalladas' : 'Detailed Explanations';

  return `
    <div class="section">
      <h2 class="section-title">${title}</h2>
      ${studyGuide.explanations.map(exp => `
        <div class="explanation">
          <div class="explanation-title">${exp.title.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
          <div>${exp.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Generate Summary section
 */
function generateSummarySection(studyGuide: StudyGuideContent, language: string): string {
  if (!studyGuide.summary) return '';

  const title = language === 'es' ? 'Resumen' : 'Summary';
  const takeawaysTitle = language === 'es' ? 'Puntos Clave:' : 'Key Takeaways:';

  return `
    <div class="section">
      <h2 class="section-title">${title}</h2>
      <div class="summary">
        <div class="summary-overview">${studyGuide.summary.overview.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
        ${studyGuide.summary.keyTakeaways?.length ? `
          <div>
            <strong>${takeawaysTitle}</strong>
            ${studyGuide.summary.keyTakeaways.map(takeaway => 
              `<div class="takeaway">${takeaway.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`
            ).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Format answer text with bullet points
 */
function formatAnswer(answer: string): string {
  return answer.split(/[•\n\*]/)
    .filter(point => point.trim())
    .map(point => `<div class="bullet-point">${point.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`)
    .join('');
}