'use client';

import React, { useState, useMemo } from 'react';
import InfoIcon from './icons/InfoIcon';
import HexDump from './HexDump';

const FecBurstVisualizer: React.FC = () => {
    const [burstSize, setBurstSize] = useState(16);
    const [useErasures, setUseErasures] = useState(false);

    const data = useMemo(() => {
        const arr = new Uint8Array(128).fill(0x00);
        // Fill some recognizable data
        for (let i = 0; i < 96; i++) arr[i] = i % 256;
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
            label: success ? "SUCCESS" : "FAILED",
            color: success ? "text-emerald-400" : "text-rose-400",
            bg: success ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20",
            limit
        };
    }, [burstSize, useErasures]);

    const highlights = useMemo(() => {
        const h = [];
        // Data block
        h.push({ index: 0, length: 96, color: 'bg-blue-600/20 border-blue-500/30', label: 'Data' });
        // Parity block
        h.push({ index: 96, length: 32, color: 'bg-purple-600/20 border-purple-500/30', label: 'Parity' });
        // Burst error
        h.push({ index: 40, length: burstSize, color: 'bg-rose-600 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]', label: 'BURST ERROR' });

        if (useErasures && burstSize <= 32) {
            // Erasure markers
            h.push({ index: 40, length: burstSize, color: 'ring-2 ring-emerald-500 ring-inset', label: 'ERASURE FLAG' });
        }

        return h;
    }, [burstSize, useErasures]);

    return (
        <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Burst Size (Bytes)</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="1"
                                max="48"
                                value={burstSize}
                                onChange={(e) => setBurstSize(parseInt(e.target.value))}
                                className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <span className="font-mono text-lg text-white w-8">{burstSize}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-neutral-800">
                        <div className="space-y-1">
                            <span className="text-sm font-semibold text-neutral-300">Erasure Decoding</span>
                            <p className="text-[10px] text-neutral-500">Enable physical-layer flagging (LQI/RSSI)</p>
                        </div>
                        <button
                            onClick={() => setUseErasures(!useErasures)}
                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${useErasures ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}
                        >
                            {useErasures ? 'ENABLED' : 'DISABLED'}
                        </button>
                    </div>
                </div>

                <div className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed ${status.bg} transition-colors`}>
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-400 mb-1">Decoder Status</span>
                    <span className={`text-3xl font-black tracking-tighter ${status.color}`}>{status.label}</span>
                    <p className="text-xs text-neutral-400 mt-2 text-center">
                        Capable of correcting up to <span className="text-white font-bold">{status.limit} bytes</span> burst
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Frame Memory Layout</span>
                    <div className="flex gap-4 text-[9px] font-mono text-neutral-500">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500/40 rounded-full"></div> DATA</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500/40 rounded-full"></div> PARITY</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-500 rounded-full"></div> NOISE</div>
                    </div>
                </div>
                <HexDump
                    data={corruptedData}
                    highlights={highlights}
                    bytesPerRow={16}
                    showContainer={true}
                />
            </div>

            <div className="p-4 bg-black/40 rounded-lg border border-neutral-800 flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-neutral-400">
                    <span className="text-neutral-200 font-bold">Mathematical Proof:</span> Standard RS(128, 96) has $n-k=32$ parity symbols.
                    In hard-decision mode, it corrects $(n-k)/2 = 16$ errors.
                    In **erasure mode**, where the physical layer flags the burst location, it corrects $n-k = 32$ symbols.
                    This allows the protocol to survive a <span className="text-emerald-400 font-semibold">250ms total signal blackout</span> at 1200 baud.
                </div>
            </div>
        </div>
    );
};

export default FecBurstVisualizer;
