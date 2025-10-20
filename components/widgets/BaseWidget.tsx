"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BaseWidgetProps {
  title: string;
  icon?: React.ElementType;
  iconImage?: string;
  iconSize?: 'default' | 'large';
  href: string;
  color?: string;
  bgColor?: string;
  loading?: boolean;
  error?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export function BaseWidget({
  title,
  icon: Icon,
  iconImage,
  iconSize = 'default',
  href,
  color = "text-primary",
  bgColor = "bg-primary/100",
  loading = false,
  error,
  children,
  actions,
  badge
}: BaseWidgetProps) {
  const router = useRouter();
  const iconSizeClass = iconSize === 'large' ? 'w-10 h-10' : 'w-8 h-8';

  const handleNavigate = () => {
    router.push(href);
  };

  return (
    <motion.div
      className="group widget-container flex flex-col h-full rounded-[18px] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.12),0_3px_8px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.05)] transition-all duration-300"
      whileHover={{ scale: 1.008, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Apple-style Header Section - Increased padding */}
      <div className="flex items-center justify-between px-5 py-5 bg-card/95 backdrop-blur-md rounded-t-[18px]">
        <div
          className="flex items-center gap-3 flex-1 cursor-pointer rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-muted/50"
          onClick={handleNavigate}
        >
          <div
            className="w-12 h-12 rounded-[8px] bg-transparent flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
          >
            {iconImage ? (
              <img
                src={iconImage}
                alt={title}
                className={`${iconSizeClass} object-contain`}
              />
            ) : Icon ? (
              <Icon className={`${iconSizeClass} text-primary-foreground`} />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-[20px] text-foreground font-semibold">{title}</h3>
            {badge}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 [&>button]:h-10 [&>button]:w-10 [&>button]:rounded-[4px] [&>button]:text-muted-foreground [&>button]:hover:bg-muted [&>button]:hover:text-foreground [&>button]:transition-colors">
            {actions}
          </div>
        )}
      </div>

      {/* Content Area - Increased padding from px-4 py-3 to px-5 py-4 */}
      <div className="widget-content flex-1 overflow-hidden px-5 py-4 bg-card/95 backdrop-blur-md rounded-b-[18px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground text-center">{error}</p>
          </div>
        ) : (
          <div className="text-foreground">
            {children}
          </div>
        )}
      </div>

    </motion.div>
  );
}