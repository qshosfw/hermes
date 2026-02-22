import React, { useMemo } from 'react';
import Tooltip from './Tooltip';

interface SyncWordStatsProps {
  syncWord: Uint8Array;
}

const getBits = (syncWord: Uint8Array): number[] => {
    const bits: number[] = [];
    syncWord.forEach(byte => {
        for (let i = 7; i >= 0; i--) {
            bits.push((byte >> i) & 1);
        }
    });
    return bits;
};

const calculateStats = (syncWord: Uint8Array) => {
    const bits = getBits(syncWord);
    if (bits.length === 0) {
        return { zeros: 0, ones: 0, longestRun: 0, minHammingDistance: 0 };
    }

    // Bit distribution
    const ones = bits.filter(b => b === 1).length;
    const zeros = bits.length - ones;

    // Longest run
    let longestRun = 0;
    if (bits.length > 0) {
        longestRun = 1;
        let currentRun = 1;
        for (let i = 1; i < bits.length; i++) {
            if (bits[i] === bits[i-1]) {
                currentRun++;
            } else {
                currentRun = 1;
            }
            if (currentRun > longestRun) {
                longestRun = currentRun;
            }
        }
    } else {
        longestRun = 0;
    }


    // Min Hamming distance for circular shifts
    let minHammingDistance = bits.length;
    for (let shift = 1; shift < bits.length; shift++) {
        let distance = 0;
        for (let i = 0; i < bits.length; i++) {
            if (bits[i] !== bits[(i + shift) % bits.length]) {
                distance++;
            }
        }
        if (distance < minHammingDistance) {
            minHammingDistance = distance;
        }
    }
    
    if (bits.length === 0) minHammingDistance = 0;

    return { zeros, ones, longestRun, minHammingDistance };
};

const StatItem: React.FC<{ label: string; value: string | number; tooltip: string }> = ({ label, value, tooltip }) => (
    <Tooltip content={tooltip} className="w-full h-full block">
        <div className="group relative bg-black/40 p-2.5 rounded-lg text-center border border-neutral-800 transition-colors hover:border-neutral-700 cursor-help h-full flex flex-col justify-center">
            <div className="text-[10px] uppercase tracking-wide text-neutral-500 font-medium">{label}</div>
            <div className="text-lg font-bold text-neutral-200 font-mono mt-0.5">{value}</div>
        </div>
    </Tooltip>
);


const SyncWordStats: React.FC<SyncWordStatsProps> = ({ syncWord }) => {
    const stats = useMemo(() => calculateStats(syncWord), [syncWord]);

    return (
        <div className="mt-2">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Sync Word Properties</h4>
            <div className="grid grid-cols-2 gap-2">
                <StatItem 
                    label="Bit Balance" 
                    value={`${stats.zeros} Z / ${stats.ones} O`}
                    tooltip="The count of zero bits versus one bits. A 50/50 balance is ideal for preventing DC bias."
                />
                <StatItem 
                    label="Longest Run" 
                    value={stats.longestRun}
                    tooltip="The longest sequence of identical consecutive bits. Shorter runs ensure frequent signal transitions for clock recovery."
                />
                <StatItem 
                    label="Min Shift Hamming"
                    value={stats.minHammingDistance}
                    tooltip="The minimum Hamming distance between the sync word and any circularly shifted version of itself. A high distance indicates good autocorrelation properties."
                />
                 <StatItem 
                    label="Total Bits"
                    value={syncWord.length * 8}
                    tooltip="The total number of bits in the sync word."
                />
            </div>
        </div>
    );
};

export default SyncWordStats;