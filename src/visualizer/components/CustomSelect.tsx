import React, { useState, useRef, useEffect } from 'react';

export interface CustomSelectOption {
  value: number;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: number;
  onChange: (value: number) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (newValue: number) => {
    onChange(newValue);
    setIsOpen(false);
  };

  const Icon = selectedOption.icon;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        className="w-full flex items-center justify-between bg-black border border-neutral-800 rounded-md py-2 px-3 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-400 transition-all hover:bg-neutral-900"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center">
            <Icon className="w-4 h-4 mr-2 text-neutral-500" />
            <span>{selectedOption.label}</span>
        </div>
        <svg
          className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          className="absolute z-50 mt-1 w-full bg-neutral-900 border border-neutral-800 shadow-xl rounded-md py-1 max-h-60 overflow-auto focus:outline-none sm:text-sm"
          tabIndex={-1}
          role="listbox"
          aria-activedescendant={`option-${selectedOption.value}`}
        >
          {options.map((option) => {
            const OptionIcon = option.icon;
            return (
              <li
                key={option.value}
                id={`option-${option.value}`}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center transition-colors ${option.value === value ? 'bg-neutral-800 text-white' : 'text-neutral-300 hover:bg-neutral-800/50'}`}
                role="option"
                aria-selected={option.value === value}
                onClick={() => handleSelect(option.value)}
              >
                <OptionIcon className={`w-4 h-4 mr-2 flex-shrink-0 ${option.value === value ? 'text-white' : 'text-neutral-500'}`} />
                <span className={`block truncate ${option.value === value ? 'font-medium' : 'font-normal'}`}>
                  {option.label}
                </span>
                {option.value === value && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-white">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;