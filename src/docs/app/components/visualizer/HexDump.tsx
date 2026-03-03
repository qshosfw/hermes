import React, { useState, useMemo } from 'react';
import type { Highlight } from './types';
import Tooltip from './Tooltip';

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

  // Byte statistics
  const stats = useMemo(() => {
    let zeros = 0, nonPrintable = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 0) zeros++;
      if (data[i] < 32 || data[i] > 126) nonPrintable++;
    }
    return { zeros, nonPrintable, total: data.length, entropy: data.length > 0 ? ((data.length - zeros) / data.length * 100).toFixed(0) : '0' };
  }, [data]);

  // Convert byte to printable ASCII or dot
  const toPrintable = (byte: number) => {
    if (byte >= 32 && byte <= 126) return String.fromCharCode(byte);
    return '·';
  };

  const renderRows = () => {
    const rows = [];
    const wipeIndex = data.length * (sliderValue / 100);

    for (let i = 0; i < data.length; i += bytesPerRow) {
      const rowBytesSource = Array.from({ length: bytesPerRow }, (_, j) => i + j);
      const asciiChars: string[] = [];

      const hexCells = rowBytesSource.map((byteIndex, j) => {
        if (byteIndex >= data.length) {
          asciiChars.push(' ');
          return <span key={j} className="h-7 flex items-center justify-center"></span>;
        }

        const isAfter = !beforeData || byteIndex < wipeIndex;
        const currentData = isAfter ? data : beforeData;
        const byte = currentData[byteIndex];
        asciiChars.push(toPrintable(byte));

        const highlight = getHighlight(byteIndex);

        // Base style
        let cellClasses = "h-8 w-8 min-w-[2rem] flex items-center justify-center rounded-md transition-all duration-100 cursor-default text-[11px] font-mono font-medium tracking-wider";

        // Color Logic
        if (highlight) {
          cellClasses += ` ${highlight.color}`;
        } else {
          cellClasses += " bg-muted/50 text-muted-foreground border border-transparent";
          if (byte === 0) cellClasses += " text-muted-foreground/30"; // dim zeros
        }

        // Hover/Active Effects
        const isActive = activeHighlight && highlight?.label === activeHighlight;
        if (isActive) {
          cellClasses += " ring-2 ring-foreground z-10 scale-110";
        }

        const isClickable = onHighlightClick && highlight;
        if (isClickable) {
          cellClasses += " cursor-pointer hover:brightness-110 hover:scale-105 hover:shadow-md";
        } else {
          cellClasses += " hover:bg-accent hover:text-accent-foreground";
        }

        const cell = (
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

        if (highlight) {
          return (
            <Tooltip key={j} content={`${highlight.label} [0x${byteIndex.toString(16).padStart(2, '0')}]`} delayDuration={50}>
              {cell}
            </Tooltip>
          );
        }

        return cell;
      });

      rows.push(
        <div key={i} className="flex items-center font-mono text-xs leading-tight group">
          {/* Offset column */}
          <div className="w-12 text-muted-foreground/50 select-none mr-2 text-right py-1 group-hover:text-muted-foreground transition-colors text-[10px] font-bold tabular-nums">
            {i.toString(16).padStart(4, '0').toUpperCase()}
          </div>
          {/* Separator */}
          <div className="w-px h-5 bg-border mr-2 opacity-50" />
          {/* Hex grid */}
          <div className="flex-1 grid grid-cols-8 md:grid-cols-16 gap-1">
            {hexCells}
          </div>
          {/* ASCII column */}
          <div className="w-px h-5 bg-border mx-2 opacity-50 hidden md:block" />
          <div className="hidden md:flex items-center gap-0 text-[10px] text-muted-foreground/60 font-mono select-none tracking-widest whitespace-pre">
            {asciiChars.map((ch, ci) => (
              <span key={ci} className={`${ch !== '·' ? 'text-muted-foreground' : 'text-muted-foreground/25'}`}>{ch}</span>
            ))}
          </div>
        </div>
      );
    }
    return rows;
  };

  const content = (
    <>
      {/* Section Legend */}
      {uniqueHighlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 px-1 pb-3 border-b border-border/50">
          {uniqueHighlights.map(h => {
            const bgClass = h.color.split(' ').find(c => c.startsWith('bg-')) || 'bg-muted';
            return (
              <button
                key={h.label}
                onClick={() => onHighlightClick && onHighlightClick(h.label)}
                className={`flex items-center gap-1.5 text-[10px] py-1 px-2.5 rounded-md transition-all font-medium ${activeHighlight === h.label ? 'bg-accent text-accent-foreground ring-1 ring-ring' : 'bg-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
              >
                <span className={`w-2 h-2 rounded-sm ${bgClass} shadow-sm`}></span>
                <span className="uppercase tracking-wider">{h.label}</span>
                <span className="text-muted-foreground/50 font-mono tabular-nums">
                  {h.length}B
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Byte Statistics Bar */}
      <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 px-1">
        <span>{stats.total} bytes</span>
        <span className="text-muted-foreground/30">•</span>
        <span>{stats.total * 8} bits</span>
        <span className="text-muted-foreground/30">•</span>
        <span>{stats.entropy}% non-zero</span>
        <span className="text-muted-foreground/30">•</span>
        <span>{stats.zeros} null</span>
      </div>

      {/* Before/After Slider */}
      {beforeData && (
        <div className="mb-6 px-1">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
            <span>Original Source</span>
            <span>Processed Output</span>
          </div>
          <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-primary/50" style={{ width: `${sliderValue}%` }}></div>
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

      {/* Column Header */}
      <div className="flex items-center font-mono text-[8px] uppercase tracking-widest text-muted-foreground/40 mb-1 px-1">
        <div className="w-12 mr-2 text-right">Offset</div>
        <div className="w-px mr-2" />
        <div className="flex-1 grid grid-cols-8 md:grid-cols-16 gap-1">
          {Array.from({ length: bytesPerRow }, (_, i) => (
            <div key={i} className="h-4 flex items-center justify-center">{i.toString(16).toUpperCase()}</div>
          ))}
        </div>
        <div className="w-px mx-2 hidden md:block" />
        <div className="hidden md:block text-right" style={{ width: `${bytesPerRow}ch` }}>ASCII</div>
      </div>

      {/* Hex Rows */}
      <div className="space-y-[3px] overflow-x-auto pb-2">{renderRows()}</div>
    </>
  );

  if (!showContainer) {
    return content;
  }

  return (
    <div className="bg-muted/20 border border-border p-4 rounded-xl">
      {content}
    </div>
  );
};

export default HexDump;