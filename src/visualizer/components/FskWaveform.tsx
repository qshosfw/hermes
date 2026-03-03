import React, { useMemo } from 'react';
import InfoIcon from './icons/InfoIcon';
import HexDump from './HexDump';

interface FecVisualizerProps {
    data: Uint8Array;    // Whitened 96 bytes
    parity: Uint8Array;  // 32 parity bytes
}

const FecVisualizer: React.FC<FecVisualizerProps> = ({ data, parity }) => {
    const physicalData = useMemo(() => {
        const result = new Uint8Array(128);
        result.set(data, 0);
        result.set(parity, 96);
        return result;
    }, [data, parity]);

    const fecHighlights = useMemo(() => ([
        { index: 0, length: 96, color: 'bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30', label: 'Whitened Payload' },
        { index: 96, length: 32, color: 'bg-rose-600/20 text-rose-400 ring-1 ring-rose-500/30', label: 'RS Parity' },
    ]), []);

    return (
        <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h4 className="text-[10px] uppercase font-bold text-zinc-500 pb-2 border-b border-zinc-800 tracking-widest">Input (Whitened)</h4>
                    <div className="bg-black/40 p-4 rounded-lg border border-zinc-900">
                        <HexDump data={data} bytesPerRow={16} showContainer={false} />
                    </div>
                </div>
                <div className="space-y-4">
                    <h4 className="text-[10px] uppercase font-bold text-zinc-500 pb-2 border-b border-zinc-800 tracking-widest">FEC Parity (32B)</h4>
                    <div className="bg-black/40 p-4 rounded-lg border border-zinc-900">
                        <HexDump data={parity} bytesPerRow={16} showContainer={false} />
                    </div>
                </div>
            </div>

            <div className="bg-zinc-900/40 p-1 rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">Final FEC Frame (128 Bytes)</h4>
                        <span className="text-[10px] font-mono text-zinc-600">Whitened Payload + Parity</span>
                    </div>
                    <HexDump
                        data={physicalData}
                        highlights={fecHighlights}
                        bytesPerRow={16}
                        showContainer={false}
                    />
                </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-start gap-3 text-xs text-zinc-400">
                    <InfoIcon className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                        <span className="font-semibold text-zinc-200">Forward Error Correction:</span> Reed-Solomon (128, 96) is the <span className="text-indigo-400 font-bold">final stage</span> in the pipeline. By applying FEC after whitening, we ensure that the parity bytes correct raw errors from the radio interface. This prevents de-whitening logic from multiplying bit flips before they reach the decoder, significantly increasing the protocol's resilience to high-noise environments.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FecVisualizer;