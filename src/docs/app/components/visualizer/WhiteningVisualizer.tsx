import React, { useState, useMemo } from 'react';
import HexDump from './HexDump';
import InteractiveEntropyGraph from './InteractiveEntropyGraph';

interface WhiteningVisualizerProps {
  interleavedData: Uint8Array;
  whitenedData: Uint8Array;
  syncWord: Uint8Array;
  pn15Sequence: Uint8Array;
}

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-4 flex flex-col h-full">
        <h4 className="text-xs uppercase tracking-wide font-semibold text-neutral-500 mb-4 border-b border-neutral-800 pb-2">{label}</h4>
        <div className="flex-grow flex flex-col justify-center">
            {children}
        </div>
    </div>
);

const ByteInspector: React.FC<{ byteData: any }> = ({ byteData }) => (
    <div className="h-full flex flex-col justify-center">
        {byteData ? (
            <div className="space-y-1 font-mono text-sm">
                <div className="grid grid-cols-[1fr,2fr,auto] gap-x-4 items-center mb-2 pb-2 border-b border-neutral-800">
                    <span className="text-[10px] uppercase text-neutral-500 font-bold">Step</span>
                    <span className="text-[10px] uppercase text-neutral-500 font-bold">Binary</span>
                    <span className="text-[10px] uppercase text-neutral-500 font-bold">Hex</span>
                </div>
                
                <div className="grid grid-cols-[1fr,2fr,auto] gap-x-4 items-center py-1">
                    <span className="font-sans text-neutral-400 text-xs font-medium">Interleaved</span>
                    <span className="text-neutral-300 tracking-widest">{byteData.interleaved.toString(2).padStart(8, '0')}</span>
                    <span className="text-amber-500 font-bold">0x{byteData.interleaved.toString(16).padStart(2,'0').toUpperCase()}</span>
                </div>
                
                <div className="flex items-center my-1 opacity-50">
                    <span className="font-sans text-neutral-600 text-[10px] w-full border-b border-neutral-800 text-center relative"><span className="bg-neutral-900/30 px-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">XOR</span></span>
                </div>
                
                <div className="grid grid-cols-[1fr,2fr,auto] gap-x-4 items-center py-1">
                    <span className="font-sans text-neutral-400 text-xs font-medium">Sync Word</span>
                    <span className="text-neutral-300 tracking-widest">{byteData.sync.toString(2).padStart(8, '0')}</span>
                     <span className="text-blue-500 font-bold">0x{byteData.sync.toString(16).padStart(2,'0').toUpperCase()}</span>
                </div>
                
                <div className="flex items-center my-1 opacity-50">
                    <span className="font-sans text-neutral-600 text-[10px] w-full border-b border-neutral-800 text-center relative"><span className="bg-neutral-900/30 px-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">XOR</span></span>
                </div>
                
                 <div className="grid grid-cols-[1fr,2fr,auto] gap-x-4 items-center py-1">
                    <span className="font-sans text-neutral-400 text-xs font-medium">PN15 Seq</span>
                    <span className="text-neutral-300 tracking-widest">{byteData.pn15.toString(2).padStart(8, '0')}</span>
                     <span className="text-purple-500 font-bold">0x{byteData.pn15.toString(16).padStart(2,'0').toUpperCase()}</span>
                </div>
                
                 <div className="mt-3 pt-3 border-t border-neutral-700">
                     <div className="grid grid-cols-[1fr,2fr,auto] gap-x-4 items-center bg-white/5 p-3 rounded-lg ring-1 ring-white/10">
                        <span className="font-sans text-white font-bold text-xs">Whitened</span>
                        <span className="text-white tracking-widest font-bold">{byteData.whitened.toString(2).padStart(8, '0')}</span>
                         <span className="text-white font-bold text-base">0x{byteData.whitened.toString(16).padStart(2,'0').toUpperCase()}</span>
                    </div>
                </div>

            </div>
        ) : (
            <div className="flex flex-col items-center justify-center text-neutral-500 text-sm h-48">
                <span className="mb-2 opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" /></svg>
                </span>
                Hover over a byte below to inspect logic.
            </div>
        )}
    </div>
);


