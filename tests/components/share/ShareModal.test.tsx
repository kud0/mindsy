/**
 * ShareModal Component Tests
 *
 * Tests for the ShareModal component ensuring proper rendering and z-index hierarchy
 */

import { render, screen, waitFor } from '@testing-library/react';
import { ShareModal } from '@/components/share/ShareModal';
import '@testing-library/jest-dom';

// Mock fetch for friends API
global.fetch = jest.fn();

describe('ShareModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <ShareModal
          isOpen={false}
          onClose={() => {}}
          jobId="test-job-123"
          lectureTitle="Test Lecture"
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friends: [] })
      });

      render(
        <ShareModal
          isOpen={true}
          onClose={() => {}}
          jobId="test-job-123"
          lectureTitle="Test Lecture"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Share Lecture')).toBeInTheDocument();
      });
    });
  });

  describe('Z-index Hierarchy', () => {
    it('should have z-[100] to appear above navigation (z-50)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friends: [] })
      });

      const { container } = render(
        <ShareModal
          isOpen={true}
          onClose={() => {}}
          jobId="test-job-123"
          lectureTitle="Test Lecture"
        />
      );

      // Get the modal backdrop/container (first child)
      const modalContainer = container.firstChild as HTMLElement;

      // Check that it has the correct z-index class
      expect(modalContainer).toHaveClass('z-[100]');

      // Also check that it has other expected classes
      expect(modalContainer).toHaveClass('fixed');
      expect(modalContainer).toHaveClass('inset-0');
    });
  });

  describe('Modal Content', () => {
    it('should display lecture title', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friends: [] })
      });

      render(
        <ShareModal
          isOpen={true}
          onClose={() => {}}
          jobId="test-job-123"
          lectureTitle="Biology 101: Cell Structure"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Biology 101: Cell Structure')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching friends', () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <ShareModal
          isOpen={true}
          onClose={() => {}}
          jobId="test-job-123"
          lectureTitle="Test Lecture"
        />
      );

      // Should show loading spinner
      const loader = screen.getByRole('img', { hidden: true }); // Lucide icons have img role
      expect(loader).toBeInTheDocument();
    });

    it('should show empty state when no friends', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friends: [] })
      });

      render(
        <ShareModal
          isOpen={true}
          onClose={() => {}}
          jobId="test-job-123"
          lectureTitle="Test Lecture"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No friends yet')).toBeInTheDocument();
        expect(screen.getByText('Add friends to share content with them')).toBeInTheDocument();
      });
    });

    it('should display friends list when available', async () => {
      const mockFriends = [
        {
          id: 'conn-1',
          user: {
            id: 'user-1',
            full_name: 'John Doe',
            email: 'john@example.com',
            avatar_url: null
          }
        },
        {
          id: 'conn-2',
          user: {
            id: 'user-2',
            full_name: 'Jane Smith',
            email: 'jane@example.com',
            avatar_url: null
          }
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friends: mockFriends })
      });

      render(
        <ShareModal
          isOpen={true}
          onClose={() => {}}
          jobId="test-job-123"
          lectureTitle="Test Lecture"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper button labels', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friends: [] })
      });

      render(
        <ShareModal
          isOpen={true}
          onClose={() => {}}
          jobId="test-job-123"
          lectureTitle="Test Lecture"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        // Share button should show "Share with 0" when no friends selected
        expect(screen.getByText(/Share with/)).toBeInTheDocument();
      });
    });

    it('should have textarea with label', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friends: [] })
      });

      render(
        <ShareModal
          isOpen={true}
          onClose={() => {}}
          jobId="test-job-123"
          lectureTitle="Test Lecture"
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Message (Optional)')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should have mobile-friendly max width and height', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friends: [] })
      });

      const { container } = render(
        <ShareModal
          isOpen={true}
          onClose={() => {}}
          jobId="test-job-123"
          lectureTitle="Test Lecture"
        />
      );

      // Get the modal content div (second child of backdrop)
      const modalContent = container.querySelector('.max-w-md');

      expect(modalContent).toBeInTheDocument();
      expect(modalContent).toHaveClass('max-h-[80vh]');
    });

    it('should have proper padding for mobile', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friends: [] })
      });

      const { container } = render(
        <ShareModal
          isOpen={true}
          onClose={() => {}}
          jobId="test-job-123"
          lectureTitle="Test Lecture"
        />
      );

      const modalContainer = container.firstChild as HTMLElement;
      expect(modalContainer).toHaveClass('p-4'); // Padding for mobile
    });
  });
});
