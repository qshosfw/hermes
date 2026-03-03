import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Activity, Signal, Zap, ShieldAlert } from 'lucide-react';

// Fast Integer Sigmoid (Elliot Approximation) — M=6, K=2
const pInt = (snr: number): number => {
    const diff = snr - 6;
    return 127 + Math.floor((diff * 128) / (Math.abs(diff) + 2));
};

const LqiVisualizer: React.FC = () => {
    const [ackedRssi, setAckedRssi] = useState(-75);
    const [ackingRssi, setAckingRssi] = useState(-82);
    const [idleRssi, setIdleRssi] = useState(-110);

    const snrFwd = ackedRssi - idleRssi;
    const snrRev = ackingRssi - idleRssi;
    const pFwd = pInt(snrFwd);
    const pRev = pInt(snrRev);

    const lqi = useMemo(() => {
        const raw = Math.floor((pFwd + pRev) / 2);
        return Math.min(Math.max(raw, 0), 255);
    }, [pFwd, pRev]);

    const getStatus = () => {
        if (lqi > 200) return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
        if (lqi > 120) return { label: 'Good', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
        if (lqi > 60) return { label: 'Fair', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
        return { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
    };

    const status = getStatus();

    return (
        <Card className="border-border bg-card shadow-xl overflow-hidden">
            <CardHeader className="border-b py-4">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    Fast Integer Sigmoid LQI Calculator
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Compute LQI from the RSSI Triad using the Elliot sigmoid approximation (M=6, K=2).
                </p>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label className="text-xs text-muted-foreground">ACKed RSSI (R_pkt)</Label>
                                <span className="text-xs font-mono">{ackedRssi} dBm</span>
                            </div>
                            <Slider value={[ackedRssi]} onValueChange={([v]) => setAckedRssi(v)} min={-120} max={6} step={1} />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label className="text-xs text-muted-foreground">ACKing RSSI (R_ack)</Label>
                                <span className="text-xs font-mono">{ackingRssi} dBm</span>
                            </div>
                            <Slider value={[ackingRssi]} onValueChange={([v]) => setAckingRssi(v)} min={-120} max={6} step={1} />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label className="text-xs text-muted-foreground">Idle RSSI / Noise Floor (R_idle)</Label>
                                <span className="text-xs font-mono">{idleRssi} dBm</span>
                            </div>
                            <Slider value={[idleRssi]} onValueChange={([v]) => setIdleRssi(v)} min={-120} max={-60} step={1} />
                        </div>

                        <div className="rounded-lg border bg-muted/30 p-4 space-y-1 font-mono text-xs text-muted-foreground">
                            <div>S_fwd = {ackedRssi} - ({idleRssi}) = <span className="text-foreground font-semibold">{snrFwd} dB</span></div>
                            <div>S_rev = {ackingRssi} - ({idleRssi}) = <span className="text-foreground font-semibold">{snrRev} dB</span></div>
                            <div className="pt-1 border-t border-border mt-1">
                                P_int(S_fwd) = 127 + ({snrFwd}-6)×128 / (|{snrFwd}-6| + 2) = <span className="text-foreground font-semibold">{pFwd}</span>
                            </div>
                            <div>
                                P_int(S_rev) = 127 + ({snrRev}-6)×128 / (|{snrRev}-6| + 2) = <span className="text-foreground font-semibold">{pRev}</span>
                            </div>
                            <div className="pt-1 border-t border-border mt-1">
                                LQI = clamp(0, ({pFwd} + {pRev}) / 2, 255) = <span className="text-foreground font-bold">{lqi}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-8 rounded-xl border bg-muted/20 relative overflow-hidden">
                        <div className={`absolute inset-0 opacity-10 ${status.bg} transition-colors duration-500`} />

                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-xs font-medium text-muted-foreground mb-2">Composite LQI</span>
                            <div className={`text-7xl font-bold font-mono tracking-tighter transition-colors duration-500 ${status.color}`}>
                                {lqi}
                            </div>
                            <Badge className={`mt-4 px-4 py-1 border transition-all duration-500 ${status.bg} ${status.color} ${status.border}`}>
                                {status.label}
                            </Badge>

                            <div className="w-full mt-6">
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${lqi >= 200 ? 'bg-emerald-500' : lqi >= 120 ? 'bg-blue-500' : lqi >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                        style={{ width: `${(lqi / 255) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <div className="p-2.5 rounded-lg border bg-card">
                                    <Signal className={`w-4 h-4 ${status.color}`} />
                                </div>
                                <div className="p-2.5 rounded-lg border bg-card">
                                    <Zap className={`w-4 h-4 ${status.color}`} />
                                </div>
                                <div className="p-2.5 rounded-lg border bg-card">
                                    <ShieldAlert className={`w-4 h-4 ${status.color}`} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-3 rounded-lg border bg-muted/20">
                    <p className="text-xs text-muted-foreground font-mono">
                        P_int(S) = 127 + ((S - 6) &lt;&lt; 7) / (|S - 6| + 2)  •  LQI = clamp(0, (P_fwd + P_rev) / 2, 255)
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default LqiVisualizer;
