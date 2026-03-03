import React, { useState, useMemo } from 'react';
import { whiten, generatePn15Sequence, bytesToHex } from './hermesProtocol';
import { DEFAULT_SYNC_WORD } from './constants';

interface WhiteningVisualizerProps {
    rawData?: Uint8Array;
    whitenedData?: Uint8Array;
    syncWord?: Uint8Array;
    pn15Sequence?: Uint8Array;
}

const ByteInspector: React.FC<{ byteData: { raw: number, pn15: number, whitened: number } }> = ({ byteData }) => {
    return (
        <div className="space-y-4">
            <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800 shadow-inner">
                <div className="grid grid-cols-[1fr,2fr,auto] gap-x-4 items-center py-1">
                    <span className="font-sans text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Raw Input</span>
                    <span className="text-zinc-200 tracking-[0.2em] font-mono">{byteData.raw.toString(2).padStart(8, '0')}</span>
                    <span className="text-indigo-400 font-bold font-mono">0x{byteData.raw.toString(16).padStart(2, '0').toUpperCase()}</span>
                </div>

                <div className="flex items-center my-2 opacity-30 px-20">
                    <div className="h-px bg-zinc-700 flex-grow"></div>
                    <span className="px-2 text-zinc-500 font-bold text-[10px]">XOR</span>
                    <div className="h-px bg-zinc-700 flex-grow"></div>
                </div>

                <div className="grid grid-cols-[1fr,2fr,auto] gap-x-4 items-center py-1">
                    <span className="font-sans text-zinc-400 text-[10px] font-bold uppercase tracking-widest">PN15 Scramble</span>
                    <span className="text-purple-400 tracking-[0.2em] font-mono">{byteData.pn15.toString(2).padStart(8, '0')}</span>
                    <span className="text-purple-500 font-bold font-mono">0x{byteData.pn15.toString(16).padStart(2, '0').toUpperCase()}</span>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800">
                    <div className="grid grid-cols-[1fr,2fr,auto] gap-x-4 items-center bg-zinc-100 p-4 rounded-xl shadow-xl ring-1 ring-white/20">
                        <span className="font-sans text-zinc-900 font-bold text-[10px] uppercase tracking-widest">Whitened</span>
                        <span className="text-zinc-900 tracking-[0.3em] font-bold text-base font-mono">{byteData.whitened.toString(2).padStart(8, '0')}</span>
                        <span className="text-zinc-900 font-black text-lg font-mono">0x{byteData.whitened.toString(16).padStart(2, '0').toUpperCase()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 flex flex-col h-full shadow-sm">
        <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-6 border-b border-zinc-800 pb-2">{label}</h4>
        <div className="flex-grow flex flex-col justify-center">
            {children}
        </div>
    </div>
);

const LfsrDisplay: React.FC<{ step: number }> = ({ step }) => {
    // Polynomial: x^15 + x^14 + 1
    const lfsrState = useMemo(() => {
        let state = 0x4224;
        for (let i = 0; i < step; i++) {
            const bit = ((state >> 0) ^ (state >> 1)) & 1;
            state = (state >> 1) | (bit << 14);
        }
        return state;
    }, [step]);

    return (
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="flex gap-1.5 flex-wrap justify-center">
                {stateToBits(lfsrState).map((bit, i) => (
                    <div key={i} className={`w-6 h-10 flex items-center justify-center border font-mono text-sm rounded-md transition-all duration-300 ${bit ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}>
                        {bit}
                    </div>
                ))}
            </div>
            <div className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mt-2 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                LFSR State: 0x{lfsrState.toString(16).padStart(4, '0').toUpperCase()}
            </div>
        </div>
    );
};

const stateToBits = (state: number): number[] => {
    const bits: number[] = [];
    for (let i = 14; i >= 0; i--) {
        bits.push((state >> i) & 1);
    }
    return bits;
};

const WhiteningVisualizer: React.FC<WhiteningVisualizerProps> = ({
    rawData: propRawData,
    whitenedData: propWhitenedData,
    syncWord: propSyncWord,
    pn15Sequence: propPn15Sequence
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(0);

    // Use props or fall back to defaults
    const rawData = useMemo(() => {
        if (propRawData) return propRawData;
        const data = new Uint8Array(96);
        for (let i = 0; i < 96; i++) data[i] = (i * 7) % 256;
        return data;
    }, [propRawData]);

    const syncWord = propSyncWord ?? DEFAULT_SYNC_WORD;
    const pn15Sequence = useMemo(() => propPn15Sequence ?? generatePn15Sequence(96), [propPn15Sequence]);
    const whitenedData = useMemo(() => propWhitenedData ?? whiten(rawData, syncWord, pn15Sequence), [propWhitenedData, rawData, syncWord, pn15Sequence]);

    const selectedByteData = useMemo(() => {
        const idx = hoveredIndex ?? 0;
        return {
            raw: rawData[idx],
            pn15: pn15Sequence[idx],
            whitened: whitenedData[idx]
        };
    }, [hoveredIndex, rawData, pn15Sequence, whitenedData]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Section label="Whitening Logic">
                    <ByteInspector byteData={selectedByteData} />
                </Section>

                <Section label="PN15 LFSR Engine">
                    <LfsrDisplay step={hoveredIndex !== null ? hoveredIndex * 8 : 0} />
                </Section>
            </div>

            <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-2xl">
                <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-6 tracking-widest flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                    Packet Stream (96 Bytes)
                </h4>
                <div className="grid grid-cols-8 md:grid-cols-16 gap-2">
                    {Array.from(whitenedData).map((byte, i) => (
                        <div
                            key={i}
                            onMouseEnter={() => setHoveredIndex(i)}
                            className={`aspect-square flex items-center justify-center text-[10px] font-mono border rounded-md cursor-crosshair transition-all duration-200 ${hoveredIndex === i ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg scale-110 z-10' : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:border-zinc-600 hover:bg-zinc-800'}`}
                        >
                            {byte.toString(16).padStart(2, '0').toUpperCase()}
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex justify-between items-center px-1">
                    <div className="flex gap-6 items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Whitened Byte</span>
                        </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-600">Hover bytes to inspect transformation</span>
                </div>
            </div>
        </div>
    );
};

export default WhiteningVisualizer;