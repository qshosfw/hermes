import React, { useMemo } from 'react';
import type { TelemetryPacketInfo } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';

const Section: React.FC<{ label: string; byteCount: number | string; children: React.ReactNode; }> = ({ label, byteCount, children }) => (
    <Card className="bg-neutral-900/30 border-neutral-800 shadow-none h-full">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 pb-2 border-b border-neutral-800/50 mb-3">
            <CardTitle className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{label}</CardTitle>
            <Badge variant="secondary" className="font-mono text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400">
                {byteCount} {typeof byteCount === 'number' && byteCount === 1 ? 'byte' : 'bytes'}
            </Badge>
        </CardHeader>
        <CardContent className="p-4 pt-0">
            {children}
        </CardContent>
    </Card>
);

const ByteCell: React.FC<{ value: number; color?: string }> = ({ value, color }) => (
    <div className={`w-8 h-8 flex items-center justify-center font-mono text-sm rounded ${color ? `${color} text-white shadow-sm ring-1 ring-white/10 cursor-pointer hover:brightness-110 transition-all` : 'bg-neutral-800 text-neutral-300 border border-neutral-700'}`}>
        {value.toString(16).padStart(2, '0').toUpperCase()}
    </div>
);

const Bit: React.FC<{ value: string; color: string; isFirst?: boolean }> = ({ value, color, isFirst }) => (
    <div className={`w-6 h-8 flex items-center justify-center font-mono text-xs md:text-sm rounded ${color} text-white font-bold shadow-sm ring-1 ring-black/20 ${isFirst ? 'ml-1.5' : ''}`}>
        {value}
    </div>
);

const formatUptime = (totalSeconds: number) => {
    if (totalSeconds < 1) return '0s';
    totalSeconds = Math.floor(totalSeconds);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
};

