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
  href: string;
  color?: string;
  bgColor?: string;
  loading?: boolean;
  error?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function BaseWidget({ 
  title, 
  icon: Icon, 
  iconImage,
  href, 
  color = "text-primary",
  bgColor = "bg-primary/100",
  loading = false,
  error,
  children,
  actions
}: BaseWidgetProps) {
  const router = useRouter();

  const handleNavigate = () => {
    router.push(href);
  };

  return (
    <motion.div 
      className="widget-container flex flex-col h-full rounded-[18px] overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.25),0_4px_12px_rgba(0,0,0,0.15),0_2px_6px_rgba(0,0,0,0.1),20px_0_30px_rgba(0,0,0,0.15),-2px_0_8px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_35px_rgba(0,0,0,0.35),0_6px_16px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15),-6px_0_20px_rgba(0,0,0,0.2),-3px_0_12px_rgba(0,0,0,0.15)] transition-all duration-300"
      whileHover={{ scale: 1.008, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Apple-style Header Section */}
      <div className="flex items-center justify-between px-4 py-5 bg-white/50 backdrop-blur-md rounded-t-[18px]">
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors"
          onClick={handleNavigate}
        >
          <div 
            className="w-10 h-10 rounded-[8px] bg-gray-800/90 border border-gray-700/50 shadow-sm flex items-center justify-center"
          >
            {iconImage ? (
              <img 
                src={iconImage} 
                alt={title} 
                className="w-6 h-6 object-contain"
              />
            ) : Icon ? (
              <Icon className="w-6 h-6 text-white" />
            ) : null}
          </div>
          <h3 className="text-[20px] text-gray-900 font-semibold">{title}</h3>
        </div>
        {actions && (
          <div className="flex items-center gap-2 [&>button]:h-10 [&>button]:w-10 [&>button]:rounded-[4px] [&>button]:text-gray-700 [&>button]:hover:bg-black/10 [&>button]:transition-colors">
            {actions}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="widget-content flex-1 overflow-hidden px-4 py-3 bg-white/90 backdrop-blur-md rounded-b-[18px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-600 text-center">{error}</p>
          </div>
        ) : (
          <div className="text-gray-900">
            {children}
          </div>
        )}
      </div>

    </motion.div>
  );
}