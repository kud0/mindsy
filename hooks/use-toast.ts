"use client"

// Simplified toast hook that works with Sonner
// Since we're using Sonner for toasts, this is a basic implementation

import { toast as sonnerToast } from "sonner"

export type ToastProps = {
  title?: string
  description?: string
  action?: React.ReactElement
  variant?: "default" | "destructive"
}

export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastProps) => {
      if (variant === "destructive") {
        sonnerToast.error(title, { description })
      } else {
        sonnerToast.success(title, { description })
      }
    },
    dismiss: sonnerToast.dismiss,
  }
}