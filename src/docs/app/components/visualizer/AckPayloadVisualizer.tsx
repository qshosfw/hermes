import React, { useMemo } from 'react';
import type { AckedPacketInfo } from './types';
import { AckStatus } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';

interface BitField {
    name: string;
    value: string;
    bits: string;
    color: string;
}

const ackStatusMap: { [key in AckStatus]: string } = {
    [AckStatus.ACK_OK]: "OK",
    [AckStatus.ACK_CORRECTED]: "Corrected",
    [AckStatus.NACK_NORETRY]: "NACK NoRetry",
    [AckStatus.NACK_RETRY]: "NACK Retry",
};

const txPowerMap = [
    0.00, 0.13, 0.18, 0.26, 0.38, 0.56, 0.82, 1.21,
    1.79, 2.64, 3.89, 5.73, 8.44, 10.71, 12.00, 12.00
];
const valueToTxPower = (v: number): number => txPowerMap[v] ?? 0.0;

const Bit: React.FC<{ value: string; color: string; isFirst?: boolean }> = ({ value, color, isFirst }) => (
    <div className={`w-6 h-8 flex items-center justify-center font-mono text-sm rounded ${color} text-white font-bold shadow-sm ring-1 ring-black/20 ${isFirst ? 'ml-1.5' : ''}`}>
        {value}
    </div>
);

const ByteCell: React.FC<{ value: number; color?: string }> = ({ value, color }) => (
    <div className={`w-8 h-8 flex items-center justify-center font-mono text-sm rounded ${color ? `${color} text-white shadow-sm ring-1 ring-white/10 cursor-pointer hover:brightness-110 transition-all` : 'bg-neutral-800 text-neutral-300 border border-neutral-700'}`}>
        {value.toString(16).padStart(2, '0').toUpperCase()}
    </div>
);

const Section: React.FC<{ label: string; byteCount: number; children: React.ReactNode }> = ({ label, byteCount, children }) => (
    <Card className="bg-neutral-900/30 border-neutral-800 shadow-none h-full">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 pb-2 border-b border-neutral-800/50 mb-3">
            <CardTitle className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{label}</CardTitle>
            <Badge variant="secondary" className="font-mono text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400">
                {byteCount} {byteCount === 1 ? 'byte' : 'bytes'}
            </Badge>
        </CardHeader>
        <CardContent className="p-4 pt-0">
            {children}
        </CardContent>
    </Card>
);