const LfsrDisplay: React.FC<{ step: number }> = ({ step }) => {
    const calculatedState = useMemo(() => {
        let lfsr = 0x4224; // Initial state
        const totalSteps = step;
        for (let i = 0; i < totalSteps; i++) {
            const newBit = ((lfsr >> 14) ^ (lfsr >> 13)) & 1;
            lfsr = ((lfsr << 1) | newBit) & 0x7FFF;
        }
        return lfsr;
    }, [step]);
    
    const bits = calculatedState.toString(2).padStart(15, '0');
    const tap14 = (calculatedState >> 13) & 1;
    const tap15 = (calculatedState >> 14) & 1;
    const newBit = tap14 ^ tap15;

    return (
        <div className="h-full flex flex-col justify-center items-center">
            <div className="font-mono text-[10px] text-neutral-500 mb-4 bg-neutral-900 px-2 py-1 rounded border border-neutral-800">Poly: x¹⁵ + x¹⁴ + 1</div>
            <div className="flex justify-center items-center space-x-1 font-mono text-lg text-neutral-200 relative mb-2">
                {bits.split('').map((bit, i) => (
                    <span key={i} className={`w-6 h-8 flex items-center justify-center rounded-sm transition-colors duration-300 ${i === 0 ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40' : ''} ${i === 1 ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40' : 'bg-black/40 ring-1 ring-neutral-800'}`}>
                        {bit}
                    </span>
                ))}
            </div>
            <div className="h-12 relative mt-4 w-full max-w-[280px] flex justify-center items-center opacity-70">
                 <svg viewBox="0 0 250 40" className="w-full h-full">
                    {/* Line from bit 15 */}
                    <path d="M14 0 V 15 H 100" stroke="#f43f5e" strokeWidth="2" fill="none" />
                    {/* Line from bit 14 */}
                    <path d="M38 0 V 15 H 100" stroke="#fbbf24" strokeWidth="2" fill="none" />
                    {/* XOR circle */}
                    <circle cx="100" cy="15" r="8" stroke="#525252" strokeWidth="2" fill="#171717" />
                    <line x1="96" y1="11" x2="104" y2="19" stroke="#525252" strokeWidth="2" />
                    <line x1="104" y1="11" x2="96" y2="19" stroke="#525252" strokeWidth="2" />
                    {/* Line to new bit */}
                     <path d="M108 15 H 150 V 30 H 230" stroke="#4ade80" strokeWidth="2" fill="none" />
                     <path d="M230 30 L 225 27 M 230 30 L 225 33" stroke="#4ade80" strokeWidth="2" fill="none" />
                </svg>
            </div>
             <div className="font-mono text-sm flex justify-center items-baseline gap-x-6 mt-2 w-full">
                <div className="flex flex-col items-center">
                    <span className="text-rose-400 font-bold text-lg">{tap15}</span>
                    <div className="text-[9px] text-neutral-600 uppercase font-bold tracking-wide">Tap 15</div>
                </div>
                 <span className="text-neutral-600 text-xs self-center">XOR</span>
                 <div className="flex flex-col items-center">
                    <span className="text-amber-400 font-bold text-lg">{tap14}</span>
                    <div className="text-[9px] text-neutral-600 uppercase font-bold tracking-wide">Tap 14</div>
                </div>
                 <span className="text-neutral-600 text-xs self-center">=</span>
                 <div className="flex flex-col items-center">
                    <span className="text-emerald-400 font-bold text-lg bg-emerald-900/20 px-3 py-0.5 rounded border border-emerald-500/30">{newBit}</span>
                    <div className="text-[9px] text-emerald-600 uppercase font-bold tracking-wide mt-1">Feedback</div>
                </div>
            </div>
        </div>
    );
};


const WhiteningVisualizer: React.FC<WhiteningVisualizerProps> = ({ interleavedData, whitenedData, syncWord, pn15Sequence }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(0);

    const selectedByteData = useMemo(() => {
        if (hoveredIndex === null || hoveredIndex >= interleavedData.length) return null;
        return {
            interleaved: interleavedData[hoveredIndex],
            sync: syncWord[hoveredIndex % syncWord.length],
            pn15: pn15Sequence[hoveredIndex],
            whitened: whitenedData[hoveredIndex],
        };
    }, [hoveredIndex, interleavedData, syncWord, pn15Sequence, whitenedData]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto md:h-80">
                <Section label="Byte Logic Inspector">
                    <ByteInspector byteData={selectedByteData} />
                </Section>

                <Section label="PN15 LFSR Simulation">
                    <LfsrDisplay step={hoveredIndex !== null ? hoveredIndex * 8 : 0} />
                </Section>
            </div>
             
             <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-wide font-semibold text-neutral-500 pl-1">Data Frame Output</h4>
                    <HexDump 
                        data={whitenedData}
                        beforeData={interleavedData}
                        bytesPerRow={16} 
                        onByteHover={setHoveredIndex}
                    />
                </div>
                <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-wide font-semibold text-neutral-500 pl-1">Entropy Analysis</h4>
                    <InteractiveEntropyGraph 
                        beforeData={interleavedData} 
                        afterData={whitenedData} 
                    />
                </div>
            </div>
        </div>
    );
};

export default WhiteningVisualizer;