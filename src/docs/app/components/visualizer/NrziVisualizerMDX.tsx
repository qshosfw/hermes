'use client';

import React, { useMemo } from 'react';
import NrziVisualizer from './NrziVisualizer';
import { textToBytes, generatePn15Sequence, whiten } from './hermesProtocol';

export function NrziVisualizerMDX() {
    const data = useMemo(() => {
        const text = "HERMES PROTOCOL NRZI TEST";
        const bytes = textToBytes(text, 96); // Ensure 96 bytes buffer
        const pn15 = generatePn15Sequence(128, 0x2F2A);
        const syncByte = new Uint8Array([0x2F, 0x2A, 0x11, 0xDB]);
        const whitened = whiten(new Uint8Array(128), syncByte, pn15); // Just a mock whitened buffer
        // Mock NRZI encode simply to build the UI array
        const levels = new Array(whitened.length * 8).fill(0).map((_, i) => i % 2 === 0 ? 1 : -1);

        return { whitened, levels };
    }, []);

    return (
        <div className="not-prose my-10 max-w-4xl mx-auto shadow-2xl shadow-rose-500/10">
            <NrziVisualizer whitenedData={data.whitened} nrziLevels={data.levels} />
        </div>
    );
}

export default NrziVisualizerMDX;
