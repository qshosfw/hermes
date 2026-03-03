'use client';

import React, { useMemo } from 'react';
import WhiteningVisualizer from './WhiteningVisualizer';
import { generatePn15Sequence, whiten } from './hermesProtocol';

export function WhiteningVisualizerMDX() {
    const { rawData, whitenedData, syncWord, pn15Sequence } = useMemo(() => {
        const text = "0000000000000000000000000000000000000000000000000000000000000000";
        const data = new Uint8Array(96);
        data.set(new TextEncoder().encode(text).slice(0, 96));

        const sync = new Uint8Array([0x2F, 0x2A, 0x11, 0xDB]);
        const pn15 = generatePn15Sequence(96);
        const whitened = whiten(data, sync, pn15);

        return { rawData: data, whitenedData: whitened, syncWord: sync, pn15Sequence: pn15 };
    }, []);

    return (
        <div className="not-prose my-6 max-w-4xl mx-auto">
            <WhiteningVisualizer
                rawData={rawData}
                whitenedData={whitenedData}
                syncWord={syncWord}
                pn15Sequence={pn15Sequence}
            />
        </div>
    );
}

export default WhiteningVisualizerMDX;
