import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Activity, MapPin, Battery, Cpu, Radio, Zap, Thermometer, Droplets, Wind, Sun, Move } from 'lucide-react';
import { buildTelemetryPayload, parseTelemetryPayload } from './hermesProtocol';

const Bit: React.FC<{ value: string; color: string; isFirst?: boolean }> = ({ value, color, isFirst }) => (
    <div className={`w-4 h-6 md:w-5 md:h-7 flex items-center justify-center font-mono text-[10px] md:text-xs rounded ${color} text-white font-bold shadow-sm ring-1 ring-black/20 ${isFirst ? 'ml-1' : ''}`}>
        {value}
    </div>
);

const Section: React.FC<{ label: string; byteCount: number | string; color?: string; children: React.ReactNode }> = ({ label, byteCount, color = "text-neutral-400", children }) => (
    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-800/50">
            <h4 className={`font-semibold text-[10px] uppercase tracking-wider ${color}`}>{label}</h4>
            <span className="text-[9px] font-mono text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">{byteCount} {typeof byteCount === 'number' && byteCount === 1 ? 'byte' : 'bytes'}</span>
        </div>
        {children}
    </div>
);

const TelemetryVisualizer: React.FC = () => {
    const [tag, setTag] = useState('HERMES-NODE-1');
    const [uptime, setUptime] = useState(3600); // Ticks (0.25s)
    const [flags, setFlags] = useState({
        hasBattery: true,
        hasLocation: true,
        hasHygrometer: false,
        hasGasSensor: false,
        hasLuxSensor: false,
        hasUvSensor: false,
        hasMovementSensor: false,
        isCustomData: false
    });

    const [batteryVoltage, setBatteryVoltage] = useState(4200);
    const [batteryCurrent, setBatteryCurrent] = useState(150);
    const [location, setLocation] = useState({
        latitude: 45.4215,
        longitude: -75.6972,
        altitude: 100,
        gpsWeek: 2200,
        timeOfWeek: 345600,
        speed: 1.5,
        heading: 180,
        satellites: 12,
        precisionRadius: 2.5
    });

    const payload = useMemo(() => {
        return buildTelemetryPayload({
            tag,
            uptime,
            flags,
            batteryVoltage,
            batteryCurrent,
            location,
            humidity: 4500,
            temperature: 2200,
            gasPpm: 450,
            pressureHpa: 1013,
            lux: 500,
            uvIndex: 250,
            movement: 0,
            customData: ''
        });
    }, [tag, uptime, flags, batteryVoltage, batteryCurrent, location]);

    const bitstream = useMemo(() => {
        return Array.from(payload).map(b => b.toString(2).padStart(8, '0')).join('');
    }, [payload]);

    const flagOctet = payload[20].toString(2).padStart(8, '0');
    const locationBits = bitstream.substring((21 + (flags.hasBattery ? 4 : 0)) * 8, (21 + (flags.hasBattery ? 4 : 0) + 17) * 8);

    const toggleFlag = (flag: keyof typeof flags) => {
        setFlags(prev => {
            const next = { ...prev, [flag]: !prev[flag] };
            if (flag === 'isCustomData' && next.isCustomData) {
                return { ...next, hasBattery: false, hasLocation: false, hasHygrometer: false, hasGasSensor: false, hasLuxSensor: false, hasUvSensor: false, hasMovementSensor: false };
            }
            if (flag !== 'isCustomData' && next[flag]) {
                next.isCustomData = false;
            }
            return next;
        });
    };

    return (
        <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur-md shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-neutral-800/50 bg-neutral-900/20 py-4">
                <CardTitle className="flex items-center text-sm font-bold tracking-widest text-emerald-400 uppercase">
                    <Activity className="w-4 h-4 mr-2" /> Telemetry High-Density Explorer
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                {/* Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-6 lg:col-span-1">
                        <Section label="Identification" byteCount={17} color="text-blue-400">
                            <Input
                                value={tag}
                                onChange={(e) => setTag(e.target.value.slice(0, 17))}
                                className="bg-black border-neutral-800 font-mono text-xs"
                                placeholder="Device Tag"
                            />
                        </Section>

                        <Section label="Feature Flags" byteCount={1} color="text-indigo-400">
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(flags).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800 rounded-lg">
                                        <Label className="text-[9px] uppercase font-bold text-neutral-500 truncate mr-2">{key.replace('has', '').replace('is', '')}</Label>
                                        <Switch checked={val} onCheckedChange={() => toggleFlag(key as keyof typeof flags)} className="scale-75" />
                                    </div>
                                ))}
                            </div>
                        </Section>

                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-emerald-500 uppercase">Density</span>
                                <Badge variant="outline" className="font-mono text-[9px] text-emerald-400 border-emerald-500/20">
                                    {(payload.length / 56 * 100).toFixed(0)}% Utilized
                                </Badge>
                            </div>
                            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: '100%' }} />
                            </div>
                        </div>
                    </div>

                    {/* Middle Column: Detailed Bitfields */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Flag Breakdown */}
                        <Section label="Flags Octet (Byte 20)" byteCount={1} color="text-indigo-400">
                            <div className="flex justify-center gap-1 bg-black/40 p-3 rounded-lg border border-neutral-800">
                                {flagOctet.split('').map((bit, i) => {
                                    const colors = ["bg-green-600", "bg-blue-600", "bg-sky-600", "bg-yellow-600", "bg-amber-600", "bg-orange-600", "bg-red-600", "bg-purple-600"];
                                    return <Bit key={i} value={bit} color={colors[i]} />;
                                })}
                            </div>
                        </Section>

                        {/* Location Breakdown if active */}
                        {flags.hasLocation && (
                            <Section label="Location Bitfield (136 bits)" byteCount={17} color="text-blue-400">
                                <div className="flex flex-wrap justify-center gap-px bg-black/40 p-3 rounded-lg border border-neutral-800">
                                    {locationBits.split('').map((bit, i) => {
                                        // Lat(24), Lon(24), Alt(20), Week(10), Tow(20), Speed(12), Head(12), Sats(6), Prec(8)
                                        let color = "bg-neutral-700";
                                        if (i < 24) color = "bg-red-600";
                                        else if (i < 48) color = "bg-orange-600";
                                        else if (i < 68) color = "bg-amber-600";
                                        else if (i < 78) color = "bg-yellow-600";
                                        else if (i < 98) color = "bg-lime-600";
                                        else if (i < 110) color = "bg-green-600";
                                        else if (i < 122) color = "bg-emerald-600";
                                        else if (i < 128) color = "bg-teal-600";
                                        else color = "bg-cyan-600";

                                        return (
                                            <div key={i} className={`w-1.5 h-3 md:w-2 md:h-4 ${bit === '1' ? color : 'bg-neutral-800'} transition-colors duration-300 rounded-[1px]`} />
                                        );
                                    })}
                                </div>
                                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 pt-2">
                                    {[
                                        { n: 'Lat', c: 'text-red-400' }, { n: 'Lon', c: 'text-orange-400' }, { n: 'Alt', c: 'text-amber-400' },
                                        { n: 'Wk', c: 'text-yellow-400' }, { n: 'Tow', c: 'text-lime-400' }, { n: 'Spd', c: 'text-green-400' },
                                        { n: 'Hdg', c: 'text-emerald-400' }, { n: 'Sat', c: 'text-teal-400' }, { n: 'Pre', c: 'text-cyan-400' }
                                    ].map(f => (
                                        <div key={f.n} className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800">
                                            <div className={`w-1.5 h-1.5 rounded-full ${f.c.replace('text', 'bg')}`} />
                                            <span className={`text-[8px] font-bold uppercase ${f.c}`}>{f.n}</span>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* Battery Breakdown if active */}
                        {flags.hasBattery && (
                            <Section label="Battery Info (32 bits)" byteCount={4} color="text-emerald-400">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                                            <span>Voltage</span>
                                            <span className="text-emerald-400">{batteryVoltage}mV</span>
                                        </div>
                                        <div className="flex gap-px">
                                            {batteryVoltage.toString(2).padStart(16, '0').split('').map((bit, i) => (
                                                <div key={i} className={`flex-grow h-3 ${bit === '1' ? 'bg-emerald-500' : 'bg-neutral-800'} rounded-[1px]`} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                                            <span>Current</span>
                                            <span className="text-emerald-400">{batteryCurrent}mA</span>
                                        </div>
                                        <div className="flex gap-px">
                                            {batteryCurrent.toString(2).padStart(16, '0').split('').map((bit, i) => (
                                                <div key={i} className={`flex-grow h-3 ${bit === '1' ? 'bg-emerald-500' : 'bg-neutral-800'} rounded-[1px]`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Section>
                        )}
                    </div>
                </div>

                {/* Bottom: Raw Payload Map */}
                <Section label="Full Payload Map (56 Bytes)" byteCount={56} color="text-neutral-500">
                    <div className="grid grid-cols-7 md:grid-cols-14 gap-1.5 p-2 bg-black/40 rounded-xl border border-neutral-800/50">
                        {Array.from(payload).map((byte, i) => {
                            let type = "padding";
                            let color = "bg-neutral-800 text-neutral-600";

                            if (i < 17) { type = "tag"; color = "bg-blue-500/20 text-blue-400 border border-blue-500/30"; }
                            else if (i < 20) { type = "uptime"; color = "bg-orange-500/20 text-orange-400 border border-orange-500/30"; }
                            else if (i === 20) { type = "flags"; color = "bg-indigo-500/40 text-indigo-200 border border-indigo-500/50 ring-1 ring-indigo-400/30"; }
                            else if (flags.hasBattery && i <= 24) { type = "battery"; color = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"; }
                            else if (flags.hasLocation && ((!flags.hasBattery && i > 20 && i <= 37) || (flags.hasBattery && i > 24 && i <= 41))) {
                                type = "location"; color = "bg-red-500/20 text-red-400 border border-red-500/30";
                            }

                            return (
                                <div key={i} className={`flex flex-col items-center justify-center h-10 rounded-lg text-[9px] font-mono group relative ${color} transition-all hover:scale-105`}>
                                    <span className="opacity-40 text-[7px] absolute top-1 left-1">{i}</span>
                                    <span className="font-bold">{byte.toString(16).padStart(2, '0').toUpperCase()}</span>
                                    <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-[8px] whitespace-nowrap z-50 border border-neutral-700">
                                        {type.toUpperCase()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap gap-4 pt-2">
                        {[
                            { n: 'Tag', c: 'bg-blue-500' }, { n: 'Uptime', c: 'bg-orange-500' }, { n: 'Flags', c: 'bg-indigo-500' },
                            { n: 'Battery', c: 'bg-emerald-500' }, { n: 'Location', c: 'bg-red-500' }, { n: 'Padding', c: 'bg-neutral-800' }
                        ].map(l => (
                            <div key={l.n} className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${l.c}`} />
                                <span className="text-[9px] font-bold text-neutral-500 uppercase">{l.n}</span>
                            </div>
                        ))}
                    </div>
                </Section>
            </CardContent>
        </Card>
    );
};

export default TelemetryVisualizer;
