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
    <div ref={ref} className="bg-neutral-900/30 backdrop-blur-sm rounded-xl border border-neutral-800 overflow-hidden transition-all hover:border-neutral-700 scroll-mt-20">
      <button
        className="w-full flex justify-between items-start p-5 text-left group"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`step-content-${title.replace(/\s+/g, '-')}`}
      >
        <div>
            <h3 className="text-lg font-semibold text-neutral-200 group-hover:text-white transition-colors">{title}</h3>
            <p className="text-sm text-neutral-500 mt-1 leading-relaxed max-w-3xl">{description}</p>
        </div>
        <div className={`mt-1 p-1 rounded-full border border-neutral-800 bg-neutral-900 transition-all ${isExpanded ? 'bg-neutral-800 text-white' : 'text-neutral-500 group-hover:text-neutral-300'}`}>
            <ChevronDownIcon 
                className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} 
            />
        </div>
      </button>
      
      <div 
        id={`step-content-${title.replace(/\s+/g, '-')}`}
        className={`transition-all duration-400 ease-out grid ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className={`min-h-0 ${overflowHidden ? 'overflow-hidden' : ''}`}>
            <div className="px-5 pb-5 pt-0 border-t border-neutral-800/50 mt-2">
              <div className="pt-4">{children}</div>
            </div>
        </div>
      </div>
    </div>
  );
});

ProcessingStep.displayName = 'ProcessingStep';

export default ProcessingStep;