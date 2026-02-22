import React, { useState, useMemo, useEffect } from 'react';
import type { PacketHeaderConfig } from './types';
import * as Hermes from './hermesProtocol';
import InfoIcon from './icons/InfoIcon';

interface AvalancheVisualizerProps {
    rawPacket: {
        header: Uint8Array;
        payload: Uint8Array;
        signature: Uint8Array;
    };
    sharedSecret: Uint8Array;
    calculatePoly1305: (header: Uint8Array, payload: Uint8Array, secret: Uint8Array) => Uint8Array;
}

const countSetBits = (n: number) => {
    let count = 0;
    while (n > 0) {
        n &= (n - 1);
        count++;
    }
    return count;
};

const calculateHammingDistance = (a: Uint8Array, b: Uint8Array): number => {
    let distance = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        distance += countSetBits(a[i] ^ b[i]);
    }
    return distance;
};

const flipRandomBit = (data: Uint8Array): Uint8Array => {
    const newData = new Uint8Array(data);
    if (newData.length === 0) return newData;
    const byteIndex = Math.floor(Math.random() * newData.length);
    const bitIndex = Math.floor(Math.random() * 8);
    newData[byteIndex] ^= (1 << bitIndex);
    return newData;
};

const SignatureDisplay: React.FC<{ original: Uint8Array, modified: Uint8Array | null }> = ({ original, modified }) => {
    return (
        <div className="font-mono text-sm p-3 bg-black/40 rounded-lg w-full text-neutral-400 mt-1 overflow-x-auto whitespace-nowrap border border-neutral-800">
            {Array.from(original).map((byte, i) => {
                const isDifferent = modified && modified[i] !== byte;
                const char = byte.toString(16).padStart(2, '0').toUpperCase();
                return <span key={i} className={`${isDifferent ? 'text-rose-500 font-bold' : ''}`}>{char} </span>;
            })}
        </div>
    );
};

const BitDifferenceGrid: React.FC<{ original: Uint8Array, modified: Uint8Array }> = ({ original, modified }) => {
    const bits = useMemo(() => {
        const diffs = [];
        for (let i = 0; i < original.length; i++) {
            for (let j = 7; j >= 0; j--) {
                const originalBit = (original[i] >> j) & 1;
                const modifiedBit = (modified[i] >> j) & 1;
                diffs.push({
                    isDifferent: originalBit !== modifiedBit,
                    original: originalBit,
                    modified: modifiedBit,
                });
            }
        }
        return diffs;
    }, [original, modified]);

    return (
        <div className="flex flex-wrap bg-neutral-800 p-px rounded-md gap-px">
            {bits.map((bit, i) => (
                <div 
                    key={i} 
                    className={`w-3 h-3 md:w-4 md:h-4 ${bit.isDifferent ? 'bg-rose-500' : 'bg-neutral-600/30'}`} 
                    title={`Bit ${i}: ${bit.original} -> ${bit.modified}`}
                />
            ))}
        </div>
    );
};

const StatsDisplay: React.FC<{ bitsChanged: number }> = ({ bitsChanged }) => {
    const percentage = (bitsChanged / 128) * 100;
    return (
        <div className="bg-black/20 p-3 rounded-lg border border-neutral-800 space-y-2 h-full flex flex-col justify-center">
            <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-neutral-300">Flipped Bits</span>
                <span className="font-mono text-neutral-200">{bitsChanged} / 128</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2 relative overflow-hidden">
                <div className="bg-rose-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
            </div>
             <div className="text-right text-[10px] text-neutral-500 font-mono mt-1">
                {percentage.toFixed(1)}% Changed
            </div>
        </div>
    );
};


const AvalancheVisualizer: React.FC<AvalancheVisualizerProps> = ({ rawPacket, sharedSecret, calculatePoly1305 }) => {
    const [modifiedSignature, setModifiedSignature] = useState<Uint8Array | null>(null);
    const [analysis, setAnalysis] = useState<{ bitsChanged: number, source: string } | null>(null);
    const [flipCounter, setFlipCounter] = useState(0);

    useEffect(() => {
        setModifiedSignature(null);
        setAnalysis(null);
    }, [rawPacket.signature]);

    const handleFlipPayload = () => {
        const modifiedPayload = flipRandomBit(rawPacket.payload);
        const newSig = calculatePoly1305(rawPacket.header, modifiedPayload, sharedSecret);
        
        setModifiedSignature(newSig);
        const bitsChanged = calculateHammingDistance(rawPacket.signature, newSig);
        setAnalysis({ bitsChanged, source: 'payload' });
        setFlipCounter(c => c + 1);
    };

    const percentage = analysis ? (analysis.bitsChanged / 128 * 100).toFixed(1) : 0;

    return (
        <div className="space-y-4">
            <div>
                <label className="text-xs uppercase tracking-wide font-medium text-neutral-500">Original Signature</label>
                <SignatureDisplay original={rawPacket.signature} modified={null} />
            </div>

            <div className="flex items-center justify-center space-x-4 pt-2">
                <button
                    onClick={handleFlipPayload}
                    className="px-4 py-2 bg-neutral-100 hover:bg-white text-black rounded-md text-sm font-medium transition-colors shadow-sm active:translate-y-[1px]"
                >
                    Flip 1 Bit in Payload
                </button>
            </div>
            
             {analysis && modifiedSignature && (
                <div key={flipCounter} className="space-y-4 pt-2 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs uppercase tracking-wide font-medium text-neutral-500">Modified Signature</label>
                            <SignatureDisplay original={modifiedSignature} modified={rawPacket.signature} />
                        </div>
                        <div>
                            <label className="text-xs uppercase tracking-wide font-medium text-neutral-500">Analysis</label>
                            <div className="mt-1 h-full">
                                <StatsDisplay bitsChanged={analysis.bitsChanged} />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs uppercase tracking-wide font-medium text-neutral-500">Bit Difference Grid (128 bits)</label>
                        <div className="mt-1">
                            <BitDifferenceGrid original={rawPacket.signature} modified={modifiedSignature} />
                        </div>
                    </div>
                </div>
            )}

             <div className="text-left font-sans text-xs text-neutral-400 bg-black/40 mt-2 p-3 rounded-lg border border-neutral-800 flex items-start space-x-2">
                <InfoIcon className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                    <span className="font-bold text-neutral-200">Analysis:</span>
                    {analysis ? (
                        <span>
                            A 1-bit flip in the {analysis.source} resulted in <span className="font-bold text-rose-400 font-mono">{analysis.bitsChanged} / 128</span> bits changing in the signature
                            (<span className="font-bold text-rose-400 font-mono">~{percentage}%</span>). An ideal cryptographic function results in ~50% of the output bits changing for any single input bit flip. This demonstrates the signature's sensitivity and resistance to predictable manipulation.
                        </span>
                    ) : (
                         <span>
                            Click the button above to flip a single random bit in the input data and observe the resulting changes in the signature.
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AvalancheVisualizer;