import React, { useState, useEffect } from 'react';
import type { PacketHeaderConfig, AckedPacketInfo, TelemetryPacketInfo } from './types';
import { AddressingType, PacketType, AckStatus } from './types';
import { bytesToHex, hexToBytes, generateRandomBytes } from './hermesProtocol';
import InfoIcon from './icons/InfoIcon';
import AddressInput from './AddressInput';
import CustomSelect, { type CustomSelectOption } from './CustomSelect';
import UserIcon from './icons/UserIcon';
import UsersIcon from './icons/UsersIcon';
import BroadcastIcon from './icons/BroadcastIcon';
import SearchIcon from './icons/SearchIcon';
import AutocorrelationGraph from './AutocorrelationGraph';
import PacketTypeSelect from './PacketTypeSelect';
import AckPayloadBuilder from './AckPayloadBuilder';
import PingPayloadBuilder from './PingPayloadBuilder';
import SyncWordStats from './SyncWordStats';
import TelemetryPayloadBuilder from './TelemetryPayloadBuilder';
import PhyIcon from './icons/PhyIcon';
import Tooltip from './Tooltip';
import Slider from './Slider';
import { Network, Database, Shield, Lock, FileCode2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface PacketBuilderProps {
    config: PacketHeaderConfig;
    setConfig: React.Dispatch<React.SetStateAction<PacketHeaderConfig>>;
    payloadText: string;
    setPayloadText: React.Dispatch<React.SetStateAction<string>>;
    sharedSecret: Uint8Array;
    setSharedSecret: React.Dispatch<React.SetStateAction<Uint8Array>>;
    signature: Uint8Array;
    syncWord: Uint8Array;
    setSyncWord: React.Dispatch<React.SetStateAction<Uint8Array>>;
    hoveredByte?: number | null;
    ackedPacketInfo: AckedPacketInfo | null;
    setAckedPacketInfo: React.Dispatch<React.SetStateAction<AckedPacketInfo | null>>;
    telemetryPacketInfo: TelemetryPacketInfo | null;
    setTelemetryPacketInfo: React.Dispatch<React.SetStateAction<TelemetryPacketInfo | null>>;
    hopPath: Uint8Array[];
    setHopPath: React.Dispatch<React.SetStateAction<Uint8Array[]>>;
}

const Label: React.FC<{ htmlFor: string, children: React.ReactNode, tooltip: string }> = ({ htmlFor, children, tooltip }) => (
    <label htmlFor={htmlFor} className="flex items-center space-x-1.5 text-[10px] font-bold text-neutral-500 mb-1 uppercase tracking-widest whitespace-nowrap">
        <span>{children}</span>
        <Tooltip content={tooltip}>
            <InfoIcon className="w-3 h-3 text-neutral-600 hover:text-neutral-300 transition-colors cursor-help" />
        </Tooltip>
    </label>
);

const PacketBuilder: React.FC<PacketBuilderProps> = ({
    config,
    setConfig,
    payloadText,
    setPayloadText,
    sharedSecret,
    setSharedSecret,
    signature,
    syncWord,
    setSyncWord,
    hoveredByte,
    ackedPacketInfo,
    setAckedPacketInfo,
    telemetryPacketInfo,
    setTelemetryPacketInfo,
    hopPath,
    setHopPath
}) => {

    const [syncWordRaw, setSyncWordRaw] = useState('');
    const [isSyncWordEditing, setIsSyncWordEditing] = useState(false);
    const [secretRaw, setSecretRaw] = useState('');
    const [isSecretEditing, setIsSecretEditing] = useState(false);

    // Initializers and Resets
    useEffect(() => {
        if (config.type === PacketType.ACK) {
            if (!ackedPacketInfo) {
                const ackInfo: AckedPacketInfo = {
                    nonce: generateRandomBytes(12),
                    signature: generateRandomBytes(16),
                    fragmentIndex: Math.floor(Math.random() * 16),
                    lastFragment: Math.random() > 0.5,
                    status: AckStatus.ACK_OK,
                    telemetryBit: true,
                    hasBattery: true,
                    batteryVoltage: 120,
                    ackedRssi: -60,
                    ackingRssi: -55,
                    idleRssi: -100,
                    prevLqi: 64,
                    txPowerLevel: 8,
                    latitude: 34.0522,
                    longitude: -118.2437,
                    altitude: 71,
                    gpsWeek: 2300,
                    timeOfWeek: 345600,
                    speed: 15.5,
                    heading: 180.0,
                    satellites: 8,
                    precisionRadius: 5.2,
                };
                setAckedPacketInfo(ackInfo);
            }
        } else if (config.type === PacketType.PING) {
            if (hopPath.length === 0) setHopPath([generateRandomBytes(6), generateRandomBytes(6)]);
        } else if (config.type === PacketType.TELEMETRY) {
            if (!telemetryPacketInfo) {
                const telemetryInfo: TelemetryPacketInfo = {
                    tag: 'HERMES-NODE-00001',
                    uptime: 49380,
                    flags: { hasBattery: true, hasLocation: true, hasHygrometer: false, hasGasSensor: false, hasLuxSensor: false, hasUvSensor: false, hasMovementSensor: false, isCustomData: false },
                    batteryVoltage: 4180, batteryCurrent: -150,
                    location: { latitude: 34.0522, longitude: -118.2437, altitude: 71, gpsWeek: 2300, timeOfWeek: 345600, speed: 15.5, heading: 180.0, satellites: 8, precisionRadius: 5.2 },
                    humidity: 0, temperature: 0, gasPpm: 0, pressureHpa: 0, lux: 0, uvIndex: 0, movement: 0, customData: '',
                };
                setTelemetryPacketInfo(telemetryInfo);
            }
        } else {
            if (ackedPacketInfo !== null) { setAckedPacketInfo(null); setPayloadText("Hello Hermes!"); }
            if (telemetryPacketInfo !== null) setTelemetryPacketInfo(null);
        }
    }, [config.type]);

    const handleFragmentIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const index = parseInt(e.target.value, 10);
        setConfig(prev => ({ ...prev, fragmentIndex: index, lastFragment: index === 15 ? true : prev.lastFragment }));
    };

    const handleTogglePong = () => {
        setConfig(prev => ({ ...prev, wantAck: !prev.wantAck, source: prev.destination, destination: prev.source }));
    };

    const handleAddressingChange = (value: number) => {
        const updates: Partial<PacketHeaderConfig> = { addressing: value };
        if (value === AddressingType.BROADCAST) {
            updates.destination = hexToBytes('FFFFFFFFFFFF', 6);
            updates.wantAck = false;
            updates.ttl = 1;
        } else if (value === AddressingType.DISCOVER) {
            updates.destination = hexToBytes('DDDDDDDDDDDD', 6);
            updates.type = PacketType.DISCOVERY;
            updates.wantAck = false;
            updates.ttl = 1;
        }
        setConfig(prev => ({ ...prev, ...updates }));
    };

    const baseInputClasses = "bg-black/40 border-neutral-800 text-neutral-300 placeholder:text-neutral-600 focus-visible:ring-sky-500/50 font-mono";

    const addressingOptions: CustomSelectOption[] = [
        { value: AddressingType.UNICAST, label: 'Unicast', icon: UserIcon },
        { value: AddressingType.MULTICAST, label: 'Multicast', icon: UsersIcon },
        { value: AddressingType.BROADCAST, label: 'Broadcast', icon: BroadcastIcon },
        { value: AddressingType.DISCOVER, label: 'Discover', icon: SearchIcon },
    ];

    const isHovered = (start: number, end: number) => hoveredByte !== null && hoveredByte !== undefined && hoveredByte >= start && hoveredByte <= end;
    const highlightClass = 'ring-1 ring-sky-400 bg-sky-900/20 rounded z-10';

    const PanelSection: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode, h?: boolean, span?: number }> = ({ title, icon, children, h, span }) => (
        <div className={`flex flex-col bg-neutral-900/60 backdrop-blur-md rounded-xl border border-neutral-800/80 overflow-hidden shadow-md col-span-${span || 1}`}>
            <h3 className="px-3 py-2 bg-black/40 border-b border-neutral-800/80 text-[11px] font-bold uppercase tracking-widest text-neutral-300 flex items-center gap-2">
                {icon}
                {title}
            </h3>
            <div className={`p-4 gap-4 ${h ? 'flex flex-row items-start' : 'flex flex-col space-y-4'}`}>
                {children}
            </div>
        </div>
    );

    return (
        <div className="w-full flex flex-col gap-4 font-sans max-w-[1200px] mx-auto p-1">

            {/* Top Row: PHY & Cryptography */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PanelSection title="Physical Modulator" icon={<PhyIcon className="w-4 h-4 text-emerald-400" />}>
                    <div className="flex-1 w-full space-y-3">
                        <div>
                            <Label htmlFor="sync-word" tooltip="The 4-byte Sync Word. Its MSB determines the Preamble pattern (0xAA or 0x55).">Hardware Sync Word</Label>
                            <Input
                                id="sync-word" type="text"
                                value={isSyncWordEditing ? syncWordRaw : bytesToHex(syncWord)}
                                onFocus={() => { setSyncWordRaw(bytesToHex(syncWord).replace(/\s/g, '')); setIsSyncWordEditing(true); }}
                                onBlur={() => setIsSyncWordEditing(false)}
                                onChange={(e) => {
                                    const raw = e.target.value.toUpperCase(); setSyncWordRaw(raw);
                                    const cln = raw.replace(/\s/g, ''); if (/^[0-9A-F]*$/.test(cln) && cln.length <= 8) setSyncWord(hexToBytes(cln, 4));
                                }}
                                className={baseInputClasses}
                            />
                        </div>
                        <SyncWordStats syncWord={syncWord} />
                        <AutocorrelationGraph syncWord={syncWord} />
                    </div>
                </PanelSection>

                <PanelSection title="Security & Signatures" icon={<Lock className="w-4 h-4 text-rose-400" />}>
                    <div className="flex-1 space-y-4">
                        <div className={`p-2 -m-2 transition-all ${isHovered(2, 13) ? highlightClass : ''}`}>
                            <Label htmlFor="nonce" tooltip="12-byte nonce for ChaCha20 encryption.">ChaCha20 Nonce Initialization Vector</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex-grow font-mono text-xs text-neutral-400 max-w-[280px] truncate bg-black/40 p-2 rounded border border-neutral-800">
                                    {bytesToHex(config.nonce)}
                                </div>
                                <button onClick={() => setConfig(prev => ({ ...prev, nonce: generateRandomBytes(12) }))} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-[10px] font-bold uppercase rounded text-neutral-300 transition-colors">
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="shared-secret" tooltip="32-byte secret key for ChaCha20-Poly1305 AEAD.">Network Master Key</Label>
                            <div className="flex items-center space-x-2">
                                <Input
                                    id="shared-secret" type="text"
                                    value={isSecretEditing ? secretRaw : bytesToHex(sharedSecret)}
                                    onFocus={() => { setSecretRaw(bytesToHex(sharedSecret).replace(/\s/g, '')); setIsSecretEditing(true); }}
                                    onBlur={() => setIsSecretEditing(false)}
                                    onChange={(e) => {
                                        const raw = e.target.value.toUpperCase(); setSecretRaw(raw);
                                        const cleanHex = raw.replace(/\s/g, ''); if (/^[0-9A-F]*$/.test(cleanHex) && cleanHex.length <= 64) setSharedSecret(hexToBytes(cleanHex, 32));
                                    }}
                                    className={`${baseInputClasses} text-rose-200/80`}
                                />
                                <button onClick={() => setSharedSecret(generateRandomBytes(32))} className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded transition-colors border border-rose-500/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                </button>
                            </div>
                        </div>

                        <div className={`p-2 -m-2 opacity-80 transition-all ${isHovered(80, 95) ? highlightClass : ''}`}>
                            <Label htmlFor="signature" tooltip="16-byte Poly1305 MAC. Generated automatically to securely validate this exact layout's hash against the key.">Poly1305 MAC Hash (Out)</Label>
                            <p className="font-mono text-[11px] p-2 bg-transparent rounded border border-neutral-800 text-neutral-500">{bytesToHex(signature)}</p>
                        </div>
                    </div>
                </PanelSection>
            </div>

            {/* Bottom Row: Core Framing & Payload */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-2">
                <PanelSection title="Transport Header" icon={<Network className="w-4 h-4 text-sky-400" />}>
                    <div className="space-y-4 w-full">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <Label htmlFor="packet-type" tooltip="Transport packet designation identifier.">Packet Profile</Label>
                                <PacketTypeSelect config={config} setConfig={setConfig} />
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="addressing" tooltip="Addressing mode routing style.">Addresing Scheme</Label>
                                <CustomSelect options={addressingOptions} value={config.addressing} onChange={handleAddressingChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-black/20 p-3 rounded-lg border border-neutral-800/50">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor="ttl" tooltip="Time To Live Mesh Depletion count.">TTL limit</Label>
                                    <span className="text-xs font-mono text-sky-400">{config.ttl}</span>
                                </div>
                                <Slider id="ttl" min={0} max={7} value={config.ttl} onChange={(e) => setConfig(prev => ({ ...prev, ttl: parseInt(e.target.value) }))} disabled={config.addressing === AddressingType.BROADCAST} />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor="fragment-index" tooltip="Index for large fragmented payloads.">Fragment #</Label>
                                    <span className="text-xs font-mono text-sky-400">{config.fragmentIndex}</span>
                                </div>
                                <Slider id="fragment-index" min={0} max={15} value={config.fragmentIndex} onChange={handleFragmentIndexChange} />
                            </div>
                        </div>

                        <div className="flex gap-4 items-center pl-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <Checkbox id="want-ack" checked={config.wantAck} onCheckedChange={(c) => setConfig(prev => ({ ...prev, wantAck: !!c }))} disabled={config.addressing === AddressingType.BROADCAST} className="border-neutral-700 bg-neutral-900 border-2 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500" />
                                <span className={`text-xs font-bold text-neutral-400 uppercase tracking-wider group-hover:text-neutral-300 transition-colors ${config.addressing === AddressingType.BROADCAST ? 'opacity-50' : ''}`}>Require ACK</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <Checkbox id="last-fragment" checked={config.lastFragment} onCheckedChange={(c) => setConfig(prev => ({ ...prev, lastFragment: !!c }))} disabled={config.fragmentIndex === 15} className="border-neutral-700 bg-neutral-900 border-2 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500" />
                                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider group-hover:text-neutral-300 transition-colors">Final Segment</span>
                            </label>
                        </div>
                    </div>
                </PanelSection>

                <PanelSection title="Network Routing" icon={<Database className="w-4 h-4 text-purple-400" />}>
                    <div className="space-y-5 w-full">
                        <div className={`p-2 -m-2 transition-all ${isHovered(14, 19) ? highlightClass : ''}`}>
                            <AddressInput
                                label="Target Destination"
                                tooltip="6-byte destination node or subnet address."
                                value={config.destination}
                                onChange={(val) => setConfig(prev => ({ ...prev, destination: val }))}
                                disabled={config.addressing === AddressingType.BROADCAST || config.addressing === AddressingType.DISCOVER}
                            />
                        </div>
                        <div className={`p-2 -m-2 pt-0 transition-all ${isHovered(20, 25) ? highlightClass : ''}`}>
                            <AddressInput
                                label="Originating Source"
                                tooltip="6-byte source node or subnet address (can be encrypted)."
                                value={config.source}
                                onChange={(val) => setConfig(prev => ({ ...prev, source: val }))}
                            />
                        </div>

                        <div className="text-[10px] text-neutral-500 p-3 bg-neutral-950/50 rounded border border-neutral-800 border-dashed">
                            The destination address designates the literal physical target or the subnet ID block. In sealed-sender transmission rules, Source may be encrypted.
                        </div>
                    </div>
                </PanelSection>

                <PanelSection title="Data Payload Interface" icon={<FileCode2 className="w-4 h-4 text-amber-400" />}>
                    <div className="w-full space-y-2 relative">
                        {config.type === PacketType.ACK ? (
                            <AckPayloadBuilder ackedPacketInfo={ackedPacketInfo} setAckedPacketInfo={setAckedPacketInfo} hoveredByte={hoveredByte} isTelemetrySectionExpanded onToggleTelemetrySection={() => { }} />
                        ) : config.type === PacketType.PING ? (
                            <PingPayloadBuilder hopPath={hopPath} setHopPath={setHopPath} isPong={!config.wantAck} onTogglePong={handleTogglePong} source={config.source} destination={config.destination} />
                        ) : config.type === PacketType.TELEMETRY ? (
                            <div className="h-[280px] overflow-y-auto custom-scrollbar pr-2">
                                <TelemetryPayloadBuilder telemetryInfo={telemetryPacketInfo} setTelemetryInfo={setTelemetryPacketInfo} />
                            </div>
                        ) : (
                            <div className={`h-[280px] flex flex-col p-2 -m-2 transition-all ${isHovered(26, 79) ? highlightClass : ''}`}>
                                <Label htmlFor="payload-text" tooltip="Up to 54 bytes of application-specific data.">Raw Byte String Body</Label>
                                <textarea
                                    id="payload-text"
                                    value={payloadText}
                                    onChange={(e) => setPayloadText(e.target.value)}
                                    className={`${baseInputClasses} flex-1 resize-none bg-black/60 font-mono text-sm p-4 w-full block focus-visible:outline-none transition-all rounded-md focus-visible:border-sky-500/50`}
                                    maxLength={54}
                                ></textarea>
                                <div className="flex justify-between items-center mt-2 px-1">
                                    <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest">UTF-8 Encoded</span>
                                    <span className={`text-[10px] font-mono font-bold ${new TextEncoder().encode(payloadText).length > 40 ? 'text-amber-400' : 'text-emerald-500'}`}>
                                        {new TextEncoder().encode(payloadText).length}/54 bytes
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </PanelSection>
            </div>
        </div>
    );
};

export default PacketBuilder;