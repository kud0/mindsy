import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { StudyStats, StudyMaterial } from '@/types/lecture-data';
import { adaptAnyJsonStructure, mapFlexibleJsonToTabs } from '@/lib/flexible-data-mapper';
import { mapDirectJson } from '@/lib/direct-json-mapper';

interface RouteParams {
  params: Promise<{
    jsonFile: string;
  }>;
}

// Dynamic API endpoint that serves any JSON file with flexible structure adaptation
export async function GET(request: Request, { params }: RouteParams) {
  const { jsonFile } = await params;
  
  try {
    console.log('🚀 Dynamic API: Loading JSON file:', jsonFile);
    
    // Security: Only allow .json files and prevent directory traversal
    if (!jsonFile.endsWith('.json') || jsonFile.includes('..') || jsonFile.includes('/')) {
      return NextResponse.json(
        { error: 'Invalid JSON file name' },
        { status: 400 }
      );
    }
    
    // Construct file path
    const filePath = path.join(process.cwd(), 'data', 'student-desk', jsonFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `JSON file '${jsonFile}' not found` },
        { status: 404 }
      );
    }
    
    // Read and parse JSON file
    const fileContents = fs.readFileSync(filePath, 'utf8');
    let rawJson: any;
    
    try {
      rawJson = JSON.parse(fileContents);
    } catch (parseError) {
      return NextResponse.json(
        { error: `Invalid JSON format in '${jsonFile}'` },
        { status: 400 }
      );
    }
    
    console.log('📄 Raw JSON loaded:', {
      file: jsonFile,
      keys: Object.keys(rawJson),
      size: Math.round(fileContents.length / 1024) + 'KB'
    });
    
    // Return raw JSON directly for sample-lecture-3.json, use adapter for others
    const adaptedLectureData = jsonFile === 'sample-lecture-3.json' 
      ? rawJson
      : adaptAnyJsonStructure(rawJson);
    
    if (jsonFile === 'sample-lecture-3.json') {
      console.log('🔄 Direct raw JSON - NO MAPPING:', {
        title: rawJson.metadata.title,
        questionsCount: rawJson.questions.length,
        explanationsCount: rawJson.explanations.length,
        overviewKeys: Object.keys(rawJson.overview),
        firstExplanation: rawJson.explanations[0]
      });
    }
    
    console.log('🔄 JSON structure adapted:', {
      title: adaptedLectureData.metadata.title,
      questionsCount: adaptedLectureData.questions.length,
      explanationsCount: adaptedLectureData.explanations.length
    });
    
    // Generate mock stats and materials based on content
    const estimatedMinutes = parseInt(adaptedLectureData.metadata.estimatedTime.match(/\d+/)?.[0] || '45');
    const mockStats: StudyStats = {
      estimatedMinutes,
      completedSessions: Math.floor(Math.random() * 5), // Random for demo
      lastAccessed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() // Random within last week
    };

    // Generate relevant materials based on content
    const baseFileName = jsonFile.replace('.json', '');
    const mockMaterials: StudyMaterial[] = [
      {
        id: `${baseFileName}-pdf`,
        name: `${adaptedLectureData.metadata.title.substring(0, 50)}...pdf`,
        type: 'pdf',
        url: '#',
        size: `${Math.floor(Math.random() * 5 + 1)}.${Math.floor(Math.random() * 9)} MB`
      },
      {
        id: `${baseFileName}-slides`,
        name: 'Presentación de Clase.pptx',
        type: 'slides',
        url: '#',
        size: `${Math.floor(Math.random() * 15 + 5)}.${Math.floor(Math.random() * 9)} MB`
      }
    ];
    
    // Add additional materials based on content complexity
    if (adaptedLectureData.questions.length > 5) {
      mockMaterials.push({
        id: `${baseFileName}-exercises`,
        name: 'Ejercicios Adicionales.docx',
        type: 'doc',
        url: '#',
        size: `${Math.floor(Math.random() * 2 + 1)}.${Math.floor(Math.random() * 9)} MB`
      });
    }
    
    if (adaptedLectureData.explanations.length > 2) {
      mockMaterials.push({
        id: `${baseFileName}-notes`,
        name: 'Notas Complementarias.txt',
        type: 'txt',
        url: '#',
        size: `${Math.floor(Math.random() * 100 + 20)} KB`
      });
    }

    // Return response in expected format
    const response = {
      lecture: {
        id: `demo-${baseFileName}`,
        data: adaptedLectureData,
        sourceFile: jsonFile
      },
      stats: mockStats,
      materials: mockMaterials,
      meta: {
        adaptedStructure: true,
        originalKeys: Object.keys(rawJson),
        processingTime: Date.now()
      }
    };

    console.log('✅ Dynamic API: Response ready for', jsonFile);
    return NextResponse.json({ data: response });

  } catch (error) {
    console.error('❌ Dynamic API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process JSON file',
        details: error instanceof Error ? error.message : 'Unknown error',
        file: jsonFile
      },
      { status: 500 }
    );
  }
}

// GET all available JSON files
export async function OPTIONS() {
  try {
    const dataDir = path.join(process.cwd(), 'data', 'student-desk');
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(dataDir, file);
        const stats = fs.statSync(filePath);
        
        // Try to get basic info from each file
        let title = file.replace('.json', '');
        let questionsCount = 0;
        const size = Math.round(stats.size / 1024);
        
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const adapted = adaptAnyJsonStructure(content);
          title = adapted.metadata.title;
          questionsCount = adapted.questions.length;
        } catch {
          // If parsing fails, use filename
        }
        
        return {
          filename: file,
          title,
          questionsCount,
          size: size + 'KB',
          lastModified: stats.mtime.toISOString()
        };
      });

    return NextResponse.json({ availableFiles: files });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list JSON files' },
      { status: 500 }
    );
  }
}