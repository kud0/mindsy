import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { LectureData, StudyStats, StudyMaterial } from '@/types/lecture-data';

// Simple API endpoint that serves your sample JSON directly
export async function GET() {
  try {
    // Read the sample JSON file
    const filePath = path.join(process.cwd(), 'data', 'student-desk', 'sample-lecture.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const lectureData: LectureData = JSON.parse(fileContents);

    // Mock some additional data that would come from database
    const mockStats: StudyStats = {
      estimatedMinutes: 50, // From metadata.estimatedTime
      completedSessions: 2,
      lastAccessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    };

    const mockMaterials: StudyMaterial[] = [
      {
        id: 'sample-pdf-1',
        name: 'Anatomía del Esqueleto Axial.pdf',
        type: 'pdf',
        url: '#',
        size: '3.2 MB'
      },
      {
        id: 'sample-slides-1',
        name: 'Diapositivas de Clase.pptx',
        type: 'slides',
        url: '#',
        size: '12.5 MB'
      },
      {
        id: 'sample-notes-1',
        name: 'Notas Adicionales.txt',
        type: 'txt',
        url: '#',
        size: '45 KB'
      }
    ];

    // Return the response in the same format as the original API
    const response = {
      lecture: {
        id: 'demo-lecture',
        data: lectureData
      },
      stats: mockStats,
      materials: mockMaterials
    };

    return NextResponse.json({ data: response });

  } catch (error) {
    console.error('Error loading demo lecture data:', error);
    return NextResponse.json(
      { error: 'Failed to load demo data' },
      { status: 500 }
    );
  }
}