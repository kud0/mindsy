/**
 * SOLUTION B COMPONENT: Add "Un-Dismiss" Button
 *
 * This is an OPTIONAL enhancement if you want users to be able to
 * bring back a dismissed fact on the same day.
 *
 * Current design philosophy: Once dismissed, fact stays dismissed until tomorrow
 * This component provides an alternative UX pattern
 */

"use client"

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

/**
 * Floating button that appears when daily fact is dismissed
 * Allows user to un-dismiss and bring it back
 *
 * Usage:
 * 1. Import this component in NinjaFactBox.tsx
 * 2. Replace `return null;` on line 115 with this component
 * 3. User can click to bring fact back
 */
export function UndismissButton() {
  const [loading, setLoading] = useState(false);

  const handleUndismiss = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/daily-fact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed: false }),
      });

      if (response.ok) {
        // Reload page to fetch fact again
        window.location.reload();
      } else {
        console.error('Failed to un-dismiss fact');
      }
    } catch (error) {
      console.error('Error un-dismissing fact:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 md:bottom-5 right-5 z-50">
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleUndismiss}
        disabled={loading}
        className="relative group"
        aria-label="Bring back daily fact"
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Button */}
        <div className="relative bg-gradient-to-br from-purple-600 to-purple-700 p-3 rounded-full shadow-lg">
          <RotateCcw className="w-5 h-5 text-white" />
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full mb-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            Bring back daily fact
            <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 transform rotate-45 -translate-y-1/2" />
          </div>
        </div>
      </motion.button>
    </div>
  );
}

/**
 * INTEGRATION EXAMPLE
 *
 * In NinjaFactBox.tsx, replace line 114-116:
 *
 * // OLD CODE:
 * if (dismissed) {
 *   return null;
 * }
 *
 * // NEW CODE:
 * if (dismissed) {
 *   return <UndismissButton />;
 * }
 */

/**
 * ALTERNATIVE: Add to existing ninja when dismissed
 *
 * More subtle approach - show a small "undo" icon on the ninja gif
 */
export function UndismissOverlay() {
  const [loading, setLoading] = useState(false);

  const handleUndismiss = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/daily-fact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed: false }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 md:bottom-5 right-5 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative group cursor-pointer"
        onClick={handleUndismiss}
      >
        {/* Faded ninja */}
        <img
          src="/images/ninja.gif"
          alt="Study Ninja"
          className="w-14 h-14 md:w-20 md:h-20 opacity-30 grayscale"
        />

        {/* Undo badge */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="absolute -top-1 -right-1 bg-purple-600 text-white rounded-full p-2 shadow-lg"
        >
          <RotateCcw className="w-3 h-3" />
        </motion.div>

        {/* Tooltip */}
        <div className="absolute bottom-full mb-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
            Click to restore
          </div>
        </div>
      </motion.div>
    </div>
  );
}
