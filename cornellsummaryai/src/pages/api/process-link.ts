import type { APIRoute } from 'astro';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
// Dynamic import for CommonJS module
const getYoutubeTranscript = async () => {
  const module = await import('youtube-transcript');
  return module.YoutubeTranscript;
};
import { requireAuth, supabaseAdmin } from '../../lib/supabase-server';
import { generateMindsyNotes, convertMarkdownToHtml } from '../../lib/openai-client';
import { createGotenbergClient } from '../../lib/gotenberg-client';
import { generateSecureFilePath, uploadFile, STORAGE_BUCKETS } from '../../lib/file-processing';
import { v4 as uuidv4 } from 'uuid';

/**
 * Link Processing API
 * Extracts content from URLs and generates Cornell Notes
 */

interface LinkPreview {
  title: string;
  description: string;
  type: string;
}

// Extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Validate URL
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

// Extract content from regular web articles
async function extractArticleContent(url: string): Promise<{ title: string; content: string; excerpt: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MindsyBot/1.0; +https://mindsy.ai)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (!article) {
      // Fallback to basic extraction
      const doc = dom.window.document;
      const title = doc.querySelector('title')?.textContent || 'Untitled';
      const body = doc.querySelector('body')?.textContent || '';
      
      return {
        title,
        content: body.slice(0, 10000), // Limit content length
        excerpt: body.slice(0, 200)
      };
    }
    
    return {
      title: article.title,
      content: article.textContent || article.content,
      excerpt: article.excerpt || article.textContent?.slice(0, 200) || ''
    };
  } catch (error) {
    console.error('Error extracting article content:', error);
    throw new Error('Failed to extract article content');
  }
}

// Extract YouTube transcript
async function extractYouTubeTranscript(url: string): Promise<{ title: string; content: string }> {
  try {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    
    // Fetch transcript using dynamic import
    const YoutubeTranscript = await getYoutubeTranscript();
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript available for this video');
    }
    
    // Combine transcript segments
    const content = transcript
      .map(segment => segment.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Try to get video title from YouTube page
    let title = 'YouTube Video';
    try {
      const pageResponse = await fetch(url);
      const pageHtml = await pageResponse.text();
      const titleMatch = pageHtml.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        title = titleMatch[1].replace(' - YouTube', '').trim();
      }
    } catch {
      // Fallback title
      title = `YouTube Video (${videoId})`;
    }
    
    return { title, content };
  } catch (error) {
    console.error('Error extracting YouTube transcript:', error);
    throw new Error('Failed to extract YouTube transcript. The video may not have captions enabled.');
  }
}

// Extract PDF content from URL
async function extractPdfContent(url: string): Promise<{ title: string; content: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    // Use Tika for PDF extraction (reuse existing infrastructure)
    const tikaUrl = import.meta.env.TIKA_API_URL;
    if (tikaUrl) {
      const tikaResponse = await fetch(`${tikaUrl}/tika`, {
        method: 'PUT',
        body: Buffer.from(buffer),
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'application/pdf'
        }
      });
      
      if (tikaResponse.ok) {
        const text = await tikaResponse.text();
        const urlParts = url.split('/');
        const title = urlParts[urlParts.length - 1].replace('.pdf', '');
        
        return { title, content: text };
      }
    }
    
    // Fallback error if Tika is not available
    throw new Error('PDF extraction service not available');
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    throw new Error('Failed to extract PDF content');
  }
}

// Main content extraction function
async function extractContentFromUrl(url: string, type: 'youtube' | 'pdf' | 'article'): Promise<{ title: string; content: string; excerpt?: string }> {
  switch (type) {
    case 'youtube':
      return extractYouTubeTranscript(url);
    
    case 'pdf':
      return extractPdfContent(url);
    
    case 'article':
    default:
      return extractArticleContent(url);
  }
}

