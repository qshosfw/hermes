'use client';
import React from 'react';
import HeaderVisualizer from './HeaderVisualizer';
import { PacketType, AddressingType } from './types';
import * as Hermes from './hermesProtocol';

export default function HeaderVisualizerMDX() {
    return (
        <div className="my-8 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950 p-6">
            <HeaderVisualizer config={{
                type: PacketType.MESSAGE,
                addressing: AddressingType.UNICAST,
                ttl: 5,
                wantAck: true,
                fragmentIndex: 0,
                lastFragment: true,
                nonce: Hermes.hexToBytes("C0FFEE1234567890ABCDEF12", 12),
                destination: Hermes.hexToBytes("C0FFEE123456", 6),
                source: Hermes.hexToBytes("BEEF42654321", 6),
            }} />
        </div>
    );
}
