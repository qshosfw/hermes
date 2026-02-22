import React from 'react';

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number;
  min: number;
  max: number;
}

const Slider: React.FC<SliderProps> = ({ value, min, max, className = '', style, ...props }) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      {...props}
      className={`w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${className}`}
      style={{
        ...style,
        backgroundImage: `linear-gradient(to right, #3b82f6 ${percentage}%, #262626 ${percentage}%)`
      }}
    />
  );
};

export default Slider;