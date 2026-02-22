import React, { useState, useEffect, useMemo } from 'react';
import InfoIcon from './icons/InfoIcon';
import HexDump from './HexDump';

interface InterleavingVisualizerProps {
  data: Uint8Array;
  parity: Uint8Array;
}

const Byte: React.FC<{ value: number; isVisible: boolean; type: 'data' | 'parity' | 'placeholder'; responsive?: boolean }> = ({ value, isVisible, type, responsive = false }) => {
    const sizeClasses = responsive ? "w-full aspect-square" : "w-10 h-10";
    const fontClasses = responsive ? "text-[0.6rem] sm:text-xs" : "text-sm";
    
    let colorClass = '';
    switch(type) {
        case 'data': colorClass = 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20'; break;
        case 'parity': colorClass = 'bg-rose-600 text-white shadow-lg shadow-rose-900/20'; break;
        case 'placeholder': colorClass = 'bg-neutral-800 ring-1 ring-neutral-700'; break;
    }

    const baseClasses = `${sizeClasses} flex items-center justify-center font-mono ${fontClasses} rounded-lg transition-all duration-300 ease-in-out border border-white/10`;
    const visibilityClass = isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50';

    return (
        <div className={`${baseClasses} ${visibilityClass} ${colorClass}`}>
            {type !== 'placeholder' ? value.toString(16).padStart(2, '0').toUpperCase() : ''}
        </div>
    );
};

const InterleavingVisualizer: React.FC<InterleavingVisualizerProps> = ({ data, parity }) => {
    const [step, setStep] = useState(0);
    const totalSteps = 32;

    const interleavedData = useMemo(() => {
        const interleaved = new Uint8Array(128);
        for (let i = 0; i < 32; i++) {
            interleaved.set(data.slice(i * 3, i * 3 + 3), i * 4);
            interleaved[i * 4 + 3] = parity[i];
        }
        return interleaved;
    }, [data, parity]);

    const visibleData = useMemo(() => {
        return interleavedData.slice(0, step * 4);
    }, [interleavedData, step]);

    // Updated highlights to use solid colors matching the new scheme
    const interleavedHighlights = useMemo(() => ([
        { index: 0, length: 3, color: 'bg-cyan-600 text-white shadow-sm ring-1 ring-white/10', label: 'Data' },
        { index: 3, length: 1, color: 'bg-rose-600 text-white shadow-sm ring-1 ring-white/10', label: 'Parity' },
    ]), []);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setStep(Number(e.target.value));
    };

    const sourceDataChunks = useMemo(() => Array.from({ length: 32 }, (_, i) => data.slice(i * 3, i * 3 + 3)), [data]);

    return (
        <div className="bg-neutral-900/30 p-6 rounded-xl border border-neutral-800 space-y-8">
            <div className="space-y-3">
                <div className="flex justify-between items-center text-xs text-neutral-400 font-medium uppercase tracking-wide">
                    <span>Interleaving Progress</span>
                    <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-300">Block {step} / {totalSteps}</span>
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min="0"
                        max={totalSteps}
                        value={step}
                        onChange={handleSliderChange}
                        className="flex-grow w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        aria-label="Interleaving step slider"
                    />
                </div>
            </div>

            {step < totalSteps && (
                <div className="animate-fade-in">
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 pl-1">Processing Block {step + 1}</h4>
                    <div className="flex items-center justify-center gap-4 sm:gap-8 p-6 bg-black/20 border border-neutral-800 rounded-xl">
                        <div className="flex flex-col items-center gap-3">
                            <span className="text-[10px] uppercase text-cyan-500 font-bold tracking-wide">Payload Chunk (3B)</span>
                            <div className="flex items-center gap-2">
                                {Array.from(sourceDataChunks[step] || [0,0,0]).map((byte, i) => (
                                <Byte key={i} value={byte} type="data" isVisible={true} />
                                ))}
                            </div>
                        </div>
                        <div className="text-2xl text-neutral-600 font-light mt-6">+</div>
                        <div className="flex flex-col items-center gap-3">
                            <span className="text-[10px] uppercase text-rose-500 font-bold tracking-wide">Parity (1B)</span>
                            <div className="flex items-center">
                                <Byte value={parity[step] || 0} type="parity" isVisible={true} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 pl-1">Interleaved Output Frame</h4>
                <div className="p-1">
                    <HexDump
                        data={visibleData}
                        highlights={interleavedHighlights}
                        bytesPerRow={16}
                        showContainer={true}
                    />
                </div>
            </div>
             <div className="mt-4 pt-4 border-t border-neutral-800">
                <div className="flex items-start gap-3 text-xs text-neutral-400">
                    <InfoIcon className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                        <span className="font-semibold text-neutral-200">FEC Strategy:</span> Data is interleaved by taking <span className="text-cyan-400 font-bold">3 bytes of payload</span> followed by <span className="text-rose-400 font-bold">1 byte of parity</span>. This spreads the parity information throughout the frame. If a burst of noise corrupts a few consecutive bytes, the damage is distributed among different Reed-Solomon codewords, making error correction far more effective.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterleavingVisualizer;