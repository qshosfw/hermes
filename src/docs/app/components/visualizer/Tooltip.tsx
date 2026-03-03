import React from 'react';
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delayDuration?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, className, delayDuration = 100 }) => {
  return (
    <ShadcnTooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        <span className={className || "inline-flex items-center"}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} avoidCollisions collisionPadding={8} className="z-[9999] px-3 py-1.5 text-[11px] font-medium text-popover-foreground bg-popover border border-border rounded-lg shadow-xl w-max max-w-[280px] leading-relaxed">
        {content}
      </TooltipContent>
    </ShadcnTooltip>
  );
};

export default Tooltip;