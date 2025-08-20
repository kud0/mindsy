import type { APIRoute } from 'astro';

/**
 * Link Preview API
 * Fetches basic metadata for URL preview
 */

export const POST: APIRoute = async ({ request }) => {
  try {
    const { url } = await request.json();
    
    if (!url || !isValidUrl(url)) {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Detect link type
    const type = detectLinkType(url);
    
    // For YouTube videos
    if (type === 'youtube') {
      const videoId = extractYouTubeId(url);
      return new Response(JSON.stringify({
        title: 'YouTube Video',
        description: `Video ID: ${videoId}`,
        type: 'youtube'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // For PDFs
    if (type === 'pdf') {
      const fileName = url.split('/').pop() || 'document.pdf';
      return new Response(JSON.stringify({
        title: fileName,
        description: 'PDF Document',
        type: 'pdf'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // For articles - fetch and parse basic metadata
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MindsyBot/1.0)'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : url;
        
        // Extract description from meta tags
        const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                         html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
        const description = descMatch ? descMatch[1].trim() : 'Web article';
        
        return new Response(JSON.stringify({
          title: title.slice(0, 100),
          description: description.slice(0, 200),
          type: 'article'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
    }
    
    // Fallback response
    return new Response(JSON.stringify({
      title: 'Web Page',
      description: url,
      type: 'article'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Preview API error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch preview'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Helper functions
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

function detectLinkType(url: string): 'youtube' | 'pdf' | 'article' {
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/;
  const pdfRegex = /\.pdf$/i;
  
  if (youtubeRegex.test(url)) return 'youtube';
  if (pdfRegex.test(url)) return 'pdf';
  return 'article';
}

function extractYouTubeId(url: string): string | null {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}