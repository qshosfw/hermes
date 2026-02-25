'use client';

import React, { useMemo } from 'react';
import AvalancheVisualizer from './AvalancheVisualizer';
import type { PacketHeaderConfig } from './types';
import { PacketType, AddressingType } from './types';
import { buildRawPacket, generateRandomBytes, calculatePoly1305 } from './hermesProtocol';

export function AvalancheVisualizerMDX() {
    const { rawPacket, sharedSecret } = useMemo(() => {
        const sharedSecret = generateRandomBytes(32); // 256-bit key

        const config: PacketHeaderConfig = {
            type: PacketType.MESSAGE,
            ttl: 5,
            addressing: AddressingType.UNICAST,
            wantAck: true,
            fragmentIndex: 0,
            lastFragment: true,
            packetId: generateRandomBytes(6),
            destination: new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]),
            source: new Uint8Array([0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F]),
            hopNonce: generateRandomBytes(4)
        };

        const payload = generateRandomBytes(56); // 56-byte payload
        const rawPacket = buildRawPacket(config, payload, sharedSecret);

        return { rawPacket, sharedSecret };
    }, []);

    return (
        <div className="not-prose my-6 max-w-3xl mx-auto">
            <AvalancheVisualizer
                rawPacket={rawPacket}
                sharedSecret={sharedSecret}
                calculatePoly1305={calculatePoly1305}
            />
        </div>
    );
}

export default AvalancheVisualizerMDX;
