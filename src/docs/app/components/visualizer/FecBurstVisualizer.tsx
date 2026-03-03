'use client';

import React, { useState, useMemo } from 'react';
import InfoIcon from './icons/InfoIcon';
import HexDump from './HexDump';

const FecBurstVisualizer: React.FC = () => {
    const [burstSize, setBurstSize] = useState(16);
    const [useErasures, setUseErasures] = useState(false);

    const data = useMemo(() => {
        const arr = new Uint8Array(128).fill(0x00);
        // Fill some recognizable data (96 bytes whitened input)
        for (let i = 0; i < 96; i++) arr[i] = i % 256;
        // Remaining 32 are parity
        for (let i = 96; i < 128; i++) arr[i] = 0xDA;
        return arr;
    }, []);

    const corruptedData = useMemo(() => {
        const arr = new Uint8Array(data);
        const start = 40;
        for (let i = 0; i < burstSize; i++) {
            if (start + i < 128) arr[start + i] = 0xFF; // Corrupt with static
        }
        return arr;
    }, [data, burstSize]);

    const status = useMemo(() => {
        const limit = useErasures ? 32 : 16;
        const success = burstSize <= limit;
        return {
            success,
            label: success ? "CORRECTED" : "UNRECOVERABLE",
            color: success ? "text-emerald-400" : "text-rose-400",
            bg: success ? "bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]" : "bg-rose-500/10 border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]",
            limit
        };
    }, [burstSize, useErasures]);

    const highlights = useMemo(() => {
        const h = [];
        // Data block
        h.push({ index: 0, length: 96, color: 'bg-indigo-600/10 text-indigo-400 ring-1 ring-indigo-500/20', label: 'Whitened Data' });
        // Parity block
        h.push({ index: 96, length: 32, color: 'bg-rose-600/10 text-rose-400 ring-1 ring-rose-500/20', label: 'RS Parity' });
        // Burst error
        h.push({ index: 40, length: burstSize, color: 'bg-rose-600 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] text-white font-bold', label: 'BURST ERROR' });

        if (useErasures && burstSize <= 32) {
            // Erasure markers
            h.push({ index: 40, length: burstSize, color: 'ring-2 ring-emerald-500 ring-inset', label: 'ERASURE FLAG' });
        }

        return h;
    }, [burstSize, useErasures]);

    return (
        <div className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800 space-y-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Burst Error Intensity (Bytes)</label>
                        <div className="flex items-center gap-6">
                            <input
                                type="range"
                                min="1"
                                max="48"
                                value={burstSize}
                                onChange={(e) => setBurstSize(parseInt(e.target.value))}
                                className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                            />
                            <span className="font-mono text-2xl font-black text-white w-12 text-right">{burstSize}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-5 bg-zinc-900/50 rounded-2xl border border-zinc-800 shadow-inner group hover:border-zinc-700 transition-all">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-zinc-200 uppercase tracking-widest">Erasure Assisted Decoding</span>
                            <p className="text-[10px] text-zinc-500 font-medium leading-tight">Leverage Physical Layer LQI/RSSI Telemetry</p>
                        </div>
                        <button
                            onClick={() => setUseErasures(!useErasures)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all border outline-none active:scale-95 ${useErasures ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'}`}
                        >
                            {useErasures ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                    </div>
                </div>

                <div className={`flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed aspect-square md:aspect-auto md:min-h-[160px] ${status.bg} transition-all duration-500`}>
                    <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-zinc-500 mb-2">Correction Engine</span>
                    <span className={`text-2xl font-black tracking-tighter ${status.color} animate-pulse-slow`}>{status.label}</span>
                    <p className="text-[10px] text-zinc-400 mt-3 text-center font-medium max-w-[180px]">
                        Reed-Solomon (128,96) can correct up to <span className="text-white font-bold">{status.limit} bytes</span> of burst loss
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                        RS Codeword Buffer
                    </h4>
                    <div className="flex gap-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-indigo-500/40 rounded-full"></div> DATA</div>
                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-rose-500/40 rounded-full"></div> PARITY</div>
                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-rose-600 rounded-full"></div> ERRORS</div>
                    </div>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-zinc-900 shadow-inner">
                    <HexDump
                        data={corruptedData}
                        highlights={highlights}
                        bytesPerRow={16}
                        showContainer={false}
                    />
                </div>
            </div>

            <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 flex items-start gap-4">
                <InfoIcon className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-zinc-400 font-medium">
                    <span className="text-zinc-200 font-bold uppercase tracking-widest block mb-1">Burst Performance</span>
                    RS(128, 96) provides $n-k=32$ redundancy bytes. In hard-decision mode, it corrects up to 16 errors. With **erasure assistance** from the physical layer, its correction power doubles to **32 bytes**, allowing the protocol to survive a <span className="text-indigo-400 font-bold">256-bit continuous burst</span> (25% of the frame).
                </div>
            </div>
        </div>
    );
};

export default FecBurstVisualizer;
