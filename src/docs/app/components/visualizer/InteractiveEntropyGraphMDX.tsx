'use client';

import React, { useMemo } from 'react';
import InteractiveEntropyGraph from './InteractiveEntropyGraph';
import { generateRandomBytes } from './hermesProtocol';

export function InteractiveEntropyGraphMDX() {
    const { plainData, encryptedData } = useMemo(() => {
        // Generate heavily biased plaintext (mostly zeros)
        const plainData = new Uint8Array(128);
        for (let i = 0; i < 128; i++) {
            plainData[i] = Math.random() > 0.9 ? 0xFF : 0x00;
        }

        // Ideally, ChaCha20 ciphertext has maximum entropy
        const encryptedData = generateRandomBytes(128);

        return { plainData, encryptedData };
    }, []);

    return (
        <div className="not-prose my-6 max-w-4xl mx-auto">
            <InteractiveEntropyGraph
                beforeData={plainData}
                afterData={encryptedData}
            />
        </div>
    );
}

export default InteractiveEntropyGraphMDX;
