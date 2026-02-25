'use client';
import React from 'react';
import AckPayloadVisualizer from './AckPayloadVisualizer';
import { AckStatus } from './types';
import * as Hermes from './hermesProtocol';

export default function AckPayloadVisualizerMDX() {
    // Mock ACK Info
    const ackedInfo = {
        packetId: Hermes.hexToBytes("AABBCCDDEEFF", 6),
        innerMac: Hermes.hexToBytes("1122334455667788", 8),
        fragmentIndex: 0,
        lastFragment: true,
        status: AckStatus.ACK_OK,
        telemetryBit: true,
        hasBattery: true,
        batteryVoltage: 80, // 8.0V
        ackedRssi: -85,
        ackingRssi: -78,
        idleRssi: -115,
        prevLqi: 110,
        txPowerLevel: 10,
        latitude: 35.6895,
        longitude: 139.6917,
        altitude: 40.0,
        gpsWeek: 1500,
        timeOfWeek: 123456,
        speed: 0.0,
        heading: 0.0,
        satellites: 9,
        precisionRadius: 1.5
    };

    return (
        <div className="my-8 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950 p-6">
            <AckPayloadVisualizer ackedInfo={ackedInfo} />
        </div>
    );
}
