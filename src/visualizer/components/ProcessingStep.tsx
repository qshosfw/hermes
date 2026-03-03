import React, { useState, useEffect, forwardRef } from 'react';

interface ProcessingStepProps {
  title: string;
  description: string;
  children: React.ReactNode;
  startExpanded?: boolean;
}

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m19.5 8.25-7.5 7.5-7.5-7.5"
    />
  </svg>
);


const ProcessingStep = forwardRef<HTMLDivElement, ProcessingStepProps>(({ title, description, children, startExpanded = false }, ref) => {
  const [isExpanded, setIsExpanded] = useState(startExpanded);
  const [overflowHidden, setOverflowHidden] = useState(!startExpanded);

  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        setOverflowHidden(false);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setOverflowHidden(true);
    }
  }, [isExpanded]);


  return (
    <div ref={ref} className="bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-800/60 overflow-hidden transition-all hover:border-zinc-700/80 shadow-sm scroll-mt-20">
      <button
        className="w-full flex justify-between items-start p-5 text-left group"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`step-content-${title.replace(/\s+/g, '-')}`}
      >
        <div className="flex-grow">
          <h3 className="text-sm font-bold text-zinc-100 tracking-tight transition-colors group-hover:text-white uppercase tracking-widest">{title}</h3>
          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed max-w-2xl font-medium">{description}</p>
        </div>
        <div className={`mt-0.5 p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 transition-all ${isExpanded ? 'bg-zinc-800 text-white border-zinc-700' : 'text-zinc-500 group-hover:text-zinc-300 group-hover:bg-zinc-900'}`}>
          <ChevronDownIcon
            className={`w-3.5 h-3.5 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
          />
        </div>
      </button>

      <div
        id={`step-content-${title.replace(/\s+/g, '-')}`}
        className={`transition-all duration-400 ease-out grid ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className={`min-h-0 ${overflowHidden ? 'overflow-hidden' : ''}`}>
          <div className="px-5 pb-6 pt-0 border-t border-zinc-800/40">
            <div className="pt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
});

ProcessingStep.displayName = 'ProcessingStep';

export default ProcessingStep;