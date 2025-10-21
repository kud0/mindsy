/**
 * Test: ShareModal Portal Implementation
 *
 * Purpose: Verify that ShareModal renders using React Portal to bypass parent overflow constraints
 *
 * Test Cases:
 * 1. Modal renders at document.body level (not nested in parent)
 * 2. Modal is properly centered in viewport
 * 3. Backdrop covers entire viewport
 * 4. Modal is not clipped by parent overflow-hidden
 * 5. ESC key closes modal
 * 6. Click outside closes modal
 * 7. Body scroll is locked when modal is open
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareModal } from '@/components/share/ShareModal';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch for friends API
global.fetch = vi.fn();

describe('ShareModal Portal Implementation', () => {
  const mockOnClose = vi.fn();
  const mockProps = {
    isOpen: true,
    onClose: mockOnClose,
    jobId: 'test-job-123',
    lectureTitle: 'Test Lecture'
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock successful friends fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ friends: [] })
    });

    // Reset body overflow
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // Clean up
    document.body.style.overflow = '';
  });

  it('should render modal at document.body level using portal', async () => {
    const { container } = render(<ShareModal {...mockProps} />);

    await waitFor(() => {
      // Modal should NOT be in the container (because it's portaled to body)
      const modalInContainer = container.querySelector('[class*="fixed inset-0"]');
      expect(modalInContainer).toBeNull();

      // Modal should be in document.body
      const modalInBody = document.body.querySelector('[class*="fixed inset-0"]');
      expect(modalInBody).not.toBeNull();
    });
  });

  it('should have proper z-index and positioning', async () => {
    render(<ShareModal {...mockProps} />);

    await waitFor(() => {
      const backdrop = document.body.querySelector('[class*="fixed inset-0"]');
      expect(backdrop).toHaveClass('z-[100]');
      expect(backdrop).toHaveClass('fixed');
    });
  });

  it('should lock body scroll when open', async () => {
    const { rerender } = render(<ShareModal {...mockProps} isOpen={false} />);

    // Initially, body should be scrollable
    expect(document.body.style.overflow).toBe('');

    // Open modal
    rerender(<ShareModal {...mockProps} isOpen={true} />);

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  it('should unlock body scroll when closed', async () => {
    const { rerender } = render(<ShareModal {...mockProps} isOpen={true} />);

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('hidden');
    });

    // Close modal
    rerender(<ShareModal {...mockProps} isOpen={false} />);

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('');
    });
  });

  it('should close modal when ESC key is pressed', async () => {
    render(<ShareModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Share Lecture')).toBeInTheDocument();
    });

    // Press ESC
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should close modal when clicking backdrop', async () => {
    render(<ShareModal {...mockProps} />);

    await waitFor(() => {
      const backdrop = document.body.querySelector('[class*="fixed inset-0"]');
      expect(backdrop).not.toBeNull();

      // Click backdrop
      fireEvent.click(backdrop!);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should NOT close modal when clicking modal content', async () => {
    render(<ShareModal {...mockProps} />);

    await waitFor(() => {
      const modalContent = document.body.querySelector('[class*="bg-white rounded-2xl"]');
      expect(modalContent).not.toBeNull();

      // Click modal content
      fireEvent.click(modalContent!);

      // Modal should still be open
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it('should render modal with proper mobile-first responsive classes', async () => {
    render(<ShareModal {...mockProps} />);

    await waitFor(() => {
      const modalContent = document.body.querySelector('[class*="bg-white rounded-2xl"]');
      expect(modalContent).toHaveClass('w-full');
      expect(modalContent).toHaveClass('max-w-md');
      expect(modalContent).toHaveClass('max-h-[80vh]');
    });
  });

  it('should render inside overflow-hidden container without clipping', async () => {
    // Simulate StudentDesk overflow-hidden parent
    const parentWithOverflow = document.createElement('div');
    parentWithOverflow.style.overflow = 'hidden';
    parentWithOverflow.style.height = '100vh';
    document.body.appendChild(parentWithOverflow);

    render(<ShareModal {...mockProps} />);

    await waitFor(() => {
      // Modal should be at body level, not inside overflow container
      const modalInBody = document.body.querySelector('[class*="fixed inset-0"]');
      expect(modalInBody).not.toBeNull();
      expect(modalInBody?.parentElement).toBe(document.body);
    });

    // Cleanup
    document.body.removeChild(parentWithOverflow);
  });
});
