import type { APIRoute } from 'astro';
import { requireAuth } from '../../lib/supabase-server';
import { supabaseAdmin } from '../../lib/supabase-server';

/**
 * Sanitize filename for Supabase Storage
 * Supabase storage keys can only contain: a-z, A-Z, 0-9, -, _, ., /
 */
function sanitizeFilenameForStorage(filename: string): string {
  return filename
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Replace special characters with safe alternatives
    .replace(/[^\w\-_.]/g, '_')
    // Remove multiple consecutive underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Ensure it's not empty
    || 'file';
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('🔍 Upload API called');
    
    // Extract cookies from request for authentication
    const cookiesFromRequest = {
      get: (name: string) => {
        const cookieHeader = request.headers.get('cookie');
        if (!cookieHeader) return undefined;
        
        const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie) => {
          const [key, value] = cookie.trim().split('=');
          if (key && value) {
            acc[key] = decodeURIComponent(value);
          }
          return acc;
        }, {});
        
        return cookies[name] ? { value: cookies[name] } : undefined;
      }
    };
    
    const authResult = await requireAuth(cookiesFromRequest);
    if (!authResult.user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const user = authResult.user;
    console.log('✅ Authentication successful, user:', user.id);

    // Parse multipart form data
    const formData = await request.formData();
    console.log('📋 Form data parsed');
    
    // Debug FormData contents
    console.log('📋 Received FormData fields:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.type}, ${value.size} bytes)`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    const audioFile = formData.get('audioFile') as File;
    const pdfFile = formData.get('pdfFile') as File | null;
    const lectureTitle = formData.get('lectureTitle') as string;
    const courseSubject = formData.get('courseSubject') as string;
    
    // Get actual file sizes from client-side with null safety
    const audioSizeMB = audioFile ? 
      (parseFloat(formData.get('audioSizeMB') as string) || Math.round((audioFile.size / (1024 * 1024)) * 100) / 100) : 
      0;
    const pdfSizeMB = parseFloat(formData.get('pdfSizeMB') as string) || 0;
    const totalSizeMB = audioSizeMB + pdfSizeMB;
    
    console.log(`📊 Server received file sizes - Audio: ${audioSizeMB}MB, PDF: ${pdfSizeMB}MB, Total: ${totalSizeMB}MB`);

    // Check if we have at least one file (either audio or PDF/document)
    if (!audioFile && !pdfFile) {
      console.error('❌ No files provided');
      return new Response(
        JSON.stringify({ error: 'At least one file (audio or document) is required' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (audioFile) {
      console.log('🎵 Audio file:', audioFile.name, 'Size:', audioFile.size);
    }
    if (pdfFile) {
      console.log('📄 PDF file:', pdfFile.name, 'Size:', pdfFile.size);
    }

    const timestamp = Date.now();

    // Handle audio file upload if provided
    let audioPath = null;
    if (audioFile) {
      // Preserve original filename for title extraction, but sanitize for storage
      const audioFileExtension = audioFile.name.split('.').pop()?.toLowerCase() || 'mp3';
      const originalNameWithoutExt = audioFile.name.replace(/\.[^/.]+$/, '');
      const sanitizedNameWithoutExt = sanitizeFilenameForStorage(originalNameWithoutExt);
      
      // Use timestamp prefix and sanitized filename for storage
      audioPath = `${user.id}/${timestamp}_${sanitizedNameWithoutExt}.${audioFileExtension}`;
      console.log(`📁 Storing audio file as: ${audioPath} (original: ${audioFile.name})`);
      const audioArrayBuffer = await audioFile.arrayBuffer();
      
      const { error: audioError } = await supabaseAdmin.storage
        .from('user-uploads')
        .upload(audioPath, audioArrayBuffer, {
          contentType: audioFile.type,
          duplex: 'half'
        });

      if (audioError) {
        console.error('Audio upload error:', audioError);
        throw new Error(`Failed to upload audio: ${audioError.message}`);
      }
    }

    // Upload document file if provided (PDF, DOC, DOCX, TXT, etc.)
    let pdfPath = null;
    if (pdfFile && pdfFile.size > 0) {
      // Get the file extension for proper storage
      const fileExtension = pdfFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      const originalNameWithoutExt = pdfFile.name.replace(/\.[^/.]+$/, '');
      const sanitizedNameWithoutExt = sanitizeFilenameForStorage(originalNameWithoutExt);
      
      pdfPath = `${user.id}/${timestamp}_${sanitizedNameWithoutExt}.${fileExtension}`;
      console.log(`📁 Storing document file as: ${pdfPath} (original: ${pdfFile.name})`);
      const pdfArrayBuffer = await pdfFile.arrayBuffer();
      
      const { error: pdfError } = await supabaseAdmin.storage
        .from('user-uploads')
        .upload(pdfPath, pdfArrayBuffer, {
          contentType: pdfFile.type,
          duplex: 'half'
        });

      if (pdfError) {
        console.error('Document upload error:', pdfError);
        // For document-only uploads, this is a critical error
        if (!audioFile) {
          throw new Error(`Failed to upload document: ${pdfError.message}`);
        } else {
          // For audio+PDF uploads, continue without PDF
          console.warn('Document upload failed, continuing without document');
          pdfPath = null;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        audioPath,
        pdfPath,
        audioSizeMB,
        pdfSizeMB,
        totalSizeMB,
        message: 'Files uploaded successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Upload files API error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to upload files',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};