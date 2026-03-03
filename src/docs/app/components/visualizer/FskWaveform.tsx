'use client';

import React, { useState, useMemo } from 'react';
import InfoIcon from './icons/InfoIcon';
import HexDump from './HexDump';

const FecVisualizer: React.FC = () => {
    const [step, setStep] = useState(0);
    const totalSteps = 32;

    const data = useMemo(() => {
        const arr = new Uint8Array(96).fill(0x00);
        for (let i = 0; i < 96; i++) arr[i] = (i * 3) % 256;
        return arr;
    }, []);

    const parity = useMemo(() => {
        const arr = new Uint8Array(32);
        for (let i = 0; i < 32; i++) arr[i] = (0xDA + i) % 256;
        return arr;
    }, []);

    const fullFrame = useMemo(() => {
        const frame = new Uint8Array(128);
        frame.set(data, 0);
        frame.set(parity, 96);
        return frame;
    }, [data, parity]);

    const visibleData = useMemo(() => {
        if (step === 0) return data;
        const currentData = new Uint8Array(96 + step);
        currentData.set(data, 0);
        currentData.set(parity.slice(0, step), 96);
        return currentData;
    }, [data, parity, step]);

    const fecHighlights = useMemo(() => ([
        { index: 0, length: 96, color: 'bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30', label: 'Whitened Data' },
        { index: 96, length: 32, color: 'bg-rose-600/20 text-rose-400 ring-1 ring-rose-500/30', label: 'RS Parity' },
    ]), []);

    return (
        <div className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800 space-y-8 shadow-2xl">
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
                        FEC Encoding Process
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                        Parity Bytes Attached: {step} / 32
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    <input
                        type="range"
                        min="0"
                        max={32}
                        value={step}
                        onChange={(e) => setStep(Number(e.target.value))}
                        className="flex-grow h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr,300px] gap-8">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Phy Layer Frame Buffer</h4>
                    <div className="bg-black/40 p-4 rounded-xl border border-zinc-900 shadow-inner">
                        <HexDump
                            data={visibleData}
                            highlights={fecHighlights}
                            bytesPerRow={16}
                            showContainer={false}
                        />
                    </div>
                </div>

                <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 flex flex-col justify-center space-y-4">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Input Payload</span>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">96 bytes of whitened data (Header + Encrypted Payload + MAC).</p>
                    </div>

                    <div className="h-px bg-zinc-800 flex-grow max-h-px my-2"></div>

                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block">RS Redundancy</span>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">32 bytes of Reed-Solomon (128, 96) parity appended for error correction.</p>
                    </div>

                    <div className="mt-4 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <InfoIcon className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Protocol Tip</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-zinc-400 font-medium italic">
                            By placing FEC last, we protect the entire frame against burst noise without the risk of scrambling logic multiplying single-bit errors.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FecVisualizer;