import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const selectedOption = options.find(opt => opt.value === value) || options[0];
  const Icon = selectedOption.icon;

  return (
    <Select value={value.toString()} onValueChange={(val) => onChange(parseInt(val, 10))}>
      <SelectTrigger className="w-full bg-black border-neutral-800 text-neutral-200">
        <div className="flex flex-row items-center justify-start gap-2 h-full">
          <Icon className="w-4 h-4 text-neutral-500" />
          <span className="truncate flex-grow text-left"><SelectValue placeholder="Select" /></span>
        </div>
      </SelectTrigger>
      <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-200">
        {options.map((option) => {
          const OptionIcon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value.toString()} className="focus:bg-neutral-800 focus:text-white cursor-pointer data-[state=checked]:bg-neutral-800">
              <div className="flex items-center">
                <OptionIcon className="w-4 h-4 mr-2 flex-shrink-0 text-neutral-500" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

export default CustomSelect;