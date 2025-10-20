"use client"

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyFactResponse {
  success: boolean;
  fact: string | null;
  language?: string;
  dismissed: boolean;
  collapsed: boolean;
  date?: string;
  generated?: boolean;
}

export function NinjaFactBox() {
  const [factText, setFactText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch fact data on mount
  useEffect(() => {
    fetchFact();
  }, []);

  const fetchFact = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/daily-fact');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Daily fact API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        // Show the actual API error message for debugging
        const errorMessage = errorData.error || errorData.details || 'Check back soon for a cool study fact!';
        setError(errorMessage);
        return;
      }

      const data: DailyFactResponse = await response.json();

      if (data.fact) {
        setFactText(data.fact);
        setCollapsed(data.collapsed || false);
        setDismissed(data.dismissed || false);
        console.info('Daily fact loaded:', data);
      } else {
        console.info('No daily fact available yet');
        setError('Loading your daily fact...');
      }
    } catch (err) {
      console.error('Error fetching daily fact:', err instanceof Error ? err.message : err);
      setError('Check back soon for a cool study fact!');
    } finally {
      setLoading(false);
    }
  };

  const updateFactState = async (updates: { dismissed?: boolean; collapsed?: boolean }) => {
    if (!factText) return;

    try {
      const response = await fetch('/api/daily-fact', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error updating fact state:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        return;
      }

      console.info('Fact state updated successfully');
    } catch (err) {
      console.error('Error updating fact state:', err instanceof Error ? err.message : err);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    updateFactState({ dismissed: true });
  };

  const handleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    updateFactState({ collapsed: newCollapsed });
  };

  const handleExpand = () => {
    setCollapsed(false);
    updateFactState({ collapsed: false });
  };

  // Don't render if dismissed
  if (dismissed) {
    return null;
  }

  // Get display content (fact or fallback message)
  const displayContent = factText || error || 'Loading your daily fact...';
  const displayCategory = 'Did You Know?';
  const isLoadingOrError = loading || (!factText && error);

  return (
    <>
      {/* Ninja fact box - visible on all screens */}
      <div className="fixed bottom-5 right-5 z-50">
        <AnimatePresence mode="wait">
          {collapsed ? (
            // Collapsed State - Just ninja icon with glow
            <motion.div
              key="collapsed"
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative group cursor-pointer"
              onClick={handleExpand}
            >
              {/* Subtle glow animation */}
              <motion.div
                className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Ninja GIF with blend mode for seamless background integration */}
              <img
                src="/images/ninja.gif"
                alt="Study Ninja"
                className="w-20 h-20 relative z-10 mix-blend-multiply dark:mix-blend-screen opacity-90"
                style={{ mixBlendMode: 'multiply' }}
              />

              {/* Expand button on hover */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileHover={{ opacity: 1, scale: 1 }}
                className="absolute -top-2 -right-2 bg-purple-600 text-white rounded-full p-1.5 shadow-lg"
              >
                <Maximize2 className="w-4 h-4" />
              </motion.div>
            </motion.div>
          ) : (
            // Expanded State - Ninja + Speech Bubble
            <motion.div
              key="expanded"
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex items-end gap-3"
            >
              {/* Speech Bubble */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="relative"
              >
                {/* Glassmorphism container */}
                <div className="relative w-[300px] rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4">
                  {/* Header with buttons */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{isLoadingOrError ? '⏳' : '💡'}</span>
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                        {displayCategory}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCollapse}
                        className="p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
                        aria-label="Minimize"
                      >
                        <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleDismiss}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        aria-label="Dismiss"
                      >
                        <X className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Fact content */}
                  <p className={cn(
                    "text-sm leading-relaxed",
                    isLoadingOrError
                      ? "text-gray-500 dark:text-gray-400 italic"
                      : "text-gray-700 dark:text-gray-300"
                  )}>
                    {displayContent}
                  </p>
                </div>

                {/* Speech bubble tail (CSS triangle pointing to ninja) */}
                <div className="absolute bottom-4 -right-2 w-4 h-4 bg-white/90 dark:bg-gray-800/90 border-r border-b border-gray-200/50 dark:border-gray-700/50 transform rotate-45 translate-x-1/2" />
              </motion.div>

              {/* Ninja GIF with bounce animation and blend mode for stealth effect */}
              <motion.div
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex-shrink-0"
              >
                <img
                  src="/images/ninja.gif"
                  alt="Study Ninja"
                  className="w-20 h-20 mix-blend-multiply dark:mix-blend-screen opacity-90"
                  style={{ mixBlendMode: 'multiply' }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
