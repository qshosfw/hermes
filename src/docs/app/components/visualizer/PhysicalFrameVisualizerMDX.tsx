'use client';
import React, { useState } from 'react';
import PhysicalFrameVisualizer from './PhysicalFrameVisualizer';
import * as Hermes from './hermesProtocol';
import { DEFAULT_SYNC_WORD } from './constants';

export default function PhysicalFrameVisualizerMDX() {
    const [isExpanded, setIsExpanded] = useState(false);

    // Generate realistic looking data for the frame
    const preamble = new Uint8Array(16).fill(0xAA);
    const syncWord = DEFAULT_SYNC_WORD;
    const header = Hermes.generateRandomBytes(26);
    const payload = Hermes.generateRandomBytes(54);
    const signature = Hermes.generateRandomBytes(16);
    const rsParity = new Uint8Array(32);

    // Combining into the "interleaved data" block representation
    const data = new Uint8Array([...header, ...payload, ...signature, ...rsParity]);

    return (
        <div className="my-8">
            <PhysicalFrameVisualizer
                preamble={preamble}
                syncWord={syncWord}
                data={data}
                isExpanded={isExpanded}
                onDataClick={() => setIsExpanded(!isExpanded)}
                onSectionClick={(section) => { }}
                packetParts={{ header, payload, signature }}
            />
        </div>
    );
}
