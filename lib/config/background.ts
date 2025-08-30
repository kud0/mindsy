/**
 * Centralized background configuration for the application
 * Single source of truth for background settings
 */

export const BACKGROUND_CONFIG = {
  image: '/background-2.png',
  fallbackColor: '#f8fafc',
  className: 'fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat',
} as const;

/**
 * Get inline style object for background
 */
export const getBackgroundStyle = () => ({
  backgroundImage: `url(${BACKGROUND_CONFIG.image})`,
  backgroundColor: BACKGROUND_CONFIG.fallbackColor,
});