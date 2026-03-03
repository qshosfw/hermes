import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
    CheckCircle2, XCircle, ShieldCheck, RefreshCcw, Activity,
    Battery, MapPin, Gauge, Radio, Signal
} from 'lucide-react';

// Fast Integer Sigmoid (Elliot Approximation) — M=6, K=2
const pInt = (snr: number): number => {
    const diff = snr - 6;
    return 127 + Math.floor((diff * 128) / (Math.abs(diff) + 2));
};

const computeLqi = (ackedRssi: number, ackingRssi: number, idleRssi: number): number => {
    const sFwd = ackedRssi - idleRssi;
    const sRev = ackingRssi - idleRssi;
    const raw = Math.floor((pInt(sFwd) + pInt(sRev)) / 2);
    return Math.max(0, Math.min(255, raw));
};

const Section: React.FC<{
    label: string;
    bytes: string;
    icon: React.ReactNode;
    color?: string;
    children: React.ReactNode;
}> = ({ label, bytes, icon, color = 'text-muted-foreground', children }) => (
    <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                {icon}
                <span className={`text-sm font-semibold ${color}`}>{label}</span>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">{bytes}</Badge>
        </div>
        {children}
    </div>
);

const AckVisualizer: React.FC = () => {
    const [status, setStatus] = useState(0);
    const [fragIdx, setFragIdx] = useState(0);
    const [lastFrag, setLastFrag] = useState(true);
    const [telemetryBit, setTelemetryBit] = useState(true);

    const [hasBattery, setHasBattery] = useState(true);
    const [batteryVoltage, setBatteryVoltage] = useState(42); // 0.1V steps
    const [ackedRssi, setAckedRssi] = useState(-75);
    const [ackingRssi, setAckingRssi] = useState(-82);
    const [idleRssi, setIdleRssi] = useState(-110);
    const [txPower, setTxPower] = useState(5);

    const lqi = useMemo(() => computeLqi(ackedRssi, ackingRssi, idleRssi), [ackedRssi, ackingRssi, idleRssi]);
    const snrFwd = ackedRssi - idleRssi;
    const snrRev = ackingRssi - idleRssi;

    const statuses = [
        { label: 'ACK OK', desc: 'No Errors', icon: CheckCircle2, color: 'text-emerald-500' },
        { label: 'ACK Corrected', desc: 'Corrected via FEC', icon: ShieldCheck, color: 'text-yellow-500' },
        { label: 'NACK No Retry', desc: 'Unrecoverable', icon: XCircle, color: 'text-red-500' },
        { label: 'NACK Retransmit', desc: 'Please Retransmit', icon: RefreshCcw, color: 'text-blue-500' },
    ];

    // Byte 14: [FragIdx(4) | LastFrag(1) | Status(2) | Telemetry(1)]
    const byte14 = useMemo(() => {
        let val = (fragIdx & 0x0F) << 4;
        if (lastFrag) val |= 0x08;
        val |= (status & 0x03) << 1;
        if (telemetryBit) val |= 0x01;
        return val;
    }, [fragIdx, lastFrag, status, telemetryBit]);

    const byte14Bits = byte14.toString(2).padStart(8, '0');

    // Health Blob byte 15
    const byte15 = (hasBattery ? 0x80 : 0) | (batteryVoltage & 0x7F);

    const lqiLevel = lqi >= 200 ? { label: 'Excellent', color: 'text-emerald-400' }
        : lqi >= 120 ? { label: 'Good', color: 'text-green-400' }
            : lqi >= 60 ? { label: 'Fair', color: 'text-yellow-400' }
                : { label: 'Critical', color: 'text-red-400' };

    return (
        <Card className="border-border bg-card shadow-xl overflow-hidden">
            <CardHeader className="border-b py-4">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Type 0 ACK Explorer
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Simulate different packet states and observe how the 56-byte ACK payload adapts.
                </p>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Controls */}
                    <div className="space-y-5">
                        {/* Status Selection */}
                        <Section label="ACK Status" bytes="2 bits" icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} color="text-emerald-500">
                            <div className="grid grid-cols-2 gap-2">
                                {statuses.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setStatus(i)}
                                        className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${status === i
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : 'border-border hover:border-muted-foreground/30'
                                            }`}
                                    >
                                        <s.icon className={`w-4 h-4 ${status === i ? s.color : 'text-muted-foreground'}`} />
                                        <div>
                                            <div className={`text-xs font-semibold ${status === i ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {s.label}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </Section>

                        {/* Fragment Controls */}
                        <Section label="Fragment Control" bytes="5 bits" icon={<Radio className="w-4 h-4 text-purple-500" />} color="text-purple-500">
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <Label className="text-xs text-muted-foreground">Fragment Index</Label>
                                        <span className="text-xs font-mono text-foreground">{fragIdx}</span>
                                    </div>
                                    <Slider value={[fragIdx]} onValueChange={([v]) => setFragIdx(v)} max={15} min={0} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Last Fragment</Label>
                                    <Switch checked={lastFrag} onCheckedChange={setLastFrag} />
                                </div>
                            </div>
                        </Section>

                        {/* Telemetry Toggle */}
                        <Section label="Telemetry Blob" bytes="22 bytes" icon={<Signal className="w-4 h-4 text-blue-500" />} color="text-blue-500">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground">Include Health + Location</Label>
                                <Switch checked={telemetryBit} onCheckedChange={setTelemetryBit} />
                            </div>
                        </Section>
                    </div>

                    {/* Right Column: Technical Breakdown */}
                    <div className="space-y-5">
                        {/* Bitfield Visualization */}
                        <Section label="Bitfields (Byte 14)" bytes="1 byte" icon={<Gauge className="w-4 h-4 text-indigo-500" />} color="text-indigo-500">
                            <div className="flex justify-center gap-1 py-2">
                                {byte14Bits.split('').map((bit, i) => {
                                    let bg = 'bg-muted';
                                    if (i < 4) bg = bit === '1' ? 'bg-purple-500' : 'bg-purple-500/20';
                                    else if (i === 4) bg = bit === '1' ? 'bg-pink-500' : 'bg-pink-500/20';
                                    else if (i < 7) bg = bit === '1' ? 'bg-yellow-500' : 'bg-yellow-500/20';
                                    else bg = bit === '1' ? 'bg-emerald-500' : 'bg-emerald-500/20';
                                    return (
                                        <div key={i} className={`w-8 h-8 flex items-center justify-center rounded font-mono text-sm font-bold ${bg} text-white`}>
                                            {bit}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-[10px] text-center">
                                <div><span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1" />FragIdx</div>
                                <div><span className="inline-block w-2 h-2 rounded-full bg-pink-500 mr-1" />Last</div>
                                <div><span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1" />Status</div>
                                <div><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />Telem</div>
                            </div>
                            <div className="text-center font-mono text-sm text-muted-foreground mt-2">
                                0x{byte14.toString(16).toUpperCase().padStart(2, '0')}
                            </div>
                        </Section>

                        {/* RSSI + LQI */}
                        <Section label="RSSI Triad & LQI" bytes="5 bytes" icon={<Signal className="w-4 h-4 text-emerald-500" />} color="text-emerald-500">
                            <div className={`space-y-4 transition-opacity ${telemetryBit ? '' : 'opacity-30 pointer-events-none'}`}>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Has Battery</Label>
                                    <Switch checked={hasBattery} onCheckedChange={setHasBattery} />
                                </div>
                                {hasBattery && (
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <Label className="text-xs text-muted-foreground">Battery Voltage</Label>
                                            <span className="text-xs font-mono">{(batteryVoltage / 10).toFixed(1)}V</span>
                                        </div>
                                        <Slider value={[batteryVoltage]} onValueChange={([v]) => setBatteryVoltage(v)} max={127} min={0} />
                                    </div>
                                )}
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <Label className="text-xs text-muted-foreground">ACKed RSSI (R_pkt)</Label>
                                        <span className="text-xs font-mono">{ackedRssi} dBm</span>
                                    </div>
                                    <Slider value={[ackedRssi]} onValueChange={([v]) => setAckedRssi(v)} max={6} min={-120} />
                                </div>
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <Label className="text-xs text-muted-foreground">ACKing RSSI (R_ack)</Label>
                                        <span className="text-xs font-mono">{ackingRssi} dBm</span>
                                    </div>
                                    <Slider value={[ackingRssi]} onValueChange={([v]) => setAckingRssi(v)} max={6} min={-120} />
                                </div>
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <Label className="text-xs text-muted-foreground">Idle RSSI (R_idle)</Label>
                                        <span className="text-xs font-mono">{idleRssi} dBm</span>
                                    </div>
                                    <Slider value={[idleRssi]} onValueChange={([v]) => setIdleRssi(v)} max={-60} min={-120} />
                                </div>
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <Label className="text-xs text-muted-foreground">TX Power</Label>
                                        <span className="text-xs font-mono">Level {txPower}</span>
                                    </div>
                                    <Slider value={[txPower]} onValueChange={([v]) => setTxPower(v)} max={15} min={0} />
                                </div>

                                {/* LQI Result */}
                                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">Computed LQI</span>
                                        <span className={`text-2xl font-bold font-mono ${lqiLevel.color}`}>{lqi}</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${lqi >= 200 ? 'bg-emerald-500' : lqi >= 120 ? 'bg-green-500' : lqi >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                            style={{ width: `${(lqi / 255) * 100}%` }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground font-mono mt-1">
                                        <div>SNR_fwd: {snrFwd} dB → P={pInt(snrFwd)}</div>
                                        <div>SNR_rev: {snrRev} dB → P={pInt(snrRev)}</div>
                                    </div>
                                    <div className={`text-xs font-semibold ${lqiLevel.color}`}>{lqiLevel.label}</div>
                                </div>
                            </div>
                        </Section>
                    </div>
                </div>

                {/* Payload Map */}
                <Section label="56-Byte Payload Map" bytes="56 bytes" icon={<Activity className="w-4 h-4 text-muted-foreground" />}>
                    <div className="grid grid-cols-7 md:grid-cols-14 gap-1 p-2 rounded-lg border bg-muted/20">
                        {Array.from({ length: 56 }).map((_, i) => {
                            let color = 'bg-muted text-muted-foreground';
                            let label = 'pad';
                            if (i < 6) { color = 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'; label = 'ID'; }
                            else if (i < 14) { color = 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'; label = 'MAC'; }
                            else if (i === 14) { color = 'bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 border border-indigo-500/40 ring-1 ring-indigo-400/30'; label = 'BF'; }
                            else if (telemetryBit && i <= 19) { color = 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'; label = 'HP'; }
                            else if (telemetryBit && i <= 36) { color = 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'; label = 'LOC'; }

                            let val = '00';
                            if (i === 14) val = byte14.toString(16).toUpperCase().padStart(2, '0');
                            if (i === 15 && telemetryBit) val = byte15.toString(16).toUpperCase().padStart(2, '0');

                            return (
                                <div key={i} className={`h-9 flex flex-col items-center justify-center rounded text-[9px] font-mono ${color} transition-colors group relative`}>
                                    <span className="opacity-40 text-[7px] leading-none">{i}</span>
                                    <span className="font-bold leading-none">{val}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap gap-3 pt-2">
                        {[
                            { n: 'Packet ID', c: 'bg-cyan-500' },
                            { n: 'Inner MAC', c: 'bg-purple-500' },
                            { n: 'Bitfields', c: 'bg-indigo-500' },
                            { n: 'Health', c: 'bg-emerald-500' },
                            { n: 'Location', c: 'bg-blue-500' },
                            { n: 'Padding', c: 'bg-muted' },
                        ].map(l => (
                            <div key={l.n} className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${l.c}`} />
                                <span className="text-xs text-muted-foreground">{l.n}</span>
                            </div>
                        ))}
                    </div>
                </Section>
            </CardContent>
        </Card>
    );
};

export default AckVisualizer;
