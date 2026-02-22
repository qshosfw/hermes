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
      <TooltipContent className="z-[9999] px-3 py-2 text-xs font-medium text-neutral-200 bg-neutral-950 border border-neutral-800 rounded-lg shadow-lg w-max max-w-[280px] leading-relaxed">
        {content}
      </TooltipContent>
    </ShadcnTooltip>
  );
};

export default Tooltip;