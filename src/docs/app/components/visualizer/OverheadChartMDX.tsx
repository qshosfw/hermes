'use client';
import React from 'react';
import OverheadChart from './OverheadChart';

export default function OverheadChartMDX() {
    return (
        <div className="my-8 rounded-xl overflow-hidden border border-border bg-background">
            <OverheadChart
                lengths={{
                    preamble: 16,
                    syncWord: 4,
                    header: 26,
                    payload: 54,
                    signature: 16,
                    parity: 32, // RS(128,96) parity is 32 bytes
                }}
            />
        </div>
    );
}
