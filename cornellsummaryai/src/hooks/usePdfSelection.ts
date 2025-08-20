import { useState, useEffect, useCallback } from 'react';
import type { PDFTextSelection, HighlightPosition, HighlightColor } from '@/types/highlights';

interface UsePdfSelectionProps {
  onTextSelected: (selection: PDFTextSelection) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  scale?: number;
}

export function usePdfSelection({ onTextSelected, containerRef, scale = 1 }: UsePdfSelectionProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
      setSelectedText('');
      return;
    }

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    
    if (text.length === 0) {
      setSelectedText('');
      return;
    }

    // Check if selection is within our PDF container
    if (!containerRef.current?.contains(range.commonAncestorContainer)) {
      return;
    }

    // Find the text layer element (this is where text selection actually happens)
    let textLayerElement = range.startContainer;
    while (textLayerElement && textLayerElement.nodeType !== Node.ELEMENT_NODE) {
      textLayerElement = textLayerElement.parentNode;
    }

    // Look for react-pdf text layer
    while (textLayerElement && !(textLayerElement as Element).classList.contains('textLayer')) {
      textLayerElement = textLayerElement.parentNode;
    }

    if (!textLayerElement) {
      console.warn('Could not find PDF text layer for selection');
      return;
    }

    // Find the parent page element
    let pageElement = textLayerElement.parentNode;
    while (pageElement && !(pageElement as Element).hasAttribute('data-page-number')) {
      pageElement = pageElement.parentNode;
    }

    if (!pageElement) {
      console.warn('Could not determine PDF page for selection');
      return;
    }

    const pageNumber = parseInt((pageElement as Element).getAttribute('data-page-number') || '1');
    console.log('Found text layer:', textLayerElement, 'Page:', pageNumber);
    
    // Get selection rectangles and filter out invalid ones
    const allRects = Array.from(range.getClientRects());
    
    // Filter out rectangles that are too small, empty, or outside reasonable bounds
    const rects = allRects.filter(rect => 
      rect.width > 2 && // Ignore very thin selections
      rect.height > 5 && // Ignore very short selections
      rect.width < 1000 && // Ignore selections that span too wide
      rect.height < 100  // Ignore selections that span too tall (likely multiple paragraphs)
    );
    
    if (rects.length === 0) {
      console.warn('No valid selection rectangles found');
      return;
    }

    // Get the text layer and page container rectangles
    const textLayerRect = (textLayerElement as Element).getBoundingClientRect();
    
    // Find the page container to get the proper coordinate reference
    let pageContainer = pageElement as Element;
    const pageContainerRect = pageContainer.getBoundingClientRect();
    
    console.log('[PDF Highlights] Text layer rect:', textLayerRect);
    console.log('[PDF Highlights] Page container rect:', pageContainerRect);
    console.log(`[PDF Highlights] Filtered ${rects.length} valid rects from ${allRects.length} total rects`);
    
    // Convert client rects to positions relative to the page container
    // The text layer uses inset: 0, so coordinates should be relative to the page canvas
    const relativeRects = rects.map(rect => {
      const relative = {
        left: rect.left - pageContainerRect.left,
        top: rect.top - pageContainerRect.top,
        width: rect.width,
        height: rect.height
      };
      console.log('[PDF Highlights] Selection rect (viewport):', { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
      console.log('[PDF Highlights] Relative to page container:', relative);
      return relative;
    });

    // Calculate overall bounds
    const minLeft = Math.min(...relativeRects.map(r => r.left));
    const minTop = Math.min(...relativeRects.map(r => r.top));
    const maxRight = Math.max(...relativeRects.map(r => r.left + r.width));
    const maxBottom = Math.max(...relativeRects.map(r => r.top + r.height));

    const position: HighlightPosition = {
      left: minLeft,
      top: minTop,
      width: maxRight - minLeft,
      height: maxBottom - minTop,
      pageHeight: pageContainerRect.height,
      pageWidth: pageContainerRect.width,
      scale: scale,
      rects: relativeRects
    };

    const pdfSelection: PDFTextSelection = {
      text,
      pageNumber,
      rects: rects as DOMRect[],
      range,
      anchorNode: selection.anchorNode!,
      focusNode: selection.focusNode!,
      anchorOffset: selection.anchorOffset,
      focusOffset: selection.focusOffset,
      position
    };

    setSelectedText(text);
    onTextSelected(pdfSelection);
  }, [onTextSelected, containerRef]);

  const clearSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    setSelectedText('');
  }, []);

  // Set up selection event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseUp = (e: MouseEvent) => {
      // Small delay to ensure selection is complete
      setTimeout(handleTextSelection, 10);
    };

    const handleMouseDown = () => {
      setIsSelecting(true);
    };

    const handleSelectionChange = () => {
      if (isSelecting) {
        handleTextSelection();
        setIsSelecting(false);
      }
    };

    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleTextSelection, isSelecting, containerRef]);

  return {
    selectedText,
    clearSelection,
    isSelecting
  };
}