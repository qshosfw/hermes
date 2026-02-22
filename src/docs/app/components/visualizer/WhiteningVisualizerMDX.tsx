'use client';

import React, { useMemo } from 'react';
import WhiteningVisualizer from './WhiteningVisualizer';
import { textToBytes, reedSolomonEncode, interleave, generatePn15Sequence, whiten } from './hermesProtocol';

export function WhiteningVisualizerMDX() {
    const { interleavedData, whitenedData, syncWord, pn15Sequence } = useMemo(() => {
        const text = "0000000000000000000000000000000000000000000000000000000000000000"; // Test with lots of zeros to show whitening effect
        const data = new Uint8Array(96);
        data.set(textToBytes(text, text.length).slice(0, 96));

        const { parity } = reedSolomonEncode(data);
        const interleaved = interleave(data, parity);
        const sync = new Uint8Array([0x2F, 0x2A, 0x11, 0xDB]);
        const pn15 = generatePn15Sequence(128); // 128 bytes
        const whitened = whiten(interleaved, sync, pn15);

        return { interleavedData: interleaved, whitenedData: whitened, syncWord: sync, pn15Sequence: pn15 };
    }, []);

    return (
        <div className="not-prose my-6 max-w-4xl mx-auto">
            <WhiteningVisualizer
                interleavedData={interleavedData}
                whitenedData={whitenedData}
                syncWord={syncWord}
                pn15Sequence={pn15Sequence}
            />
        </div>
    );
}

export default WhiteningVisualizerMDX;
