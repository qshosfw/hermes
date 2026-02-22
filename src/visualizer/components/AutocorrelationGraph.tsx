import React, { useMemo } from 'react';
import InfoIcon from './icons/InfoIcon';

interface AutocorrelationGraphProps {
  syncWord: Uint8Array;
}

const calculateAutocorrelation = (syncWord: Uint8Array): number[] => {
    if (syncWord.length === 0) return [];
    const bits: number[] = [];
    syncWord.forEach(byte => {
        for (let i = 7; i >= 0; i--) {
            bits.push(((byte >> i) & 1) ? 1 : -1);
        }
    });

    const N = bits.length;
    if (N === 0) return [];
    
    const correlation: number[] = [];
    for (let k = -N + 1; k < N; k++) {
        let sum = 0;
        for (let n = 0; n < N; n++) {
            if (n - k >= 0 && n - k < N) {
                sum += bits[n] * bits[n - k];
            }
        }
        correlation.push(sum);
    }
    return correlation;
};

const AutocorrelationGraph: React.FC<AutocorrelationGraphProps> = ({ syncWord }) => {
    const correlationData = useMemo(() => calculateAutocorrelation(syncWord), [syncWord]);
    
    if (!correlationData || correlationData.length === 0) {
        return <div className="text-xs text-neutral-500 text-center p-4">Enter a valid Sync Word to see its autocorrelation.</div>;
    }

    const peakValue = syncWord.length * 8;
    const width = 500;
    const height = 120;
    const barWidth = width / correlationData.length;
    const zeroLagIndex = Math.floor(correlationData.length / 2);

    return (
        <div className="bg-black/20 p-3 rounded-lg border border-neutral-800 mt-2">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Sync Word Autocorrelation</h4>
            <div className="w-full flex justify-center">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[500px]">
                    <line x1="0" y1={height / 2} x2={width} y2={height/2} stroke="#404040" strokeWidth="1"/>
                    {correlationData.map((value, i) => {
                        const isPeak = i === zeroLagIndex;
                        const barHeight = Math.abs(value / peakValue) * (height / 2);
                        const y = value >= 0 ? (height / 2) - barHeight : (height / 2);
                        return (
                            <rect
                                key={i}
                                x={i * barWidth}
                                y={y}
                                width={Math.max(barWidth - 1, 1)}
                                height={barHeight}
                                fill={isPeak ? '#3b82f6' : '#525252'}
                                className="transition-all"
                            />
                        );
                    })}
                     <line x1={width/2} y1="0" x2={width/2} y2={height} stroke="#404040" strokeWidth="1" strokeDasharray="2 2" />
                </svg>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-500 mt-1 px-1">
                <span>Lag: -{zeroLagIndex}</span>
                <span>0</span>
                <span>+{zeroLagIndex}</span>
            </div>
             <div className="text-left font-sans text-xs text-neutral-400 bg-black/40 mt-3 p-3 rounded-md flex items-start space-x-2 border border-neutral-800">
                <InfoIcon className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                    <span className="font-bold text-neutral-200">Analysis:</span> A good sync word exhibits a sharp, single peak at zero lag and minimal correlation elsewhere. This property allows the receiver to reliably detect the start of a packet, even in noisy conditions.
                </div>
            </div>
        </div>
    );
};

export default AutocorrelationGraph;