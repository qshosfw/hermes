'use client';

import React, { useMemo } from 'react';
import InterleavingVisualizer from './FskWaveform'; // The file is named FskWaveform but exports InterleavingVisualizer
import { textToBytes, reedSolomonEncode } from './hermesProtocol';

export function InterleavingVisualizerMDX() {
    // Generate valid 96 byte payload
    const data = useMemo(() => {
        const text = "HERMES Protocol Interleaving Test - Distributing parity bytes across the entire dataframe to mitigate burst errors from RF noise.";
        const bytes = new Uint8Array(96);
        bytes.set(textToBytes(text, text.length).slice(0, 96));
        return bytes;
    }, []);

    const { parity } = useMemo(() => reedSolomonEncode(data), [data]);

    return (
        <div className="not-prose my-6 max-w-4xl mx-auto">
            <InterleavingVisualizer data={data} parity={parity} />
        </div>
    );
}

export default InterleavingVisualizerMDX;
