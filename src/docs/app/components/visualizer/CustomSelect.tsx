import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { User, Users, Radio, Search } from 'lucide-react';

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

const addressIcons: Record<number, React.ReactNode> = {
  0: <User className="w-3.5 h-3.5 text-muted-foreground" />,
  1: <Users className="w-3.5 h-3.5 text-muted-foreground" />,
  2: <Radio className="w-3.5 h-3.5 text-muted-foreground" />,
  3: <Search className="w-3.5 h-3.5 text-muted-foreground" />,
};

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange }) => {
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <Select value={value.toString()} onValueChange={(val) => onChange(parseInt(val, 10))}>
      <SelectTrigger className="w-full bg-background border-border text-foreground">
        <div className="flex flex-row items-center justify-start gap-2 h-full">
          {addressIcons[value] || <Radio className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className="truncate flex-grow text-left text-sm">{selectedOption.label}</span>
        </div>
      </SelectTrigger>
      <SelectContent position="popper" className="bg-popover border-border text-popover-foreground">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value.toString()} className="cursor-pointer">
            <div className="flex items-center gap-2">
              {addressIcons[option.value] || <Radio className="w-3.5 h-3.5 text-muted-foreground" />}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CustomSelect;