import React, { useState, useMemo } from 'react';
import { Highlight } from '../types';

interface HexDumpProps {
  data: Uint8Array;
  beforeData?: Uint8Array;
  highlights?: Highlight[];
  bytesPerRow?: number;
  onByteHover?: (index: number | null) => void;
  onHighlightClick?: (label: string) => void;
  activeHighlight?: string | null;
  showContainer?: boolean;
}

const HexDump: React.FC<HexDumpProps> = ({ 
    data, 
    beforeData, 
    highlights = [], 
    bytesPerRow = 16, 
    onByteHover, 
    onHighlightClick, 
    activeHighlight,
    showContainer = true
}) => {
  const [sliderValue, setSliderValue] = useState(100);

  const getHighlight = (index: number) => {
    const isRepeating = highlights.length > 0 && highlights.some(h => h.index + h.length <= bytesPerRow);
    if (isRepeating) {
      const patternLength = highlights.reduce((acc, h) => acc + h.length, 0);
      const indexInPattern = index % patternLength;
      let cumulativeLength = 0;
      for (const h of highlights) {
          if (indexInPattern >= cumulativeLength && indexInPattern < cumulativeLength + h.length) {
              return h;
          }
          cumulativeLength += h.length;
      }
      return undefined;
    }
    return highlights.find(h => index >= h.index && index < h.index + h.length);
  };

  const uniqueHighlights = useMemo(() => {
    return highlights.filter((highlight, index, self) =>
        index === self.findIndex(h => h.label === highlight.label)
    );
  }, [highlights]);

  const renderRows = () => {
    const rows = [];
    const wipeIndex = data.length * (sliderValue / 100);

    for (let i = 0; i < data.length; i += bytesPerRow) {
      const rowBytesSource = Array.from({ length: bytesPerRow }, (_, j) => i + j);
      rows.push(
        <div key={i} className="flex items-center font-mono text-xs md:text-sm leading-tight group">
          <div className="w-10 text-neutral-600 select-none mr-3 text-right py-1 group-hover:text-neutral-400 transition-colors text-[10px] pt-1.5">{i.toString(16).padStart(4, '0')}</div>
          <div className="flex-1 grid grid-cols-8 md:grid-cols-16 gap-1">
            {rowBytesSource.map((byteIndex, j) => {
              if (byteIndex >= data.length) return <span key={j}></span>;

              const isAfter = !beforeData || byteIndex < wipeIndex;
              const currentData = isAfter ? data : beforeData;
              const byte = currentData[byteIndex];

              const highlight = getHighlight(byteIndex);
              
              // Base style
              let cellClasses = "h-7 flex items-center justify-center rounded-[4px] transition-all duration-100 cursor-default";
              
              // Color Logic
              if (highlight) {
                  // If highlighted, use the solid color from config
                  cellClasses += ` ${highlight.color} font-medium`;
              } else {
                  // Default unhighlighted byte
                  cellClasses += " bg-neutral-800/50 text-neutral-400 border border-transparent";
                  if (byte === 0) cellClasses += " text-neutral-600"; // dim zeros
              }

              // Hover/Active Effects
              const isActive = activeHighlight && highlight?.label === activeHighlight;
              if (isActive) {
                  cellClasses += " ring-2 ring-white z-10 scale-110";
              }
              
              const isClickable = onHighlightClick && highlight;
              if (isClickable) {
                  cellClasses += " cursor-pointer hover:brightness-110 hover:scale-105 hover:shadow-md";
              } else {
                  // Just simple hover for non-interactive
                  cellClasses += " hover:bg-neutral-700 hover:text-white";
              }

              return (
                <div 
                  key={j} 
                  className={cellClasses}
                  onMouseEnter={() => onByteHover && onByteHover(byteIndex)}
                  onMouseLeave={() => onByteHover && onByteHover(null)}
                  onClick={() => isClickable && onHighlightClick(highlight.label)}
                >
                  {byte.toString(16).padStart(2, '0').toUpperCase()}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return rows;
  };

  const content = (
    <>
      {beforeData && (
         <div className="mb-6 px-1">
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-neutral-500 mb-2 font-medium">
                <span>Original Source</span>
                <span>Processed Output</span>
            </div>
            <div className="relative h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                 <div className="absolute top-0 left-0 h-full bg-neutral-600" style={{ width: `${sliderValue}%` }}></div>
                 <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={sliderValue} 
                    onChange={e => setSliderValue(Number(e.target.value))}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Before/After slider"
                />
            </div>
         </div>
      )}
      {uniqueHighlights.length > 0 && (
         <div className="flex flex-wrap gap-2 mb-4 px-1 pb-2 border-b border-neutral-800/50">
            {uniqueHighlights.map(h => {
                // Extract just the bg color for the dot
                const bgClass = h.color.split(' ').find(c => c.startsWith('bg-')) || 'bg-neutral-500';
                return (
                    <button 
                    key={h.label} 
                    onClick={() => onHighlightClick && onHighlightClick(h.label)}
                    className={`flex items-center space-x-2 text-xs py-1.5 px-3 rounded-md transition-all ${activeHighlight === h.label ? 'bg-neutral-800 text-white ring-1 ring-neutral-700' : 'bg-transparent text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${bgClass} shadow-sm`}></span>
                        <span className="font-medium">{h.label}</span>
                    </button>
                )
            })}
        </div>
      )}
      <div className="space-y-1 overflow-x-auto pb-2">{renderRows()}</div>
    </>
  );

  if (!showContainer) {
    return content;
  }
  
  return (
    <div className="bg-black/40 border border-neutral-800 p-4 rounded-xl">
      {content}
    </div>
  );
};

export default HexDump;