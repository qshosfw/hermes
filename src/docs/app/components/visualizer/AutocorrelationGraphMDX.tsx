'use client';

import React, { useMemo } from 'react';
import AutocorrelationGraph from './AutocorrelationGraph';

interface AutocorrelationGraphMDXProps {
    hexSyncWord?: string;
}

export function AutocorrelationGraphMDX({ hexSyncWord = '48 52 4D 53' }: AutocorrelationGraphMDXProps) {
    const syncWordBytes = useMemo(() => {
        const cleanHex = hexSyncWord.replace(/\s/g, '');
        const bytes = new Uint8Array(Math.ceil(cleanHex.length / 2));
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
        }
        return bytes;
    }, [hexSyncWord]);

    return (
        <div className="not-prose my-6">
            <AutocorrelationGraph syncWord={syncWordBytes} />
        </div>
    );
}

export default AutocorrelationGraphMDX;