// GET endpoint for link preview
export const GET: APIRoute = async ({ url }) => {
  const linkUrl = url.searchParams.get('url');
  
  if (!linkUrl || !isValidUrl(linkUrl)) {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Detect link type
    const isYouTube = extractYouTubeId(linkUrl) !== null;
    const isPdf = linkUrl.toLowerCase().endsWith('.pdf');
    const type = isYouTube ? 'youtube' : isPdf ? 'pdf' : 'article';
    
    // Extract basic info for preview
    if (type === 'article') {
      const { title, excerpt } = await extractArticleContent(linkUrl);
      return new Response(JSON.stringify({
        title,
        description: excerpt,
        type: 'article'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      title: type === 'youtube' ? 'YouTube Video' : 'PDF Document',
      description: `Ready to process ${type}`,
      type
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Preview error:', error);
    return new Response(JSON.stringify({
      title: 'Link Preview',
      description: 'Unable to fetch preview',
      type: 'unknown'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST endpoint for processing links
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Authenticate user
    const { supabase, user } = await requireAuth(cookies);
    
    const { url: linkUrl, type, studyNodeId } = await request.json();
    
    // Validate URL
    if (!linkUrl || !isValidUrl(linkUrl)) {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create job record
    const jobId = uuidv4();
    const { error: jobError } = await supabaseAdmin
      .from('jobs')
      .insert({
        id: jobId,
        user_id: user.id,
        status: 'processing',
        audio_file_name: linkUrl, // Store URL in audio_file_name field
        source_type: 'link',
        created_at: new Date().toISOString()
      });
    
    if (jobError) {
      console.error('Error creating job:', jobError);
      return new Response(JSON.stringify({ error: 'Failed to create job' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      // Extract content from URL
      console.log(`Extracting content from ${type} link:`, linkUrl);
      const extracted = await extractContentFromUrl(linkUrl, type);
      
      // Generate Cornell Notes using existing pipeline
      console.log('Generating Cornell Notes...');
      const notesMarkdown = await generateMindsyNotes({
        transcribedText: extracted.content,
        lectureTitle: extracted.title,
        additionalContext: `Source: ${linkUrl}\nType: ${type}`
      });
      
      // Convert to HTML
      const notesHtml = convertMarkdownToHtml(notesMarkdown);
      
      // Format as full HTML document
      const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${extracted.title} - Cornell Notes</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        
        h1 { 
            color: #111827; 
            border-bottom: 3px solid #3b82f6; 
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        
        h2 { 
            color: #1f2937; 
            margin-top: 30px;
            border-left: 4px solid #3b82f6;
            padding-left: 10px;
        }
        
        h3 { 
            color: #374151; 
            margin-top: 20px;
        }
        
        .cornell-notes {
            display: grid;
            grid-template-columns: 250px 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        
        .cue-column {
            border-right: 2px solid #e5e7eb;
            padding-right: 20px;
        }
        
        .notes-column {
            padding-left: 20px;
        }
        
        .summary-section {
            grid-column: 1 / -1;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
        }
        
        ul, ol {
            margin-left: 20px;
        }
        
        li {
            margin-bottom: 8px;
        }
        
        strong {
            color: #111827;
            font-weight: 600;
        }
        
        blockquote {
            border-left: 4px solid #3b82f6;
            padding-left: 20px;
            margin: 20px 0;
            color: #4b5563;
            font-style: italic;
        }
        
        .source-info {
            margin-top: 40px;
            padding: 15px;
            background: #f3f4f6;
            border-radius: 8px;
            font-size: 0.9em;
            color: #6b7280;
        }
    </style>
</head>
<body>
    ${notesHtml}
    <div class="source-info">
        <strong>Source:</strong> <a href="${linkUrl}" target="_blank">${linkUrl}</a><br>
        <strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}<br>
        <strong>Generated:</strong> ${new Date().toLocaleString()}
    </div>
</body>
</html>`;
      
      // Generate PDF if Gotenberg is available
      let pdfPath = null;
      const gotenbergUrl = import.meta.env.GOTENBERG_API_URL;
      
      if (gotenbergUrl) {
        try {
          const gotenbergClient = createGotenbergClient(gotenbergUrl);
          const pdfBuffer = await gotenbergClient.htmlToPdf(fullHtml);
          
          // Upload PDF to storage
          const fileName = `${jobId}_cornell_notes.pdf`;
          pdfPath = generateSecureFilePath(user.id, fileName);
          
          await uploadFile(STORAGE_BUCKETS.GENERATED_NOTES, pdfPath, pdfBuffer, 'application/pdf');
          console.log('PDF uploaded successfully:', pdfPath);
        } catch (pdfError) {
          console.error('PDF generation failed:', pdfError);
          // Continue without PDF
        }
      }
      
      // Store notes in database
      const { error: notesError } = await supabaseAdmin
        .from('notes')
        .insert({
          job_id: jobId,
          user_id: user.id,
          title: extracted.title,
          content: notesMarkdown,
          summary: extracted.excerpt || extracted.content.slice(0, 200),
          pdf_path: pdfPath,
          study_node_id: studyNodeId || null,
          created_at: new Date().toISOString()
        });
      
      if (notesError) {
        console.error('Error storing notes:', notesError);
        throw notesError;
      }
      
      // Update job status
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      return new Response(JSON.stringify({
        jobId,
        title: extracted.title,
        message: 'Link processed successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (processingError) {
      console.error('Processing error:', processingError);
      
      // Update job status to failed
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'failed',
          error_message: processingError instanceof Error ? processingError.message : 'Processing failed'
        })
        .eq('id', jobId);
      
      throw processingError;
    }
    
  } catch (error) {
    console.error('API error:', error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Failed to process link'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};