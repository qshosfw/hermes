import React, { useState, useEffect } from 'react';

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

interface ConfigSectionProps {
  title: string;
  children: React.ReactNode;
  startExpanded?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  icon?: React.ReactNode;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({ 
    title, 
    children, 
    startExpanded = false, 
    isExpanded: controlledIsExpanded, 
    onToggle,
    icon
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(startExpanded);

  const isExpanded = controlledIsExpanded ?? internalIsExpanded;
  const [overflowHidden, setOverflowHidden] = useState(!isExpanded);

  useEffect(() => {
    if (isExpanded) {
        const timer = setTimeout(() => {
            setOverflowHidden(false);
        }, 300);
        return () => clearTimeout(timer);
    } else {
        setOverflowHidden(true);
    }
  }, [isExpanded]);


  const handleToggle = () => {
      if (onToggle) {
          onToggle();
      } else {
          setInternalIsExpanded(prev => !prev);
      }
  };

  return (
    <div className="border-b border-neutral-800 last:border-b-0">
      <button
        className="w-full flex justify-between items-center py-3 text-left group"
        onClick={handleToggle}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
            {icon && <div className="text-neutral-500 group-hover:text-neutral-300 transition-colors">{icon}</div>}
            <h3 className="text-sm font-medium text-neutral-400 group-hover:text-neutral-200 transition-colors uppercase tracking-wide">{title}</h3>
        </div>
        <ChevronDownIcon 
            className={`w-4 h-4 text-neutral-600 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} 
        />
      </button>
      
      <div 
        className={`transition-all duration-300 ease-in-out grid ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className={`min-h-0 ${overflowHidden ? 'overflow-hidden' : ''}`}>
            <div className="pb-5 pt-1 space-y-4">
              {children}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigSection;