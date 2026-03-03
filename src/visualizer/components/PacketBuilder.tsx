import React, { useState, useEffect } from 'react';
import { PacketHeaderConfig, AddressingType, AckedPacketInfo, PacketType, AckStatus, TelemetryPacketInfo } from '../types';
import { bytesToHex, hexToBytes, generateRandomBytes } from '../services/hermesProtocol';
import InfoIcon from './icons/InfoIcon';
import AddressInput from './AddressInput';
import CustomSelect, { CustomSelectOption } from './CustomSelect';
import UserIcon from './icons/UserIcon';
import UsersIcon from './icons/UsersIcon';
import BroadcastIcon from './icons/BroadcastIcon';
import SearchIcon from './icons/SearchIcon';
import AutocorrelationGraph from './AutocorrelationGraph';
import PacketTypeSelect from './PacketTypeSelect';
import AckPayloadBuilder from './AckPayloadBuilder';
import PingPayloadBuilder from './PingPayloadBuilder';
import SyncWordStats from './SyncWordStats';
import ConfigSection from './ConfigSection';
import TelemetryPayloadBuilder from './TelemetryPayloadBuilder';
import PhyIcon from './icons/PhyIcon';
import HeaderSectionIcon from './icons/HeaderSectionIcon';
import PayloadSectionIcon from './icons/PayloadSectionIcon';
import SecuritySectionIcon from './icons/SecuritySectionIcon';
import Tooltip from './Tooltip';
import Slider from './Slider';

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
    <label htmlFor={htmlFor} className="flex items-center space-x-2 text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">
        <span>{children}</span>
        <Tooltip content={tooltip}>
            <InfoIcon className="w-3.5 h-3.5 text-zinc-700 hover:text-zinc-400 transition-colors cursor-help" />
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

    const [isPayloadSectionExpanded, setIsPayloadSectionExpanded] = useState(config.type === PacketType.ACK || config.type === PacketType.PING);
    const [isTelemetrySectionExpanded, setIsTelemetrySectionExpanded] = useState(config.type === PacketType.ACK);


    useEffect(() => {
        if (config.type === PacketType.ACK) {
            setIsPayloadSectionExpanded(true);
            setIsTelemetrySectionExpanded(true);
            // If we just switched to ACK and there's no info, create it.
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
            setIsPayloadSectionExpanded(true);
            if (hopPath.length === 0) {
                setHopPath([generateRandomBytes(6), generateRandomBytes(6)]);
            }
        } else if (config.type === PacketType.TELEMETRY) {
            setIsPayloadSectionExpanded(true);
            if (!telemetryPacketInfo) {
                const telemetryInfo: TelemetryPacketInfo = {
                    tag: 'HERMES-NODE-00001',
                    uptime: 49380, // 12345s / 0.25s per tick
                    flags: {
                        hasBattery: true,
                        hasLocation: true,
                        hasHygrometer: false,
                        hasGasSensor: false,
                        hasLuxSensor: false,
                        hasUvSensor: false,
                        hasMovementSensor: false,
                        isCustomData: false,
                    },
                    batteryVoltage: 4180, // mV
                    batteryCurrent: -150, // mA
                    location: {
                        latitude: 34.0522,
                        longitude: -118.2437,
                        altitude: 71,
                        gpsWeek: 2300,
                        timeOfWeek: 345600,
                        speed: 15.5,
                        heading: 180.0,
                        satellites: 8,
                        precisionRadius: 5.2,
                    },
                    humidity: 0,
                    temperature: 0,
                    gasPpm: 0,
                    pressureHpa: 0,
                    lux: 0,
                    uvIndex: 0,
                    movement: 0,
                    customData: '',
                };
                setTelemetryPacketInfo(telemetryInfo);
            }
        } else {
            // Clear ACK info if we switch away from ACK type
            if (ackedPacketInfo !== null) {
                setAckedPacketInfo(null);
                setPayloadText("Hello Hermes!"); // Reset to default payload
            }
            if (telemetryPacketInfo !== null) {
                setTelemetryPacketInfo(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.type]);

    const handleFragmentIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const index = parseInt(e.target.value, 10);
        setConfig(prev => ({
            ...prev,
            fragmentIndex: index,
            lastFragment: index === 15 ? true : prev.lastFragment
        }));
    };

    const handleTogglePong = () => {
        setConfig(prev => ({
            ...prev,
            wantAck: !prev.wantAck,
            source: prev.destination,
            destination: prev.source,
        }));
    };

    const handleAddressingChange = (value: number) => {
        let updates: Partial<PacketHeaderConfig> = { addressing: value };
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

    const baseInputClasses = "block w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono shadow-inner";
    const checkboxClasses = "h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-offset-0 focus:ring-1 focus:ring-indigo-500 transition-all";

    const addressingOptions: CustomSelectOption[] = [
        { value: AddressingType.UNICAST, label: 'Unicast', icon: UserIcon },
        { value: AddressingType.MULTICAST, label: 'Multicast', icon: UsersIcon },
        { value: AddressingType.BROADCAST, label: 'Broadcast', icon: BroadcastIcon },
        { value: AddressingType.DISCOVER, label: 'Discover', icon: SearchIcon },
    ];

    const formatNonce = (nonce: Uint8Array): string => {
        const hex = bytesToHex(nonce).split(' ');
        if (hex.length !== 12) return bytesToHex(nonce);
        const part1 = hex.slice(0, 4).join(' ');
        const part2 = hex.slice(4, 8).join(' ');
        const part3 = hex.slice(8, 12).join(' ');
        return `${part1}  ${part2}  ${part3}`;
    };

    const isHovered = (start: number, end: number) => hoveredByte !== null && hoveredByte >= start && hoveredByte <= end;
    const highlightClass = 'ring-1 ring-blue-500/50 bg-blue-500/5';

    const isBroadcast = config.addressing === AddressingType.BROADCAST;
    const isDiscover = config.addressing === AddressingType.DISCOVER;
    const isDestinationLocked = isBroadcast || isDiscover;
    const isTtlLocked = isBroadcast;

    return (
        <div className="bg-transparent overflow-hidden">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xs font-bold text-zinc-100 flex items-center gap-2 uppercase tracking-[0.2em]">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>
                    Packet Setup
                </h2>
                <div className="h-px bg-zinc-800 flex-grow ml-4 opacity-50"></div>
            </div>

            <div className="p-4 pt-0">
                <ConfigSection title="Physical Layer" startExpanded={true} icon={<PhyIcon />}>
                    <div>
                        <Label htmlFor="sync-word" tooltip="The 4-byte Sync Word. Its MSB determines the Preamble pattern (0xAA or 0x55).">Sync Word (Hex)</Label>
                        <input
                            id="sync-word"
                            type="text"
                            value={isSyncWordEditing ? syncWordRaw : bytesToHex(syncWord)}
                            onFocus={() => {
                                setSyncWordRaw(bytesToHex(syncWord).replace(/\s/g, ''));
                                setIsSyncWordEditing(true);
                            }}
                            onBlur={() => setIsSyncWordEditing(false)}
                            onChange={(e) => {
                                const raw = e.target.value.toUpperCase();
                                setSyncWordRaw(raw);
                                const cleanHex = raw.replace(/\s/g, '');
                                if (/^[0-9A-F]*$/.test(cleanHex) && cleanHex.length <= 8) {
                                    setSyncWord(hexToBytes(cleanHex, 4));
                                }
                            }}
                            className={baseInputClasses} />
                    </div>
                    <div className="pt-2">
                        <SyncWordStats syncWord={syncWord} />
                    </div>
                    <div className="pt-2">
                        <AutocorrelationGraph syncWord={syncWord} />
                    </div>
                </ConfigSection>

                <ConfigSection title="Header" startExpanded={true} icon={<HeaderSectionIcon />}>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <Label htmlFor="packet-type" tooltip="Select a packet type preset or choose 'Other' for a custom type (5 bits, 0-31).">Packet Type</Label>
                            <PacketTypeSelect config={config} setConfig={setConfig} />
                        </div>
                        <div>
                            <Label htmlFor="addressing" tooltip="Addressing mode (2 bits): Unicast, Multicast, Broadcast, or Discover.">Addressing</Label>
                            <CustomSelect
                                options={addressingOptions}
                                value={config.addressing}
                                onChange={handleAddressingChange}
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <div>
                            <div className="flex justify-between mb-1">
                                <Label htmlFor="ttl" tooltip="Time To Live (3 bits, 0-7): Decremented on each mesh hop.">TTL</Label>
                                <span className="text-xs font-mono text-neutral-400">{config.ttl}</span>
                            </div>
                            <Slider
                                id="ttl"
                                min={0}
                                max={7}
                                value={config.ttl}
                                onChange={(e) => setConfig(prev => ({ ...prev, ttl: parseInt(e.target.value) }))}
                                className={`${isTtlLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={isTtlLocked}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <Label htmlFor="fragment-index" tooltip="Index for fragmented packets (4 bits, 0-15).">Fragment Index</Label>
                                <span className="text-xs font-mono text-neutral-400">{config.fragmentIndex}</span>
                            </div>
                            <Slider id="fragment-index" min={0} max={15} value={config.fragmentIndex} onChange={handleFragmentIndexChange} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 pb-1 border-t border-zinc-800/50 mt-4">
                        <div className="flex items-center space-x-3">
                            <input
                                id="want-ack"
                                type="checkbox"
                                checked={config.wantAck}
                                onChange={(e) => setConfig(prev => ({ ...prev, wantAck: e.target.checked }))}
                                disabled={isBroadcast}
                                className={`${checkboxClasses} ${isBroadcast ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                            <label htmlFor="want-ack" className={`text-xs font-semibold text-zinc-400 cursor-pointer select-none uppercase tracking-wider ${isBroadcast ? 'opacity-50 cursor-not-allowed' : ''}`}>Want ACK</label>
                        </div>
                        <div className="flex items-center space-x-3">
                            <input id="last-fragment" type="checkbox" checked={config.lastFragment} onChange={(e) => setConfig(prev => ({ ...prev, lastFragment: e.target.checked }))} disabled={config.fragmentIndex === 15} className={`${checkboxClasses} disabled:opacity-50`} />
                            <label htmlFor="last-fragment" className="text-xs font-semibold text-zinc-400 cursor-pointer select-none uppercase tracking-wider">Final</label>
                        </div>
                    </div>

                    <div className={`p-2 -m-2 rounded-lg transition-all ${isHovered(14, 19) ? highlightClass : ''}`}>
                        <AddressInput
                            label="Destination"
                            tooltip="6-byte destination node or subnet address."
                            value={config.destination}
                            onChange={(newValue) => setConfig(prev => ({ ...prev, destination: newValue }))}
                            disabled={isDestinationLocked}
                        />
                    </div>
                    <div className={`p-2 -m-2 rounded-lg transition-all ${isHovered(20, 25) ? highlightClass : ''}`}>
                        <AddressInput
                            label="Source"
                            tooltip="6-byte source node or subnet address (can be encrypted)."
                            value={config.source}
                            onChange={(newValue) => setConfig(prev => ({ ...prev, source: newValue }))}
                        />
                    </div>

                    <div className={`p-2 -m-2 rounded-lg transition-all ${isHovered(2, 13) ? highlightClass : ''}`}>
                        <Label htmlFor="nonce" tooltip="12-byte (96-bit) nonce for ChaCha20 encryption.">Nonce</Label>
                        <div className="flex items-center gap-2">
                            <div className="flex-grow font-mono text-xs text-neutral-500 break-all bg-black/50 p-2 rounded border border-neutral-800">
                                {formatNonce(config.nonce)}
                            </div>
                            <button onClick={() => setConfig(prev => ({ ...prev, nonce: generateRandomBytes(12) }))} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                            </button>
                        </div>
                    </div>
                </ConfigSection>

                <ConfigSection title="Payload" isExpanded={isPayloadSectionExpanded} onToggle={() => setIsPayloadSectionExpanded(p => !p)} icon={<PayloadSectionIcon />}>
                    {config.type === PacketType.ACK ? (
                        <AckPayloadBuilder
                            ackedPacketInfo={ackedPacketInfo}
                            setAckedPacketInfo={setAckedPacketInfo}
                            hoveredByte={hoveredByte}
                            isTelemetrySectionExpanded={isTelemetrySectionExpanded}
                            onToggleTelemetrySection={() => setIsTelemetrySectionExpanded(p => !p)}
                        />
                    ) : config.type === PacketType.PING ? (
                        <PingPayloadBuilder
                            hopPath={hopPath}
                            setHopPath={setHopPath}
                            isPong={!config.wantAck}
                            onTogglePong={handleTogglePong}
                            source={config.source}
                            destination={config.destination}
                        />
                    ) : config.type === PacketType.TELEMETRY ? (
                        <TelemetryPayloadBuilder
                            telemetryInfo={telemetryPacketInfo}
                            setTelemetryInfo={setTelemetryPacketInfo}
                        />
                    ) : (
                        <div className={`p-2 -m-2 rounded-lg transition-all ${isHovered(26, 79) ? highlightClass : ''}`}>
                            <Label htmlFor="payload-text" tooltip="Up to 54 bytes of application-specific data.">Payload Text</Label>
                            <textarea
                                id="payload-text"
                                value={payloadText}
                                onChange={(e) => setPayloadText(e.target.value)}
                                rows={4}
                                className={`${baseInputClasses} resize-none`}
                                maxLength={54}
                            ></textarea>
                            <p className="text-[10px] text-right text-neutral-500 mt-1 font-mono">{new TextEncoder().encode(payloadText).length}/54 bytes</p>
                        </div>
                    )}
                </ConfigSection>

                <ConfigSection title="Security" startExpanded={true} icon={<SecuritySectionIcon />}>
                    <div>
                        <Label htmlFor="shared-secret" tooltip="32-byte secret key for ChaCha20-Poly1305 AEAD.">Shared Secret (Hex)</Label>
                        <div className="mt-1 flex items-center space-x-2">
                            <input
                                id="shared-secret"
                                type="text"
                                value={isSecretEditing ? secretRaw : bytesToHex(sharedSecret)}
                                onFocus={() => {
                                    setSecretRaw(bytesToHex(sharedSecret).replace(/\s/g, ''));
                                    setIsSecretEditing(true);
                                }}
                                onBlur={() => setIsSecretEditing(false)}
                                onChange={(e) => {
                                    const raw = e.target.value.toUpperCase();
                                    setSecretRaw(raw);
                                    const cleanHex = raw.replace(/\s/g, '');
                                    if (/^[0-9A-F]*$/.test(cleanHex) && cleanHex.length <= 64) {
                                        setSharedSecret(hexToBytes(cleanHex, 32));
                                    }
                                }}
                                className={baseInputClasses} />
                            <button onClick={() => setSharedSecret(generateRandomBytes(32))} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                            </button>
                        </div>
                    </div>
                    <div className={`p-2 -m-2 rounded-lg transition-all ${isHovered(80, 95) ? highlightClass : ''}`}>
                        <Label htmlFor="signature" tooltip="16-byte Poly1305 Message Authentication Code (MAC).">Signature (Read-only)</Label>
                        <p className="font-mono text-xs p-2 bg-neutral-950 rounded border border-neutral-800 w-full text-neutral-400 mt-1 break-all">{bytesToHex(signature)}</p>
                    </div>
                </ConfigSection>
            </div>
        </div>
    );
};

export default PacketBuilder;