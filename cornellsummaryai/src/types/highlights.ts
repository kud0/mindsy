// PDF Highlights types and interfaces

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'red' | 'orange';

export interface HighlightPosition {
  // PDF.js selection coordinates
  left: number;
  top: number;
  width: number;
  height: number;
  // Additional positioning data
  pageHeight: number;
  pageWidth: number;
  scale: number;
  // Text selection bounds (can have multiple rects for multiline selections)
  rects: Array<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>;
}

export interface Highlight {
  id: string;
  user_id: string;
  job_id: string;
  page_number: number;
  selected_text: string;
  position_data: HighlightPosition;
  color: HighlightColor;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHighlightData {
  job_id: string;
  page_number: number;
  selected_text: string;
  position_data: HighlightPosition;
  color: HighlightColor;
  note?: string;
}

export interface UpdateHighlightData {
  color?: HighlightColor;
  note?: string;
}

export interface HighlightSearchResult extends Highlight {
  // Additional data for search results
  lecture_title: string;
  lecture_date: string;
  match_context?: string; // Surrounding text for context
}

// PDF.js text selection data structure
export interface PDFTextSelection {
  text: string;
  pageNumber: number;
  rects: DOMRect[];
  range: Range;
  anchorNode: Node;
  focusNode: Node;
  anchorOffset: number;
  focusOffset: number;
  position: HighlightPosition; // Calculated position data
}

// Highlight event handlers
export interface HighlightHandlers {
  onHighlightCreate: (highlightData: CreateHighlightData) => Promise<void>;
  onHighlightUpdate: (id: string, updateData: UpdateHighlightData) => Promise<void>;
  onHighlightDelete: (id: string) => Promise<void>;
  onHighlightClick: (highlight: Highlight) => void;
  onHighlightHover: (highlight: Highlight | null) => void;
}

// Highlight toolbar state
export interface HighlightToolbarState {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedText: string;
  selectedColor: HighlightColor;
  note: string;
}

// Color definitions for highlights
export const HIGHLIGHT_COLORS: Record<HighlightColor, { bg: string; border: string; name: string }> = {
  yellow: { bg: 'rgba(255, 235, 59, 0.3)', border: '#f9c74f', name: 'Yellow' },
  green: { bg: 'rgba(129, 199, 132, 0.3)', border: '#81c784', name: 'Green' },
  blue: { bg: 'rgba(100, 181, 246, 0.3)', border: '#64b5f6', name: 'Blue' },
  pink: { bg: 'rgba(240, 98, 146, 0.3)', border: '#f06292', name: 'Pink' },
  red: { bg: 'rgba(239, 83, 80, 0.3)', border: '#ef5350', name: 'Red' },
  orange: { bg: 'rgba(255, 152, 0, 0.3)', border: '#ff9800', name: 'Orange' },
};