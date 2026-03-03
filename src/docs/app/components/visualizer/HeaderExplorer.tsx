import React, { useState, useEffect } from 'react';
import type { PacketHeaderConfig } from './types';
import { PacketType, AddressingType } from './types';
import { generateRandomBytes, buildRawPacket, bytesToHex, parseHeader } from './hermesProtocol';
import HeaderVisualizer from './HeaderVisualizer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Settings2, Terminal, Layers } from 'lucide-react';

const HeaderExplorer: React.FC = () => {
    const [config, setConfig] = useState<PacketHeaderConfig>({
        type: PacketType.MESSAGE,
        ttl: 15,
        addressing: AddressingType.UNICAST,
        wantAck: true,
        fragmentIndex: 0,
        lastFragment: true,
        packetId: new Uint8Array([0xAB, 0xCD, 0x12, 0x34, 0x56, 0x78]),
        destination: new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0x01]),
        source: new Uint8Array([0xC0, 0xFF, 0xEE, 0x00, 0x00, 0x02]),
        hopNonce: new Uint8Array([0x11, 0x22, 0x33, 0x44]),
    });

    const [rawHeaderHex, setRawHeaderHex] = useState('');

    useEffect(() => {
        const dummyPayload = new Uint8Array(56);
        const dummyKey = new Uint8Array(32);
        const { header } = buildRawPacket(config, dummyPayload, dummyKey);
        setRawHeaderHex(bytesToHex(header));
    }, [config]);

    const updateField = (field: keyof PacketHeaderConfig, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration Panel */}
                <Card className="lg:col-span-5 border-neutral-800 bg-neutral-900/50 backdrop-blur-sm shadow-xl">
                    <CardHeader className="border-b border-neutral-800/50 py-4">
                        <CardTitle className="flex items-center text-sm font-bold tracking-widest text-blue-400 uppercase">
                            <Settings2 className="w-4 h-4 mr-2" /> Header Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Row 1: Type & Addressing */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-neutral-500">Payload Type</Label>
                                <Select value={config.type.toString()} onValueChange={(v) => updateField('type', parseInt(v))}>
                                    <SelectTrigger className="bg-black border-neutral-800 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-neutral-900 border-neutral-800">
                                        <SelectItem value={PacketType.MESSAGE.toString()}>Message</SelectItem>
                                        <SelectItem value={PacketType.ACK.toString()}>ACK</SelectItem>
                                        <SelectItem value={PacketType.TELEMETRY.toString()}>Telemetry</SelectItem>
                                        <SelectItem value={PacketType.DISCOVERY.toString()}>Discovery</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-neutral-500">Addressing</Label>
                                <Select value={config.addressing.toString()} onValueChange={(v) => updateField('addressing', parseInt(v))}>
                                    <SelectTrigger className="bg-black border-neutral-800 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-neutral-900 border-neutral-800">
                                        <SelectItem value={AddressingType.UNICAST.toString()}>Unicast</SelectItem>
                                        <SelectItem value={AddressingType.MULTICAST.toString()}>Multicast</SelectItem>
                                        <SelectItem value={AddressingType.BROADCAST.toString()}>Broadcast</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 2: TTL & Frag Index */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <Label className="text-[10px] uppercase font-bold text-neutral-500">TTL</Label>
                                    <span className="text-[10px] font-mono text-blue-400">{config.ttl}</span>
                                </div>
                                <Slider
                                    value={[config.ttl]}
                                    max={15}
                                    step={1}
                                    onValueChange={([v]) => updateField('ttl', v)}
                                    className="py-1"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <Label className="text-[10px] uppercase font-bold text-neutral-500">Frag Index</Label>
                                    <span className="text-[10px] font-mono text-pink-400">{config.fragmentIndex}</span>
                                </div>
                                <Slider
                                    value={[config.fragmentIndex]}
                                    max={15}
                                    step={1}
                                    onValueChange={([v]) => updateField('fragmentIndex', v)}
                                    className="py-1"
                                />
                            </div>
                        </div>

                        {/* Row 3: Switches */}
                        <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-neutral-800/50">
                            <div className="flex items-center space-x-8">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="want-ack"
                                        checked={config.wantAck}
                                        onCheckedChange={(v) => updateField('wantAck', v)}
                                    />
                                    <Label htmlFor="want-ack" className="text-[10px] uppercase font-bold text-neutral-400">Request ACK</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="last-frag"
                                        checked={config.lastFragment}
                                        onCheckedChange={(v) => updateField('lastFragment', v)}
                                    />
                                    <Label htmlFor="last-frag" className="text-[10px] uppercase font-bold text-neutral-400">Last Frag</Label>
                                </div>
                            </div>
                        </div>

                        {/* Packet ID Randomizer */}
                        <div className="pt-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] uppercase font-bold text-neutral-500 text-emerald-500/80">Bytes 2-7: Packet ID</Label>
                                <button
                                    onClick={() => updateField('packetId', generateRandomBytes(6))}
                                    className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors uppercase font-bold"
                                >
                                    Regenerate
                                </button>
                            </div>
                            <div className="p-2 bg-black/40 rounded border border-neutral-800 font-mono text-xs text-center tracking-widest text-neutral-300">
                                {bytesToHex(config.packetId)}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Visualizer Panel */}
                <div className="lg:col-span-7 space-y-6">
                    <Card className="border-neutral-800 bg-black/40 shadow-xl overflow-hidden">
                        <CardHeader className="border-b border-neutral-800/50 py-3 bg-neutral-900/40">
                            <CardTitle className="flex justify-between items-center text-xs font-bold tracking-widest text-neutral-400 uppercase">
                                <div className="flex items-center">
                                    <Layers className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Byte-Level Structural View
                                </div>
                                <Badge variant="outline" className="font-mono text-[9px] border-emerald-500/30 text-emerald-400 px-1.5 h-4">
                                    MTU: 24B HEADER
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-6">
                            <HeaderVisualizer config={config} />
                        </CardContent>
                    </Card>

                    {/* Serialization Preview */}
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-neutral-500 ml-1">
                            <Terminal className="w-3 h-3" /> Raw Serialized Buffer
                        </div>
                        <div className="p-4 bg-neutral-900/80 rounded-xl border border-neutral-800 font-mono text-xs text-blue-300/80 break-all leading-relaxed shadow-inner">
                            {rawHeaderHex}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeaderExplorer;
