/**
 * Simple Toast Notifications
 * Provides window.Toast methods for OAuth buttons
 */

/**
 * Simple toast notification system
 */
class SimpleToast {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  show(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `
      px-4 py-2 rounded-md shadow-lg transform transition-all duration-300 ease-in-out
      ${type === 'error' ? 'bg-red-500 text-white' : ''}
      ${type === 'success' ? 'bg-green-500 text-white' : ''}
      ${type === 'info' ? 'bg-blue-500 text-white' : ''}
      ${type === 'loading' ? 'bg-yellow-500 text-white' : ''}
    `;
    
    toast.innerHTML = `
      <div class="flex items-center">
        ${type === 'loading' ? '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>' : ''}
        <span>${message}</span>
      </div>
    `;

    this.container.appendChild(toast);

    // Auto remove after duration (except for loading toasts)
    if (type !== 'loading') {
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.transform = 'translateX(100%)';
          toast.style.opacity = '0';
          setTimeout(() => {
            if (toast.parentNode) {
              toast.parentNode.removeChild(toast);
            }
          }, 300);
        }
      }, duration);
    }

    return toast;
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  loading(message) {
    return this.show(message, 'loading');
  }

  // Remove all loading toasts
  clearLoading() {
    const loadingToasts = this.container?.querySelectorAll('.bg-yellow-500');
    loadingToasts?.forEach(toast => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  }
}

// Initialize and export to global
const toast = new SimpleToast();

export default toast;

// Also make it available globally
window.Toast = toast;