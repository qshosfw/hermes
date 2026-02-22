import React, { useState } from 'react';
import InfoIcon from './icons/InfoIcon';

const PsdGraph: React.FC = () => {
    const [hovered, setHovered] = useState<'space' | 'mark' | null>(null);

    const width = 500;
    const height = 120;
    const freqMax = 3000;
    const spaceFreq = 1200;
    const markFreq = 2200;

    const freqToX = (freq: number) => (freq / freqMax) * width;

    const generatePeak = (centerFreq: number, peakDb: number, bandwidth: number) => {
        let path = '';
        for (let freq = centerFreq - bandwidth * 2; freq <= centerFreq + bandwidth * 2; freq += 20) {
            const power = peakDb * Math.exp(-Math.pow((freq - centerFreq) / bandwidth, 2));
            const x = freqToX(freq);
            const y = height - (power / -40) * height;
            if (path === '') {
                path += `M ${x} ${height}`;
            }
            path += ` L ${x} ${y}`;
        }
        path += ` L ${freqToX(centerFreq + bandwidth * 2)} ${height} Z`;
        return path;
    };

    const spacePath = generatePeak(spaceFreq, -10, 300);
    const markPath = generatePeak(markFreq, -10, 300);

    return (
        <div className="bg-black/20 p-3 rounded-lg border border-neutral-800" onMouseLeave={() => setHovered(null)}>
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 text-center">AFSK1200 Power Spectral Density (PSD)</h4>
            <div className="relative">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
                    <defs>
                        <linearGradient id="spaceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={hovered === 'space' ? 0.7 : 0.5} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                        </linearGradient>
                         <linearGradient id="markGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={hovered === 'mark' ? 0.7 : 0.5} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="0" y1={height} x2={width} y2={height} stroke="#404040" strokeWidth="1"/>
                    {[...Array(5)].map((_, i) => (
                        <line key={i} x1="0" y1={i * (height/4)} x2={width} y2={i * (height/4)} stroke="#404040" strokeWidth="0.5" strokeDasharray="2 2" />
                    ))}
                    
                    {/* Peaks */}
                    <path d={spacePath} fill="url(#spaceGradient)" stroke="#ef4444" strokeWidth={hovered === 'space' ? 2 : 1.5} className="transition-all" onMouseEnter={() => setHovered('space')} />
                    <path d={markPath} fill="url(#markGradient)" stroke="#3b82f6" strokeWidth={hovered === 'mark' ? 2 : 1.5} className="transition-all" onMouseEnter={() => setHovered('mark')} />

                    {/* Labels */}
                    <text x={freqToX(spaceFreq)} y={height - 5} fill="#ef4444" textAnchor="middle" fontSize="10" className="font-sans font-semibold pointer-events-none">Space</text>
                    <text x={freqToX(markFreq)} y={height - 5} fill="#3b82f6" textAnchor="middle" fontSize="10" className="font-sans font-semibold pointer-events-none">Mark</text>

                    {/* Hover Tooltip */}
                    {hovered && (
                        <g className="pointer-events-none transition-opacity" style={{ opacity: 1 }}>
                            <line x1={freqToX(hovered === 'space' ? spaceFreq : markFreq)} y1="0" x2={freqToX(hovered === 'space' ? spaceFreq : markFreq)} y2={height} stroke="white" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="3 3" />
                            <rect x={freqToX(hovered === 'space' ? spaceFreq : markFreq) + (hovered === 'space' ? 8 : -68)} y={10} width="60" height="20" fill="rgba(23, 23, 23, 0.9)" rx="4" stroke="#404040" strokeWidth="1" />
                            <text x={freqToX(hovered === 'space' ? spaceFreq : markFreq) + (hovered === 'space' ? 38 : -38)} y={23} fill="#e5e5e5" textAnchor="middle" fontSize="10" className="font-mono">{hovered === 'space' ? spaceFreq : markFreq} Hz</text>
                        </g>
                    )}
                </svg>
                <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-between text-xs text-neutral-500 font-mono py-1">
                    <span>0dB</span>
                    <span>-40dB</span>
                </div>
            </div>
             <div className="flex justify-between text-xs font-mono text-neutral-500 mt-1 px-1">
                <span>0 Hz</span>
                <span>{freqMax} Hz</span>
            </div>
        </div>
    );
};

export default PsdGraph;