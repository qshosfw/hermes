'use client';
import React, { useState, useMemo } from 'react';
import type { PacketHeaderConfig, AckedPacketInfo, TelemetryPacketInfo } from './types';
import { PacketType, AddressingType } from './types';
import PacketBuilder from './PacketBuilder';
import HexDump from './HexDump';
import * as Hermes from './hermesProtocol';
import { DEFAULT_SYNC_WORD } from './constants';

export default function PacketPlaygroundMDX() {
    const [payloadText, setPayloadText] = useState<string>("Hello Hermes!");
    const [hopPath, setHopPath] = useState<Uint8Array[]>([]);
    const [syncWord, setSyncWord] = useState<Uint8Array>(DEFAULT_SYNC_WORD);
    const [config, setConfig] = useState<PacketHeaderConfig>({
        type: PacketType.MESSAGE,
        addressing: AddressingType.UNICAST,
        ttl: 15,
        wantAck: true,
        fragmentIndex: 0,
        lastFragment: true,
        packetId: Hermes.generateRandomBytes(6),
        destination: Hermes.hexToBytes("C0FFEE123456", 6),
        source: Hermes.hexToBytes("BEEF42654321", 6),
        hopNonce: Hermes.generateRandomBytes(4),
    });
    const [sharedSecret, setSharedSecret] = useState<Uint8Array>(Hermes.generateRandomBytes(32));
    const [ackedPacketInfo, setAckedPacketInfo] = useState<AckedPacketInfo | null>(null);
    const [telemetryPacketInfo, setTelemetryPacketInfo] = useState<TelemetryPacketInfo | null>(null);
    const [hoveredByte, setHoveredByte] = useState<number | null>(null);

    const processingResult = useMemo(() => {
        let rawPacket;
        if (config.type === PacketType.ACK && ackedPacketInfo) {
            rawPacket = Hermes.buildAckPacket(config, ackedPacketInfo, sharedSecret);
        } else if (config.type === PacketType.TELEMETRY && telemetryPacketInfo) {
            const payload = Hermes.buildTelemetryPayload(telemetryPacketInfo);
            rawPacket = Hermes.buildRawPacket(config, payload, sharedSecret);
        } else {
            let payload: Uint8Array;
            if (config.type === PacketType.PING) {
                payload = Hermes.buildPayloadFromHopPath(hopPath);
            } else {
                payload = Hermes.textToBytes(payloadText, 56);
            }
            rawPacket = Hermes.buildRawPacket(config, payload, sharedSecret);
        }
        return { rawPacket };
    }, [config, payloadText, sharedSecret, ackedPacketInfo, hopPath, telemetryPacketInfo]);

    const rawPacketHighlights = useMemo(() => {
        const base = [
            { index: 0, length: 24, color: 'bg-indigo-600 text-white shadow-sm ring-1 ring-white/10', label: 'Header' },
            { index: 80, length: 16, color: 'bg-purple-600 text-white shadow-sm ring-1 ring-white/10', label: 'Signature' },
        ];

        let payloadHighlights = [];

        if (config.type === PacketType.ACK) {
            payloadHighlights = [
                { index: 24, length: 6, color: 'bg-emerald-700 text-white shadow-sm ring-1 ring-white/10', label: 'ACKed PktID' },
                { index: 30, length: 8, color: 'bg-emerald-600 text-white shadow-sm ring-1 ring-white/10', label: 'ACKed MAC' },
                { index: 38, length: 1, color: 'bg-teal-600 text-white shadow-sm ring-1 ring-white/10', label: 'Bits' },
                { index: 39, length: 5, color: 'bg-green-600 text-white shadow-sm ring-1 ring-white/10', label: 'Health' },
                { index: 44, length: 17, color: 'bg-lime-600 text-white shadow-sm ring-1 ring-white/10', label: 'Location' },
                { index: 61, length: 19, color: 'bg-emerald-950 text-white shadow-sm ring-1 ring-white/10', label: 'Pad' },
            ];
        } else if (config.type === PacketType.PING) {
            payloadHighlights = Array.from({ length: 9 }).map((_, i) => ({
                index: 24 + (i * 6),
                length: 6,
                color: i % 2 === 0 ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-white/10' : 'bg-teal-600 text-white shadow-sm ring-1 ring-white/10',
                label: `Hop ${i + 1}`
            }));
        } else if (config.type === PacketType.TELEMETRY) {
            payloadHighlights = [
                { index: 24, length: 17, color: 'bg-emerald-700 text-white shadow-sm ring-1 ring-white/10', label: 'Tag' },
                { index: 41, length: 3, color: 'bg-teal-600 text-white shadow-sm ring-1 ring-white/10', label: 'Uptime' },
                { index: 44, length: 1, color: 'bg-green-600 text-white shadow-sm ring-1 ring-white/10', label: 'Flags' },
                { index: 45, length: 35, color: 'bg-emerald-600 text-white shadow-sm ring-1 ring-white/10', label: 'Blobs' },
            ];
        } else {
            payloadHighlights = [
                { index: 24, length: 56, color: 'bg-emerald-600 text-white shadow-sm ring-1 ring-white/10', label: 'Generic Payload' },
            ];
        }

        return [...base, ...payloadHighlights].sort((a, b) => a.index - b.index);
    }, [config.type]);

    const handleExportJson = () => {
        const exportData = {
            config: {
                ...config,
                packetId: Array.from(config.packetId),
                destination: Array.from(config.destination),
                source: Array.from(config.source),
                hopNonce: Array.from(config.hopNonce),
            },
            sharedSecret: Array.from(sharedSecret),
            payloadText,
            syncWord: Array.from(syncWord),
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hermes-packet-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (data.config) {
                    setConfig({
                        ...data.config,
                        packetId: new Uint8Array(data.config.packetId),
                        destination: new Uint8Array(data.config.destination),
                        source: new Uint8Array(data.config.source),
                        hopNonce: new Uint8Array(data.config.hopNonce),
                    });
                }
                if (data.sharedSecret) setSharedSecret(new Uint8Array(data.sharedSecret));
                if (data.payloadText) setPayloadText(data.payloadText);
                if (data.syncWord) setSyncWord(new Uint8Array(data.syncWord));
            } catch (err) {
                console.error("Failed to parse config", err);
            }
        };
        reader.readAsText(file);
    };

    const handleExportHex = () => {
        const hex = Hermes.bytesToHex(processingResult.rawPacket.data);
        navigator.clipboard.writeText(hex.replace(/\s/g, ''));
        alert("Hex payload copied to clipboard!");
    };

    return (
        <div className="my-8 flex flex-col gap-6 w-full max-w-none">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl pt-4 pb-6 px-6 relative w-full shadow-xl">

                {/* Header Action Bar */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-800">
                    <h2 className="text-xl font-bold font-serif uppercase tracking-widest text-neutral-200">Interactive Packet Builder</h2>
                    <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white uppercase px-3 py-1.5 rounded transition-colors border border-neutral-700">
                            Import JSON
                            <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
                        </label>
                        <button onClick={handleExportJson} className="bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white uppercase px-3 py-1.5 rounded transition-colors border border-neutral-700">
                            Save JSON
                        </button>
                    </div>
                </div>

                <PacketBuilder
                    config={config}
                    setConfig={setConfig}
                    payloadText={payloadText}
                    setPayloadText={setPayloadText}
                    sharedSecret={sharedSecret}
                    setSharedSecret={setSharedSecret}
                    signature={processingResult.rawPacket.signature}
                    syncWord={syncWord}
                    setSyncWord={setSyncWord}
                    hoveredByte={hoveredByte}
                    ackedPacketInfo={ackedPacketInfo}
                    setAckedPacketInfo={setAckedPacketInfo}
                    telemetryPacketInfo={telemetryPacketInfo}
                    setTelemetryPacketInfo={setTelemetryPacketInfo}
                    hopPath={hopPath}
                    setHopPath={setHopPath}
                />
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden p-4">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Generated Ciphertext Output
                    </h3>
                    <button onClick={handleExportHex} className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded transition-colors">
                        Copy Complete Hex
                    </button>
                </div>
                <HexDump
                    data={processingResult.rawPacket.data}
                    highlights={rawPacketHighlights}
                    onByteHover={setHoveredByte}
                />
            </div>
        </div>
    );
}
