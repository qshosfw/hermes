'use client';
import React from 'react';
import TelemetryPayloadVisualizer from './TelemetryPayloadVisualizer';

export default function TelemetryPayloadVisualizerMDX() {
    // Generate an exhaustive mock telemetry packet to show all flags
    const telemetryInfo = {
        uptime: 1234567, // ticks
        tag: "Base Station Alpha",
        flags: {
            hasBattery: true,
            hasLocation: true,
            hasHygrometer: true,
            hasGasSensor: true,
            hasLuxSensor: true,
            hasUvSensor: true,
            hasMovementSensor: true,
            isCustomData: false
        },
        batteryVoltage: 82, // 8.2V
        batteryCurrent: 1240, // 1240 mA
        location: {
            latitude: 40.7128,
            longitude: -74.0060,
            altitude: 10.5,
            gpsWeek: 2280,
            timeOfWeek: 345600,
            speed: 1.5,
            heading: 270.5,
            satellites: 12,
            precisionRadius: 2.5
        },
        humidity: 4550, // 45.5%
        temperature: 2430, // 24.3C
        gasPpm: 400,
        pressureHpa: 1013,
        lux: 5000,
        uvIndex: 250, // 2.5
        movement: 0,
        customData: ""
    };

    const payload = new Uint8Array(54);
    payload[20] = 0xFE; // All bits 1-7 set to true

    return (
        <div className="my-8 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950 p-6">
            <TelemetryPayloadVisualizer telemetryInfo={telemetryInfo} payload={payload} />
        </div>
    );
}
