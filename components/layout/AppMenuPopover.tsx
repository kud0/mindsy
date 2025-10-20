"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Popover from '@radix-ui/react-popover';
import { 
  Grid3X3,
  MoreHorizontal,
  FileText, 
  GraduationCap, 
  Clock, 
  Calendar,
  PenTool,
  Home,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

interface AppItem {
  id: string;
  name: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bgColor: string;
}

const apps: AppItem[] = [
  {
    id: 'home',
    name: 'Home',
    icon: Home,
    href: '/dashboard',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  {
    id: 'lectures',
    name: 'Lectures',
    icon: FileText,
    href: '/dashboard/lectures',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  },
  {
    id: 'exams',
    name: 'Exams',
    icon: GraduationCap,
    href: '/dashboard/exams',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro',
    icon: Clock,
    href: '/dashboard/pomodoro',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30'
  },
  {
    id: 'schedule',
    name: 'Schedule',
    icon: Calendar,
    href: '/dashboard/schedule',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30'
  },
  {
    id: 'essay',
    name: 'Essay',
    icon: PenTool,
    href: '/dashboard/essay',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30'
  }
];

export function AppMenuPopover() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  // Add custom styles to override global CSS
  React.useEffect(() => {
    if (open) {
      const style = document.createElement('style');
      style.textContent = `
        [data-radix-popper-content-wrapper] {
          background: transparent !important;
          border: none !important;
        }
      `;
      document.head.appendChild(style);
      return () => document.head.removeChild(style);
    }
  }, [open]);

  const handleAppClick = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild suppressHydrationWarning>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="relative [&_svg]:!size-7 rounded-[4px] hover:bg-gray-300 dark:hover:bg-gray-800"
            aria-label="Apps menu"
          >
            <div className="h-7 w-7 grid grid-cols-3 p-1">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-1 h-1 bg-current rounded-full" />
              ))}
            </div>
          </Button>
        </motion.div>
      </Popover.Trigger>
      <Popover.Portal>
        <AnimatePresence>
          {open && (
            <Popover.Content
              className="z-50 w-[320px] rounded-xl bg-white dark:bg-gray-900 p-4 text-foreground shadow-lg dark:shadow-2xl border border-gray-200 dark:border-gray-700 !outline-none"
              sideOffset={5}
              align="end"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="bg-transparent"
              >
                {/* Header */}
                <motion.div 
                  className="flex items-center justify-between mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.2 }}
                >
                  <h3 className="font-semibold text-sm">Apps</h3>
                  <Popover.Close asChild>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  </Popover.Close>
                </motion.div>

                {/* App Grid */}
                <motion.div 
                  className="grid grid-cols-3 gap-3 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                >
                  {apps.map((app, index) => {
                    const Icon = app.icon;
                    return (
                      <motion.button
                        key={app.id}
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.1 + (index * 0.03), duration: 0.2 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAppClick(app.href)}
                        className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-accent transition-colors"
                      >
                        <motion.div 
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            app.bgColor
                          )}
                          whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Icon className={cn("w-7 h-7", app.color)} />
                        </motion.div>
                        <span className="text-xs font-medium text-foreground/80">
                          {app.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>

                {/* Theme Toggle */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.2 }}
                  className="pt-3 border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-medium text-foreground/70">
                      Theme
                    </span>
                    <ThemeToggle />
                  </div>
                </motion.div>

              </motion.div>
            </Popover.Content>
          )}
        </AnimatePresence>
      </Popover.Portal>
    </Popover.Root>
  );
}