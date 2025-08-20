import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Info, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TierProgressBarProps {
  plan: 'free' | 'student';
  minutesUsed: number;
  minutesLimit: number;
}

export function TierProgressBar({ plan, minutesUsed, minutesLimit }: TierProgressBarProps) {
  const percentage = Math.min((minutesUsed / minutesLimit) * 100, 100);
  const remainingMinutes = Math.max(minutesLimit - minutesUsed, 0);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const getPlanColor = () => {
    if (isAtLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return plan === 'student' 
      ? 'bg-gradient-to-r from-green-500 to-teal-500'
      : 'bg-blue-500';
  };

  const getPlanLabel = () => {
    return plan === 'student' ? 'Student' : 'Free';
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hr`;
    }
    return `${hours} hr ${mins} min`;
  };

  return (
    <TooltipProvider>
      <div className="p-4 border-b">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {getPlanLabel()} Plan
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs">
                    Your {getPlanLabel()} plan includes {formatMinutes(minutesLimit)} of audio processing per month.
                    {plan === 'free' && ' Upgrade to Student for more minutes and features.'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            {isNearLimit && !isAtLimit && (
              <AlertCircle className="h-3 w-3 text-yellow-500" />
            )}
            {isAtLimit && (
              <AlertCircle className="h-3 w-3 text-red-500" />
            )}
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
              <div 
                className={cn(
                  "h-full w-full flex-1 transition-all",
                  isAtLimit && "bg-red-500",
                  isNearLimit && !isAtLimit && "bg-yellow-500",
                  !isNearLimit && !isAtLimit && getPlanColor()
                )}
                style={{ transform: `translateX(-${100 - percentage}%)` }}
              />
            </div>
          </div>

          {/* Usage Text */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {formatMinutes(minutesUsed)} used
            </span>
            <span className={cn(
              "text-xs font-medium",
              isAtLimit && "text-red-500",
              isNearLimit && !isAtLimit && "text-yellow-500",
              !isNearLimit && !isAtLimit && "text-muted-foreground"
            )}>
              {isAtLimit ? 'Limit reached' : `${formatMinutes(remainingMinutes)} left`}
            </span>
          </div>

          {/* Warning/Upgrade Message */}
          {isAtLimit && (
            <div className="bg-red-50 dark:bg-red-950/20 rounded-md p-2">
              <p className="text-xs text-red-600 dark:text-red-400">
                You've reached your monthly limit. Upgrade to continue processing audio.
              </p>
            </div>
          )}
          {isNearLimit && !isAtLimit && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-md p-2">
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                You're approaching your monthly limit. Consider upgrading soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}