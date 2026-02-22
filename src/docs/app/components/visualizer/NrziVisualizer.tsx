import React, { useState, useMemo } from 'react';
import InfoIcon from './icons/InfoIcon';
import PsdGraph from './PsdGraph';

interface NrziVisualizerProps {
  whitenedData: Uint8Array;
  nrziLevels: number[];
}

const NrziVisualizer: React.FC<NrziVisualizerProps> = ({ whitenedData, nrziLevels }) => {
    const [hoveredBitIndex, setHoveredBitIndex] = useState<number | null>(null);
    // Limit bits to show to ensure it fits nicely on screen without horizontal scroll
    const BITS_TO_SHOW = 48; 

    const bits = useMemo(() => {
        const bitArray: number[] = [];
        // Extract bits from bytes
        for (const byte of whitenedData) {
            for (let i = 7; i >= 0; i--) {
                bitArray.push((byte >> i) & 1);
            }
            if (bitArray.length >= BITS_TO_SHOW) break;
        }
        return bitArray.slice(0, BITS_TO_SHOW);
    }, [whitenedData]);

    const levels = useMemo(() => nrziLevels.slice(0, BITS_TO_SHOW), [nrziLevels]);

    // --- NRZI Path Construction ---
    const nrziPaths = useMemo(() => {
        const segments: React.ReactNode[] = [];
        const widthPerBit = 100 / BITS_TO_SHOW;
        
        const yHigh = 15; // +1
        const yLow = 85;  // -1

        levels.forEach((level, i) => {
            const xStart = i * widthPerBit;
            const xEnd = (i + 1) * widthPerBit;
            const y = level === 1 ? yHigh : yLow;
            const prevLevel = i > 0 ? levels[i-1] : level;
            const color = level === 1 ? '#3b82f6' : '#f43f5e'; // Blue-500 : Rose-500

            // Draw transition line if needed
            if (i > 0 && level !== prevLevel) {
                const yPrev = prevLevel === 1 ? yHigh : yLow;
                segments.push(
                    <line 
                        key={`trans-${i}`}
                        x1={`${xStart}%`} y1={`${yPrev}%`}
                        x2={`${xStart}%`} y2={`${y}%`}
                        stroke="#525252"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                    />
                );
            }

            // Draw horizontal level line
            segments.push(
                <line 
                    key={`level-${i}`}
                    x1={`${xStart}%`} y1={`${y}%`}
                    x2={`${xEnd}%`} y2={`${y}%`}
                    stroke={color} 
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                />
            );
        });
        return segments;
    }, [levels]);

    // --- FSK Path Construction (Continuous Phase) ---
    const fskPaths = useMemo(() => {
        const segments: React.ReactNode[] = [];
        const widthPerBit = 100 / BITS_TO_SHOW; // in percent
        
        // FSK Parameters
        const samplesPerBit = 20;
        const markFreq = 1.83; 
        const spaceFreq = 1.0; 
        const amplitude = 35; // % height
        const centerY = 50;   // % height

        let currentPhase = 0;

        levels.forEach((level, i) => {
            const freq = level === 1 ? markFreq : spaceFreq; // 1 -> Mark, -1 -> Space
            const color = level === 1 ? '#3b82f6' : '#f43f5e'; 
            
            let pathD = "";
            
            for (let s = 0; s <= samplesPerBit; s++) {
                const t = s / samplesPerBit;
                const x = (i + t) * widthPerBit;
                const angle = currentPhase + t * freq * 2 * Math.PI;
                const y = centerY - Math.sin(angle) * amplitude; 

                pathD += `${s === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
            }

            currentPhase += freq * 2 * Math.PI;
            currentPhase %= (2 * Math.PI);

            segments.push(
                <path
                    key={`fsk-${i}`}
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                />
            );
        });

        return segments;
    }, [levels]);

    const hoveredBit = hoveredBitIndex !== null ? bits[hoveredBitIndex] : null;
    const ruleText = hoveredBit === 0 ? "causes level TRANSITION" : (hoveredBit === 1 ? "causes NO transition" : "Hover over a bit");
    const ruleColor = hoveredBit === 0 ? "text-rose-400" : (hoveredBit === 1 ? "text-blue-400" : "text-neutral-500");

    return (
        <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 space-y-4">
            <div className="text-center py-2 bg-black/30 rounded-lg border border-neutral-800 mb-4">
                 <p className="text-sm text-neutral-400">
                    Input Bit <span className={`font-bold font-mono text-lg mx-2 ${ruleColor}`}>{hoveredBit ?? '?'}</span> {ruleText}
                 </p>
            </div>

            <div className="w-full relative select-none">
                {/* 1. Bit Stream Row */}
                <div className="flex w-full h-8 mb-2">
                    <div className="w-16 flex-shrink-0 text-[10px] text-neutral-500 font-mono uppercase tracking-wider flex items-center">Bits</div>
                    <div className="flex-1 flex border-b border-neutral-800">
                        {bits.map((bit, i) => (
                            <div 
                                key={i}
                                className={`flex-1 flex items-center justify-center text-xs font-mono cursor-default transition-all ${hoveredBitIndex === i ? 'bg-neutral-800 text-white font-bold scale-110 z-10 rounded-sm' : 'text-neutral-600'}`}
                                onMouseEnter={() => setHoveredBitIndex(i)}
                                onMouseLeave={() => setHoveredBitIndex(null)}
                            >
                                {bit}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. NRZI Graph Row */}
                <div className="flex w-full h-28 mb-4">
                    <div className="w-16 flex-shrink-0 flex flex-col justify-between py-4 text-[10px] text-neutral-500 font-mono border-r border-neutral-800 pr-2 text-right">
                        <span className="text-blue-500 font-bold">+1</span>
                        <span className="text-neutral-700">0</span>
                        <span className="text-rose-500 font-bold">-1</span>
                    </div>
                    <div className="flex-1 relative bg-black/20 rounded-r-lg overflow-hidden">
                        {/* Hover Highlight Overlay */}
                        {hoveredBitIndex !== null && (
                            <div 
                                className="absolute top-0 bottom-0 bg-white/5 border-x border-white/10 pointer-events-none transition-all duration-75"
                                style={{ 
                                    left: `${(hoveredBitIndex / BITS_TO_SHOW) * 100}%`, 
                                    width: `${100 / BITS_TO_SHOW}%` 
                                }}
                            />
                        )}
                        
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 100 100`}>
                            <line x1="0" y1="50" x2="100" y2="50" stroke="#333" strokeDasharray="2 2" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                            {nrziPaths}
                        </svg>
                    </div>
                </div>

                {/* 3. FSK Graph Row */}
                <div className="flex w-full h-28">
                    <div className="w-16 flex-shrink-0 flex flex-col justify-center text-[10px] text-neutral-500 font-mono border-r border-neutral-800 pr-2 text-right gap-1">
                        <span className="font-bold text-neutral-400">AFSK</span>
                        <span className="text-[9px] opacity-50">Audio Out</span>
                    </div>
                    <div className="flex-1 relative bg-black/20 rounded-r-lg overflow-hidden">
                         {hoveredBitIndex !== null && (
                            <div 
                                className="absolute top-0 bottom-0 bg-white/5 border-x border-white/10 pointer-events-none transition-all duration-75"
                                style={{ 
                                    left: `${(hoveredBitIndex / BITS_TO_SHOW) * 100}%`, 
                                    width: `${100 / BITS_TO_SHOW}%` 
                                }}
                            />
                        )}

                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 100 100`}>
                             <line x1="0" y1="50" x2="100" y2="50" stroke="#333" strokeDasharray="2 2" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                             {fskPaths}
                        </svg>
                    </div>
                </div>
                
                {/* X Axis Labels */}
                <div className="flex w-full mt-1">
                    <div className="w-16 flex-shrink-0"></div>
                    <div className="flex-1 flex justify-between text-[9px] text-neutral-600 font-mono px-1 uppercase tracking-wider">
                        <span>t=0</span>
                        <span>Time &rarr;</span>
                    </div>
                </div>
            </div>

             <div className="text-left font-sans text-xs text-neutral-400 bg-neutral-900/80 p-4 rounded-lg flex items-start space-x-3 border border-neutral-800 mt-4">
                <InfoIcon className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                    <p>
                        <span className="font-bold text-neutral-300">NRZI (Non-Return-to-Zero Inverted):</span> A '0' bit causes a transition in signal level, while a '1' bit maintains the current level.
                    </p>
                    <p>
                        <span className="font-bold text-neutral-300">AFSK (Audio Frequency-Shift Keying):</span> The signal modulates between two audio tones.
                        <span className="text-blue-400 font-bold ml-1">Mark (1) = 2200 Hz</span> (High Tone, +1 level).
                        <span className="text-rose-400 font-bold ml-1">Space (0) = 1200 Hz</span> (Low Tone, -1 level).
                        Note the phase continuity between tone switches to prevent spectral splatter.
                    </p>
                </div>
            </div>
            
            <div className="pt-4 border-t border-neutral-800">
                <PsdGraph />
            </div>
        </div>
    );
};

export default NrziVisualizer;