const ValueBlock: React.FC<{
    label: string;
    value: string | number;
    bits: string;
    color: string;
    byteSize: number
}> = ({ label, value, bits, color, byteSize }) => {
    const renderBits = () => {
        if (byteSize > 4) {
            return (
                <div className="flex flex-wrap gap-1 bg-black/40 p-2 rounded-lg border border-neutral-800 cursor-help transition-transform hover:scale-[1.02]">
                    {bits.match(/.{1,8}/g)?.map((byteBits, i) => (
                        <div key={i} className="flex gap-px">
                            {byteBits.split('').map((bit, j) => (
                                <div key={j} className={`w-1.5 h-3 ${bit === '1' ? color : 'bg-neutral-700'} opacity-80 rounded-sm`}></div>
                            ))}
                        </div>
                    ))}
                </div>
            )
        }
        return (
            <div className="flex flex-wrap justify-center items-center gap-0.5 bg-black/40 p-2 rounded-lg border border-neutral-800 cursor-help transition-transform hover:scale-[1.02]">
                {bits.split('').map((bit, i) => (
                    <Bit key={i} value={bit} color={color} isFirst={i % 8 === 0 && i !== 0} />
                ))}
            </div>
        )
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs px-1">
                <span className="font-medium text-neutral-400">{label}</span>
                <span className="font-mono text-neutral-200">{value}</span>
            </div>
            <HoverCard openDelay={50} closeDelay={50}>
                <HoverCardTrigger asChild>
                    {renderBits()}
                </HoverCardTrigger>
                <HoverCardContent className="w-auto z-[9999]" sideOffset={8}>
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-sm ${color}`}></div>
                            <h4 className="text-sm font-semibold">{label}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-sm">
                            <span className="text-neutral-500">Value:</span>
                            <span className="font-mono text-neutral-200">{value}</span>
                            <span className="text-neutral-500">Bitfield:</span>
                            <span className="font-mono text-neutral-200 break-all">{bits}</span>
                        </div>
                    </div>
                </HoverCardContent>
            </HoverCard>
        </div>
    );
};

const FlagsVisualizer: React.FC<{ flags: TelemetryPacketInfo['flags'], byte: number }> = ({ flags, byte }) => {
    const flagBits = byte.toString(2).padStart(8, '0');
    const fields = [
        { name: 'Battery', color: 'bg-green-600' },
        { name: 'Location', color: 'bg-blue-600' },
        { name: 'Hygrometer', color: 'bg-sky-600' },
        { name: 'Gas Sensor', color: 'bg-yellow-600' },
        { name: 'Lux Sensor', color: 'bg-amber-600' },
        { name: 'UV Sensor', color: 'bg-orange-600' },
        { name: 'Movement', color: 'bg-red-600' },
        { name: 'Custom Data', color: 'bg-purple-600' },
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-center items-center bg-black/40 p-3 rounded-lg border border-neutral-800 gap-1.5">
                {flagBits.split('').map((bit, i) => (
                    <HoverCard key={i} openDelay={50} closeDelay={50}>
                        <HoverCardTrigger asChild>
                            <div className="cursor-help transition-transform hover:scale-110 hover:z-10">
                                <Bit value={bit} color={fields[i].color} />
                            </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-auto z-[9999]" sideOffset={8}>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-sm ${fields[i].color}`}></div>
                                    {fields[i].name} Flag
                                </h4>
                                <p className="text-sm text-neutral-400">Status: <span className="text-white font-mono">{bit === '1' ? 'Active' : 'Missing'}</span></p>
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {fields.map((field, i) => (
                    <div key={field.name} className="flex items-center space-x-2.5">
                        <div className={`w-3 h-3 rounded-sm ${field.color} flex-shrink-0 shadow-sm`}></div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-medium text-neutral-400 truncate">{field.name}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const LocationBitsVisualizer: React.FC<{ loc: TelemetryPacketInfo['location'] }> = ({ loc }) => {
    const { bitFieldDefinitions, fields } = useMemo(() => {
        const qlat = BigInt(Math.round((loc.latitude + 90) / 180 * (Math.pow(2, 24) - 1)));
        const qlon = BigInt(Math.round((loc.longitude + 180) / 360 * (Math.pow(2, 24) - 1)));
        const qalt = BigInt(Math.round((loc.altitude + 1000) / 0.1));
        const qweek = BigInt(loc.gpsWeek & 0x3FF);
        const qtow = BigInt(loc.timeOfWeek);
        const qspeed = BigInt(Math.min(4095, Math.round(loc.speed * 100)));
        const qhead = BigInt(Math.round((loc.heading % 360) / 360 * 4095));
        const qsats = BigInt(Math.min(63, loc.satellites));
        const qprec = BigInt(Math.min(255, Math.round(loc.precisionRadius * 10)));

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
            { name: 'Latitude', value: `${loc.latitude.toFixed(4)}°` },
            { name: 'Longitude', value: `${loc.longitude.toFixed(4)}°` },
            { name: 'Altitude', value: `${loc.altitude.toFixed(1)} m` },
            { name: 'GPS Week', value: loc.gpsWeek },
            { name: 'Time of Week', value: `${loc.timeOfWeek} s` },
            { name: 'Speed', value: `${loc.speed.toFixed(2)} m/s` },
            { name: 'Heading', value: `${loc.heading.toFixed(1)}°` },
            { name: 'Sats', value: loc.satellites },
            { name: 'Prec', value: `${loc.precisionRadius.toFixed(1)} m` },
        ];

        const bitFieldDefinitions = [
            { name: 'Latitude', bits: allBitsString.substring(0, 24), color: 'bg-red-600' },
            { name: 'Longitude', bits: allBitsString.substring(24, 48), color: 'bg-orange-600' },
            { name: 'Altitude', bits: allBitsString.substring(48, 68), color: 'bg-amber-600' },
            { name: 'GPS Week', bits: allBitsString.substring(68, 78), color: 'bg-yellow-600' },
            { name: 'Time of Week', bits: allBitsString.substring(78, 98), color: 'bg-lime-600' },
            { name: 'Speed', bits: allBitsString.substring(98, 110), color: 'bg-green-600' },
            { name: 'Heading', bits: allBitsString.substring(110, 122), color: 'bg-emerald-600' },
            { name: 'Satellites', bits: allBitsString.substring(122, 128), color: 'bg-teal-600' },
            { name: 'Precision', bits: allBitsString.substring(128, 136), color: 'bg-cyan-600' },
        ];

        return { bitFieldDefinitions, fields };
    }, [loc]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-center items-center gap-y-1.5 bg-black/40 p-3 rounded-lg border border-neutral-800">
                {bitFieldDefinitions.map((field, fieldIndex) => (
                    <HoverCard key={fieldIndex} openDelay={50} closeDelay={50}>
                        <HoverCardTrigger asChild>
                            <div className={`flex ${fieldIndex > 0 ? 'ml-1.5' : ''} cursor-help transition-transform hover:scale-105 hover:z-10`}>
                                {field.bits.split('').map((bit, bitIndex) => (
                                    <Bit
                                        key={bitIndex}
                                        value={bit}
                                        color={field.color}
                                    />
                                ))}
                            </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-auto z-[9999]" sideOffset={8}>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-sm ${field.color}`}></div>
                                    {field.name}
                                </h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-sm">
                                    <span className="text-neutral-500">Value:</span>
                                    <span className="font-mono text-neutral-200">{fields[fieldIndex].value}</span>
                                    <span className="text-neutral-500">Bitfield:</span>
                                    <span className="font-mono text-neutral-200">{field.bits}</span>
                                </div>
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                ))}
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
}

interface TelemetryPayloadVisualizerProps {
    telemetryInfo: TelemetryPacketInfo;
    payload: Uint8Array;
}

const TelemetryPayloadVisualizer: React.FC<TelemetryPayloadVisualizerProps> = ({ telemetryInfo, payload }) => {
    const { flags } = telemetryInfo;
    const uptimeInSeconds = telemetryInfo.uptime * 0.25;

    let offset = 21; // Tag(17) + Uptime(3) + Flags(1)

    const sections: React.ReactNode[] = [];

    if (flags.isCustomData) {
        const customDataLen = 54 - 21;
        sections.push(
            <Section key="custom" label="Custom Data" byteCount={customDataLen}>
                <div className="grid grid-cols-8 md:grid-cols-16 gap-2">
                    {Array.from(payload.slice(21, 54)).map((byte, i) => <ByteCell key={i} value={byte} color="bg-purple-600" />)}
                </div>
            </Section>
        );
    } else {
        if (flags.hasBattery) {
            // View creation for simple extraction logic visualization if needed, but we use telemetryInfo directly
            const vBits = telemetryInfo.batteryVoltage.toString(2).padStart(16, '0');
            // int16 conversion for visualization
            const cVal = new Uint16Array(new Int16Array([telemetryInfo.batteryCurrent]).buffer)[0];
            const cBits = cVal.toString(2).padStart(16, '0');

            sections.push(
                <Section key="battery" label="Battery" byteCount={4}>
                    <div className="space-y-4">
                        <ValueBlock label="Voltage" value={`${telemetryInfo.batteryVoltage} mV`} bits={vBits} color="bg-green-600" byteSize={2} />
                        <ValueBlock label="Current" value={`${telemetryInfo.batteryCurrent} mA`} bits={cBits} color="bg-emerald-600" byteSize={2} />
                    </div>
                </Section>
            );
            offset += 4;
        }
        if (flags.hasLocation && offset + 17 <= 54) {
            sections.push(
                <Section key="location" label="Location" byteCount={17}>
                    <LocationBitsVisualizer loc={telemetryInfo.location} />
                </Section>
            );
            offset += 17;
        }
        if (flags.hasHygrometer && offset + 4 <= 54) {
            const hBits = telemetryInfo.humidity.toString(2).padStart(16, '0');
            const tVal = new Uint16Array(new Int16Array([telemetryInfo.temperature]).buffer)[0];
            const tBits = tVal.toString(2).padStart(16, '0');
            sections.push(
                <Section key="hygrometer" label="Hygrometer" byteCount={4}>
                    <div className="space-y-4">
                        <ValueBlock label="Humidity" value={`${(telemetryInfo.humidity / 100).toFixed(2)} %`} bits={hBits} color="bg-sky-600" byteSize={2} />
                        <ValueBlock label="Temperature" value={`${(telemetryInfo.temperature / 100).toFixed(2)} °C`} bits={tBits} color="bg-cyan-600" byteSize={2} />
                    </div>
                </Section>
            );
            offset += 4;
        }
        if (flags.hasGasSensor && offset + 4 <= 54) {
            const gBits = telemetryInfo.gasPpm.toString(2).padStart(16, '0');
            const pBits = telemetryInfo.pressureHpa.toString(2).padStart(16, '0');
            sections.push(
                <Section key="gas" label="Gas Sensor" byteCount={4}>
                    <div className="space-y-4">
                        <ValueBlock label="Gas Concentration" value={`${telemetryInfo.gasPpm} PPM`} bits={gBits} color="bg-yellow-600" byteSize={2} />
                        <ValueBlock label="Pressure" value={`${telemetryInfo.pressureHpa} hPa`} bits={pBits} color="bg-amber-600" byteSize={2} />
                    </div>
                </Section>
            );
            offset += 4;
        }
        if (flags.hasLuxSensor && offset + 2 <= 54) {
            const lBits = telemetryInfo.lux.toString(2).padStart(16, '0');
            sections.push(<Section key="lux" label="Light Sensor" byteCount={2}>
                <ValueBlock label="Intensity" value={`${telemetryInfo.lux} Lux`} bits={lBits} color="bg-amber-500" byteSize={2} />
            </Section>);
            offset += 2;
        }
        if (flags.hasUvSensor && offset + 2 <= 54) {
            const uBits = telemetryInfo.uvIndex.toString(2).padStart(16, '0');
            sections.push(<Section key="uv" label="UV Sensor" byteCount={2}>
                <ValueBlock label="UV Index" value={`${(telemetryInfo.uvIndex / 100).toFixed(2)}`} bits={uBits} color="bg-orange-500" byteSize={2} />
            </Section>);
            offset += 2;
        }
        if (flags.hasMovementSensor && offset + 2 <= 54) {
            const mBits = telemetryInfo.movement.toString(2).padStart(16, '0');
            sections.push(<Section key="movement" label="Movement Sensor" byteCount={2}>
                <ValueBlock label="Magnitude" value={telemetryInfo.movement} bits={mBits} color="bg-red-500" byteSize={2} />
            </Section>);
            offset += 2;
        }
    }

    const remainingBytes = 54 - offset;

    return (
        <div className="bg-black/20 p-1 rounded-lg space-y-4">
            <Section label="Device Tag" byteCount={17}>
                <div className="font-mono text-sm p-3 bg-black/40 rounded-lg text-neutral-300 border border-neutral-800 break-all">{telemetryInfo.tag || <span className="text-neutral-600">(empty)</span>}</div>
            </Section>

            <Section label="Uptime" byteCount={3}>
                <div className="font-mono text-xl text-center text-neutral-200 py-2 bg-black/40 rounded-lg border border-neutral-800">{formatUptime(uptimeInSeconds)}</div>
            </Section>

            <Section label="Flags" byteCount={1}>
                <FlagsVisualizer flags={flags} byte={payload[20]} />
            </Section>

            {sections}

            {remainingBytes > 0 && !flags.isCustomData && (
                <Section label="Padding" byteCount={remainingBytes}>
                    <p className="text-xs text-neutral-500 pt-2 text-center">These bytes are unused.</p>
                </Section>
            )}
        </div>
    );
};

export default TelemetryPayloadVisualizer;