const renderHoverableBits = (fields: BitField[]) => (
    <div className="flex flex-wrap justify-center items-center gap-y-1.5">
        {fields.map((field, fieldIndex) => (
            <HoverCard key={field.name} openDelay={50} closeDelay={50}>
                <HoverCardTrigger asChild>
                    <div className={`flex ${fieldIndex > 0 ? 'ml-1.5' : ''} cursor-help transition-transform hover:scale-105 hover:z-10`}>
                        {field.bits.split('').map((bit, bitIndex) => (
                            <Bit key={`${field.name}-${bitIndex}`} value={bit} color={field.color} />
                        ))}
                    </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-auto min-w-[200px] z-[9999]" sideOffset={8}>
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-sm ${field.color}`}></div>
                            <h4 className="text-sm font-semibold">{field.name}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-sm">
                            <span className="text-neutral-500">Value:</span>
                            <span className="font-mono text-neutral-200">{field.value}</span>
                            <span className="text-neutral-500">Bits:</span>
                            <span className="font-mono text-neutral-200">{field.bits}</span>
                        </div>
                    </div>
                </HoverCardContent>
            </HoverCard>
        ))}
    </div>
);

const ControlBits: React.FC<{ ackedInfo: AckedPacketInfo }> = ({ ackedInfo }) => {
    const fields: BitField[] = [
        { name: 'ACKed Frag Idx', value: ackedInfo.fragmentIndex.toString(), bits: ackedInfo.fragmentIndex.toString(2).padStart(4, '0'), color: 'bg-purple-600' },
        { name: 'ACKed Last Frag', value: ackedInfo.lastFragment ? '1' : '0', bits: ackedInfo.lastFragment ? '1' : '0', color: 'bg-pink-600' },
        { name: 'Status', value: `${ackedInfo.status} (${ackStatusMap[ackedInfo.status]})`, bits: ackedInfo.status.toString(2).padStart(2, '0'), color: 'bg-yellow-600' },
        { name: 'Telemetry Blob', value: ackedInfo.telemetryBit ? '1' : '0', bits: ackedInfo.telemetryBit ? '1' : '0', color: 'bg-green-600' },
    ];

    const byteValue = parseInt(fields.map(f => f.bits).join(''), 2);

    return (
        <div className="space-y-4">
            <div className="flex flex-col space-y-2">
                <div className="flex justify-between text-xs font-mono text-neutral-500 px-1">
                    <span>Byte 14</span>
                    <span>0x{byteValue.toString(16).padStart(2, '0').toUpperCase()}</span>
                </div>
                <div className="bg-black/40 p-3 rounded-lg border border-neutral-800">
                    {renderHoverableBits(fields)}
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {fields.map(field => (
                    <div key={field.name} className="flex items-center space-x-2.5">
                        <div className={`w-3 h-3 rounded-sm ${field.color} flex-shrink-0 shadow-sm`}></div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-medium text-neutral-400 truncate">{field.name}</span>
                            <span className="font-mono text-neutral-200 truncate">{field.value}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HealthBlobVisualizer: React.FC<{ ackedInfo: AckedPacketInfo }> = ({ ackedInfo }) => {
    const toRssiVal = (rssi: number): number => {
        if (rssi >= 7) return 127; // UNKNOWN
        return Math.min(Math.max(rssi + 120, 0), 126);
    };
    const toIdleRssiVal = (rssi: number): number => {
        if (rssi >= 7) return 63; // UNKNOWN maps to max
        return Math.min(Math.max(rssi + 120, 0), 62);
    };

    const ackedRssiVal = toRssiVal(ackedInfo.ackedRssi);
    const ackingRssiVal = toRssiVal(ackedInfo.ackingRssi);
    const idleRssiVal = toIdleRssiVal(ackedInfo.idleRssi);

    const byte15 = (ackedInfo.hasBattery ? 0x80 : 0) | (ackedInfo.batteryVoltage & 0x7F);
    const byte16 = (ackedRssiVal << 1) | ((ackingRssiVal >> 6) & 0x01);
    const byte17 = ((ackingRssiVal & 0x3F) << 2) | ((idleRssiVal >> 4) & 0x03);
    const byte18 = ((idleRssiVal & 0x0F) << 4) | ((ackedInfo.prevLqi >> 4) & 0x0F);
    const byte19 = ((ackedInfo.prevLqi & 0x0F) << 4) | (ackedInfo.txPowerLevel & 0x0F);

    const allBitsString = [byte15, byte16, byte17, byte18, byte19].map(b => b.toString(2).padStart(8, '0')).join('');

    const fields = [
        { name: 'Has Battery', value: ackedInfo.hasBattery ? 'Yes' : 'No', color: 'bg-lime-600' },
        { name: 'Battery', value: `${(ackedInfo.batteryVoltage / 10).toFixed(1)}V`, color: 'bg-cyan-600' },
        { name: 'ACKed RSSI', value: ackedInfo.ackedRssi >= 7 ? "Unk" : `${ackedInfo.ackedRssi}dBm`, color: 'bg-red-600' },
        { name: 'ACKing RSSI', value: ackedInfo.ackingRssi >= 7 ? "Unk" : `${ackedInfo.ackingRssi}dBm`, color: 'bg-pink-600' },
        { name: 'Idle RSSI', value: ackedInfo.idleRssi >= 7 ? "Unk" : `${ackedInfo.idleRssi}dBm`, color: 'bg-yellow-600' },
        { name: 'Prev LQI', value: `${ackedInfo.prevLqi}/255`, color: 'bg-purple-600' },
        { name: 'TX Power', value: `Lv. ${ackedInfo.txPowerLevel}`, color: 'bg-orange-600' },
    ];

    const bitFieldDefinitions: BitField[] = [
        { name: fields[0].name, value: fields[0].value, bits: allBitsString.substring(0, 1), color: 'bg-lime-600' },
        { name: fields[1].name, value: fields[1].value, bits: allBitsString.substring(1, 8), color: 'bg-cyan-600' },
        { name: fields[2].name, value: fields[2].value, bits: allBitsString.substring(8, 15), color: 'bg-red-600' },
        { name: fields[3].name, value: fields[3].value, bits: allBitsString.substring(15, 22), color: 'bg-pink-600' },
        { name: fields[4].name, value: fields[4].value, bits: allBitsString.substring(22, 28), color: 'bg-yellow-600' },
        { name: fields[5].name, value: fields[5].value, bits: allBitsString.substring(28, 36), color: 'bg-purple-600' },
        { name: fields[6].name, value: fields[6].value, bits: allBitsString.substring(36, 40), color: 'bg-orange-600' },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-col space-y-2">
                <div className="font-mono text-xs text-neutral-500 text-center">Bytes 15-19</div>
                <div className="bg-black/40 p-3 rounded-lg border border-neutral-800">
                    {renderHoverableBits(bitFieldDefinitions)}
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {fields.map(field => (
                    <div key={field.name} className="flex items-center space-x-2.5">
                        <div className={`w-3 h-3 rounded-sm ${field.color} flex-shrink-0 shadow-sm`}></div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-medium text-neutral-400 truncate">{field.name}</span>
                            <span className="font-mono text-neutral-200 truncate">{field.value}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
};

const LocationBlobVisualizer: React.FC<{ ackedInfo: AckedPacketInfo }> = ({ ackedInfo }) => {
    const { allBitsString, fields } = useMemo(() => {
        const qlat = BigInt(Math.round((ackedInfo.latitude + 90) / 180 * (Math.pow(2, 24) - 1)));
        const qlon = BigInt(Math.round((ackedInfo.longitude + 180) / 360 * (Math.pow(2, 24) - 1)));
        const qalt = BigInt(Math.round((ackedInfo.altitude + 1000) / 0.1));
        const qweek = BigInt(ackedInfo.gpsWeek & 0x3FF);
        const qtow = BigInt(ackedInfo.timeOfWeek);
        const qspeed = BigInt(Math.min(4095, Math.round(ackedInfo.speed * 100)));
        const qhead = BigInt(Math.round((ackedInfo.heading % 360) / 360 * 4095));
        const qsats = BigInt(Math.min(63, ackedInfo.satellites));
        const qprec = BigInt(Math.min(255, Math.round(ackedInfo.precisionRadius * 10)));

        let packed = 0n;
        packed = (packed << 24n) | qlat;
        packed = (packed << 24n) | qlon;
        packed = (packed << 20n) | qalt;
        packed = (packed << 10n) | qweek;
        packed = (packed << 20n) | qtow;
        packed = (packed << 12n) | qspeed;
        packed = (packed << 12n) | qhead;
        packed = (packed << 6n) | qsats;
        packed = (packed << 8n) | qprec;

        const allBitsString = packed.toString(2).padStart(136, '0');

        const fields = [
            { name: 'Latitude', value: `${ackedInfo.latitude.toFixed(5)}°` },
            { name: 'Longitude', value: `${ackedInfo.longitude.toFixed(5)}°` },
            { name: 'Altitude', value: `${ackedInfo.altitude.toFixed(1)} m` },
            { name: 'GPS Week', value: ackedInfo.gpsWeek.toString() },
            { name: 'Time of Week', value: `${ackedInfo.timeOfWeek} s` },
            { name: 'Speed', value: `${ackedInfo.speed.toFixed(2)} m/s` },
            { name: 'Heading', value: `${ackedInfo.heading.toFixed(1)}°` },
            { name: 'Satellites', value: ackedInfo.satellites.toString() },
            { name: 'Precision', value: `${ackedInfo.precisionRadius.toFixed(1)} m` },
        ];

        return { allBitsString, fields };
    }, [ackedInfo]);

    const bitFieldDefinitions: BitField[] = useMemo(() => [
        { name: fields[0].name, value: fields[0].value, bits: allBitsString.substring(0, 24), color: 'bg-red-600' },
        { name: fields[1].name, value: fields[1].value, bits: allBitsString.substring(24, 48), color: 'bg-orange-600' },
        { name: fields[2].name, value: fields[2].value, bits: allBitsString.substring(48, 68), color: 'bg-amber-600' },
        { name: fields[3].name, value: fields[3].value, bits: allBitsString.substring(68, 78), color: 'bg-yellow-600' },
        { name: fields[4].name, value: fields[4].value, bits: allBitsString.substring(78, 98), color: 'bg-lime-600' },
        { name: fields[5].name, value: fields[5].value, bits: allBitsString.substring(98, 110), color: 'bg-green-600' },
        { name: fields[6].name, value: fields[6].value, bits: allBitsString.substring(110, 122), color: 'bg-emerald-600' },
        { name: fields[7].name, value: fields[7].value, bits: allBitsString.substring(122, 128), color: 'bg-teal-600' },
        { name: fields[8].name, value: fields[8].value, bits: allBitsString.substring(128, 136), color: 'bg-cyan-600' },
    ], [allBitsString, fields]);


    return (
        <div className="space-y-4">
            <div className="flex flex-col space-y-2">
                <div className="font-mono text-xs text-neutral-500 text-center">Bytes 20-36 (136 bits)</div>
                <div className="bg-black/40 p-3 rounded-lg border border-neutral-800">
                    {renderHoverableBits(bitFieldDefinitions)}
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {fields.map((field, i) => (
                    <div key={field.name} className="flex items-center space-x-2.5">
                        <div className={`w-3 h-3 rounded-sm ${bitFieldDefinitions[i].color} flex-shrink-0 shadow-sm`}></div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-medium text-neutral-400 truncate">{field.name}</span>
                            <span className="font-mono text-neutral-200 truncate">{String(field.value)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const AckPayloadVisualizer: React.FC<{ ackedInfo: AckedPacketInfo }> = ({ ackedInfo }) => {
    return (
        <div className="bg-black/20 p-1 rounded-lg space-y-4">
            <Section label="Acknowledged Packet ID" byteCount={6}>
                <div className="grid grid-cols-6 gap-2">
                    {Array.from(ackedInfo.packetId).map((byte, i) => <ByteCell key={i} value={byte} color="bg-cyan-600" />)}
                </div>
            </Section>

            <Section label="Acknowledged Inner MAC" byteCount={8}>
                <div className="grid grid-cols-8 gap-2">
                    {Array.from(ackedInfo.innerMac).map((byte, i) => <ByteCell key={i} value={byte} color="bg-purple-600" />)}
                </div>
            </Section>

            <Section label="Control" byteCount={1}>
                <ControlBits ackedInfo={ackedInfo} />
            </Section>

            {ackedInfo.telemetryBit && (
                <div className="animate-fade-in space-y-4">
                    <Section label="Health" byteCount={5}>
                        <HealthBlobVisualizer ackedInfo={ackedInfo} />
                    </Section>
                    <Section label="Location" byteCount={17}>
                        <LocationBlobVisualizer ackedInfo={ackedInfo} />
                    </Section>
                </div>
            )}

            <Section label="Reserved" byteCount={ackedInfo.telemetryBit ? 19 : 41}>
                <p className="text-xs text-neutral-500 pt-2 text-center">These bytes are reserved for future use.</p>
            </Section>
        </div>
    );
};

export default AckPayloadVisualizer;