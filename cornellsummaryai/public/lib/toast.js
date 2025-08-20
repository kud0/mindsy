/**
 * Simple Toast Notification System
 * Replaces the over-engineered 179-line AuthFeedback component
 */

export class Toast {
  static show(message, type = 'info', duration = 3000) {
    // Remove existing toasts
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add styles
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      z-index: 9999;
      animation: slideIn 0.3s ease;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    // Set background color based on type
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6',
      loading: '#6b7280'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Auto-remove after duration (unless it's a loading toast)
    if (type !== 'loading') {
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.animation = 'slideIn 0.3s ease reverse';
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }
    
    return toast;
  }
  
  static success(message) {
    return Toast.show(message, 'success');
  }
  
  static error(message) {
    return Toast.show(message, 'error');
  }
  
  static loading(message) {
    return Toast.show(message, 'loading', 0); // Don't auto-remove
  }
  
  static hide() {
    const toast = document.querySelector('.toast');
    if (toast) toast.remove();
  }
}

// Make available globally (only in browser)
if (typeof window !== 'undefined') {
  window.Toast = Toast;
}