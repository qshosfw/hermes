import React, { useState } from 'react';
import InfoIcon from './icons/InfoIcon';

interface OverheadChartProps {
    lengths: {
        preamble: number;
        syncWord: number;
        header: number;
        payload: number;
        signature: number;
        parity: number;
    };
}

const partsConfig = [
    { key: 'preamble' as keyof OverheadChartProps['lengths'], label: 'Preamble', color: 'bg-amber-600', text: 'text-amber-500', stroke: 'text-amber-500' },
    { key: 'syncWord' as keyof OverheadChartProps['lengths'], label: 'Sync Word', color: 'bg-lime-600', text: 'text-lime-500', stroke: 'text-lime-500' },
    { key: 'header' as keyof OverheadChartProps['lengths'], label: 'Header', color: 'bg-indigo-600', text: 'text-indigo-500', stroke: 'text-indigo-500' },
    { key: 'payload' as keyof OverheadChartProps['lengths'], label: 'Payload', color: 'bg-emerald-600', text: 'text-emerald-500', stroke: 'text-emerald-500' },
    { key: 'signature' as keyof OverheadChartProps['lengths'], label: 'Signature', color: 'bg-purple-600', text: 'text-purple-500', stroke: 'text-purple-500' },
    { key: 'parity' as keyof OverheadChartProps['lengths'], label: 'RS Parity', color: 'bg-rose-600', text: 'text-rose-500', stroke: 'text-rose-500' },
];

const OverheadChart: React.FC<OverheadChartProps> = ({ lengths }) => {
    const [hoveredPart, setHoveredPart] = useState<keyof OverheadChartProps['lengths'] | null>(null);
    const total = Object.values(lengths).reduce((sum, len) => sum + len, 0);
    const goodput = (lengths.payload / total) * 100;
    
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    return (
        <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
            <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Donut Chart */}
                <div className="relative w-48 h-48 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                        {/* Track */}
                        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#262626" strokeWidth="8" />
                        
                        {/* Segments */}
                        {partsConfig.map(part => {
                            const percentage = (lengths[part.key] / total);
                            const dasharray = percentage * circumference;
                            const strokeDashoffset = -accumulatedOffset;
                            accumulatedOffset += dasharray;
                            const isHovered = hoveredPart === part.key;
                            const isDimmed = hoveredPart !== null && !isHovered;

                            return (
                                <circle
                                    key={part.key}
                                    cx="50"
                                    cy="50"
                                    r={radius}
                                    fill="transparent"
                                    stroke="currentColor"
                                    className={`${part.stroke} transition-all duration-300 ease-out cursor-pointer ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                                    style={{ 
                                        transformOrigin: '50% 50%', 
                                        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                                    }}
                                    strokeWidth={isHovered ? "10" : "8"}
                                    strokeDasharray={`${dasharray} ${circumference}`}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="butt"
                                    onMouseEnter={() => setHoveredPart(part.key)}
                                    onMouseLeave={() => setHoveredPart(null)}
                                />
                            );
                        })}
                    </svg>
                    
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-3xl font-bold text-white font-mono tracking-tighter">{goodput.toFixed(1)}%</span>
                        <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium mt-1">Goodput</span>
                    </div>
                </div>

                {/* Legend / Data Table */}
                <div className="w-full flex-1">
                    <div className="space-y-1">
                        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-3 py-2 text-[10px] font-medium text-neutral-500 uppercase tracking-wider border-b border-neutral-800 mb-2">
                            <span>Part</span>
                            <span></span>
                            <span className="text-right">Size</span>
                            <span className="text-right">Ratio</span>
                        </div>
                        {partsConfig.map(part => {
                            const size = lengths[part.key];
                            const percentage = (size / total) * 100;
                            const isHovered = hoveredPart === part.key;
                            const isDimmed = hoveredPart !== null && !isHovered;

                            return (
                                <div 
                                    key={part.key} 
                                    className={`group flex items-center justify-between p-2 rounded-lg transition-all duration-200 cursor-pointer ${isHovered ? 'bg-white/5' : 'hover:bg-white/5'} ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                                    onMouseEnter={() => setHoveredPart(part.key)}
                                    onMouseLeave={() => setHoveredPart(null)}
                                >
                                    <div className="flex items-center gap-3 min-w-[120px]">
                                        <div className={`w-2 h-8 rounded-full ${part.color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}></div>
                                        <span className={`text-sm font-medium transition-colors ${isHovered ? 'text-white' : 'text-neutral-400'}`}>{part.label}</span>
                                    </div>
                                    
                                    {/* Visual Bar */}
                                    <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden max-w-[100px] hidden sm:block">
                                        <div className={`h-full ${part.color}`} style={{ width: `${percentage}%` }}></div>
                                    </div>

                                    <div className="flex items-center gap-6 ml-4">
                                        <span className="font-mono text-sm text-neutral-300 w-12 text-right">{size} B</span>
                                        <span className={`font-mono text-sm w-16 text-right font-bold ${part.text}`}>{percentage.toFixed(1)}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Analysis Box */}
            <div className="mt-6 border-t border-neutral-800 pt-4">
                <div className="flex items-start gap-3 text-xs text-neutral-400">
                    <InfoIcon className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                         <span className="font-semibold text-neutral-200">Protocol Overhead Analysis:</span> "Goodput" represents the percentage of the total physical frame ({total} bytes) that is actual user payload ({lengths.payload} bytes). The remaining {100 - goodput}% consists of overhead required for synchronization (Preamble, Sync Word), routing (Header), integrity (Signature), and error correction (FEC Parity).
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverheadChart;