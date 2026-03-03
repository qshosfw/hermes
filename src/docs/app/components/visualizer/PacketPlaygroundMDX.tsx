'use client';
import React, { useState, useMemo, useRef } from 'react';
import type { PacketHeaderConfig, AckedPacketInfo, TelemetryPacketInfo } from './types';
import { PacketType, AddressingType } from './types';
import PacketBuilder from './PacketBuilder';
import HexDump from './HexDump';
import * as Hermes from './hermesProtocol';
import { DEFAULT_SYNC_WORD } from './constants';
import { Download, Upload, Copy, FileCode2, Shuffle, Binary, Layers, Shield, Radio, Cpu, Lock } from 'lucide-react';

type LayerView = 'cleartext' | 'innerAead' | 'outerShroud' | 'whitened' | 'physical';

const LAYER_CONFIG: Record<LayerView, { label: string; icon: React.ComponentType<any>; color: string; desc: string }> = {
    cleartext: { label: 'Cleartext', icon: Layers, color: 'text-emerald-500', desc: 'Raw transport frame — header + payload + MAC' },
    innerAead: { label: 'Inner AEAD', icon: Lock, color: 'text-sky-500', desc: 'ChaCha20 encrypts payload region (bytes 24-79)' },
    outerShroud: { label: 'Outer Shroud', icon: Shield, color: 'text-purple-500', desc: 'Mesh keystream XOR obfuscation (hop nonce preserved)' },
    whitened: { label: 'PN15 Whitened', icon: Radio, color: 'text-amber-500', desc: 'LFSR spectral whitening for DC bias elimination' },
    physical: { label: 'PHY Frame', icon: Cpu, color: 'text-rose-500', desc: '128-byte physical frame: preamble + sync + data + FEC' },
};

function getHighlightsForLayer(layer: LayerView, packetType: number) {
    if (layer === 'physical') {
        return [
            { index: 0, length: 16, color: 'bg-zinc-600 text-white shadow-sm ring-1 ring-white/10', label: 'Preamble' },
            { index: 16, length: 4, color: 'bg-zinc-500 text-white shadow-sm ring-1 ring-white/10', label: 'Sync Word' },
            { index: 20, length: 24, color: 'bg-indigo-600/60 text-white shadow-sm ring-1 ring-white/10', label: 'Header' },
            { index: 44, length: 56, color: 'bg-emerald-600/60 text-white shadow-sm ring-1 ring-white/10', label: 'Payload' },
            { index: 100, length: 16, color: 'bg-purple-600/60 text-white shadow-sm ring-1 ring-white/10', label: 'Signature' },
            { index: 116, length: 12, color: 'bg-amber-700/80 text-white shadow-sm ring-1 ring-white/10', label: 'FEC Pad' },
        ];
    }

    if (layer === 'whitened' || layer === 'outerShroud') {
        return [
            { index: 0, length: 20, color: 'bg-indigo-600/40 text-white/80 shadow-sm ring-1 ring-white/10', label: 'Obfuscated Header' },
            { index: 20, length: 4, color: 'bg-amber-500 text-white shadow-sm ring-1 ring-white/10', label: 'Hop Nonce (Clear)' },
            { index: 24, length: 56, color: 'bg-emerald-600/40 text-white/80 shadow-sm ring-1 ring-white/10', label: 'Encrypted Payload' },
            { index: 80, length: 16, color: 'bg-purple-600/40 text-white/80 shadow-sm ring-1 ring-white/10', label: 'Obfuscated MAC' },
        ];
    }

    if (layer === 'innerAead') {
        return [
            { index: 0, length: 24, color: 'bg-indigo-600 text-white shadow-sm ring-1 ring-white/10', label: 'Header (Clear)' },
            { index: 24, length: 56, color: 'bg-sky-600 text-white shadow-sm ring-1 ring-white/10', label: 'ChaCha20 Encrypted' },
            { index: 80, length: 16, color: 'bg-purple-600 text-white shadow-sm ring-1 ring-white/10', label: 'Poly1305 MAC' },
        ];
    }

    // Cleartext — full detail
    const base = [
        { index: 0, length: 1, color: 'bg-indigo-700 text-white shadow-sm ring-1 ring-white/10', label: 'Type|TTL' },
        { index: 1, length: 1, color: 'bg-indigo-600 text-white shadow-sm ring-1 ring-white/10', label: 'Flags' },
        { index: 2, length: 6, color: 'bg-indigo-500 text-white shadow-sm ring-1 ring-white/10', label: 'Packet ID' },
        { index: 8, length: 6, color: 'bg-blue-600 text-white shadow-sm ring-1 ring-white/10', label: 'Destination' },
        { index: 14, length: 6, color: 'bg-blue-500 text-white shadow-sm ring-1 ring-white/10', label: 'Source' },
        { index: 20, length: 4, color: 'bg-amber-500 text-white shadow-sm ring-1 ring-white/10', label: 'Hop Nonce' },
        { index: 80, length: 16, color: 'bg-purple-600 text-white shadow-sm ring-1 ring-white/10', label: 'Poly1305 MAC' },
    ];

    let payloadHighlights: typeof base = [];
    if (packetType === PacketType.ACK) {
        payloadHighlights = [
            { index: 24, length: 6, color: 'bg-emerald-700 text-white shadow-sm ring-1 ring-white/10', label: 'ACKed PktID' },
            { index: 30, length: 8, color: 'bg-emerald-600 text-white shadow-sm ring-1 ring-white/10', label: 'ACKed MAC' },
            { index: 38, length: 1, color: 'bg-teal-600 text-white shadow-sm ring-1 ring-white/10', label: 'Bits' },
            { index: 39, length: 5, color: 'bg-green-600 text-white shadow-sm ring-1 ring-white/10', label: 'Health' },
            { index: 44, length: 17, color: 'bg-lime-600 text-white shadow-sm ring-1 ring-white/10', label: 'Location' },
            { index: 61, length: 19, color: 'bg-emerald-950 text-white shadow-sm ring-1 ring-white/10', label: 'Pad' },
        ];
    } else if (packetType === PacketType.PING) {
        payloadHighlights = Array.from({ length: 9 }).map((_, i) => ({
            index: 24 + (i * 6), length: 6,
            color: i % 2 === 0 ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-white/10' : 'bg-teal-600 text-white shadow-sm ring-1 ring-white/10',
            label: `Hop ${i + 1}`
        }));
    } else if (packetType === PacketType.TELEMETRY) {
        payloadHighlights = [
            { index: 24, length: 17, color: 'bg-emerald-700 text-white shadow-sm ring-1 ring-white/10', label: 'Tag' },
            { index: 41, length: 3, color: 'bg-teal-600 text-white shadow-sm ring-1 ring-white/10', label: 'Uptime' },
            { index: 44, length: 1, color: 'bg-green-600 text-white shadow-sm ring-1 ring-white/10', label: 'Flags' },
            { index: 45, length: 35, color: 'bg-emerald-600 text-white shadow-sm ring-1 ring-white/10', label: 'Blobs' },
        ];
    } else {
        payloadHighlights = [
            { index: 24, length: 56, color: 'bg-emerald-600 text-white shadow-sm ring-1 ring-white/10', label: 'Payload' },
        ];
    }

    return [...base, ...payloadHighlights].sort((a, b) => a.index - b.index);
}

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
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const [decodeInput, setDecodeInput] = useState('');
    const [decodeOpen, setDecodeOpen] = useState(false);
    const [activeLayer, setActiveLayer] = useState<LayerView>('cleartext');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Build the payload based on packet type
    const rawPayload = useMemo(() => {
        if (config.type === PacketType.ACK && ackedPacketInfo) {
            // ACK packets use buildAckPacket which handles its own payload
            return null;
        } else if (config.type === PacketType.TELEMETRY && telemetryPacketInfo) {
            return Hermes.buildTelemetryPayload(telemetryPacketInfo);
        } else if (config.type === PacketType.PING) {
            return Hermes.buildPayloadFromHopPath(hopPath);
        } else {
            return Hermes.textToBytes(payloadText, 56);
        }
    }, [config.type, payloadText, ackedPacketInfo, hopPath, telemetryPacketInfo]);

    // Full pipeline result
    const pipeline = useMemo(() => {
        if (config.type === PacketType.ACK && ackedPacketInfo) {
            // For ACK, build with the special ACK builder, then run pipeline stages manually
            const ackResult = Hermes.buildAckPacket(config, ackedPacketInfo, sharedSecret);
            // Use buildFullPipeline with the ACK payload already built
            const payload = ackResult.data.subarray(24, 80);
            return Hermes.buildFullPipeline(config, payload, sharedSecret, syncWord);
        }
        const payload = rawPayload || Hermes.textToBytes(payloadText, 56);
        return Hermes.buildFullPipeline(config, payload, sharedSecret, syncWord);
    }, [config, payloadText, sharedSecret, ackedPacketInfo, hopPath, telemetryPacketInfo, syncWord, rawPayload]);

    // Select which data to display in hex dump based on active layer
    const activeData = useMemo(() => {
        switch (activeLayer) {
            case 'cleartext': return pipeline.cleartext;
            case 'innerAead': return pipeline.innerAead;
            case 'outerShroud': return pipeline.outerShroud;
            case 'whitened': return pipeline.whitened;
            case 'physical': return pipeline.physicalFrame;
        }
    }, [activeLayer, pipeline]);

    const activeHighlights = useMemo(() => {
        return getHighlightsForLayer(activeLayer, config.type);
    }, [activeLayer, config.type]);

    // --- Actions ---
    const showCopyFeedback = (msg: string) => {
        setCopyFeedback(msg);
        setTimeout(() => setCopyFeedback(null), 2000);
    };

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
                showCopyFeedback('Configuration imported');
            } catch (err) {
                console.error("Failed to parse config", err);
                showCopyFeedback('Import failed — invalid JSON');
            }
        };
        reader.readAsText(file);
    };

    const handleCopyHex = () => {
        const hex = Hermes.bytesToHex(activeData);
        navigator.clipboard.writeText(hex.replace(/\s/g, ''));
        showCopyFeedback(`${activeData.length}B hex copied`);
    };

    const handleExportBin = () => {
        const blob = new Blob([new Uint8Array(pipeline.physicalFrame)], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hermes-phy-${Date.now()}.bin`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDecodeHex = () => {
        const clean = decodeInput.replace(/[\s\n\r,0x]/g, '');
        if (clean.length < 2 || !/^[0-9a-fA-F]+$/.test(clean)) {
            showCopyFeedback('Invalid hex input');
            return;
        }
        showCopyFeedback(`Decoded ${clean.length / 2} bytes`);
        setDecodeOpen(false);
    };

    const handleRandomize = () => {
        setConfig(prev => ({
            ...prev,
            packetId: Hermes.generateRandomBytes(6),
            hopNonce: Hermes.generateRandomBytes(4),
        }));
        setSharedSecret(Hermes.generateRandomBytes(32));
        showCopyFeedback('All IDs randomized');
    };

    return (
        <div className="flex flex-col gap-4 w-full max-w-none select-none">

            {/* ── Toolbar ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/50 border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Packet Builder</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                        {pipeline.physicalFrame.length}B PHY
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                        {pipeline.cleartext.length}B Transport
                    </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    <button onClick={handleRandomize} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors">
                        <Shuffle className="w-3 h-3" /> Randomize
                    </button>
                    <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
                    <label className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors cursor-pointer">
                        <Upload className="w-3 h-3" /> Import
                        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJson} />
                    </label>
                    <button onClick={handleExportJson} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors">
                        <Download className="w-3 h-3" /> JSON
                    </button>
                    <button onClick={handleExportBin} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors">
                        <Binary className="w-3 h-3" /> .bin (128B)
                    </button>
                    <button onClick={() => setDecodeOpen(!decodeOpen)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors">
                        <FileCode2 className="w-3 h-3" /> Decode
                    </button>
                </div>
            </div>

            {/* ── Decode Hex Panel ── */}
            {decodeOpen && (
                <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Paste Raw Hex to Decode</div>
                    <div className="flex gap-2">
                        <textarea
                            value={decodeInput}
                            onChange={(e) => setDecodeInput(e.target.value)}
                            placeholder="Paste hex bytes here, e.g. 2F2A11DB00FF..."
                            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none h-16"
                        />
                        <button onClick={handleDecodeHex} className="self-end px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                            Decode
                        </button>
                    </div>
                </div>
            )}

            {/* ── Toast ── */}
            {copyFeedback && (
                <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
                    {copyFeedback}
                </div>
            )}

            {/* ── Builder Panel ── */}
            <div className="bg-muted/20 border border-border rounded-xl relative w-full shadow-lg overflow-hidden">
                <PacketBuilder
                    config={config}
                    setConfig={setConfig}
                    payloadText={payloadText}
                    setPayloadText={setPayloadText}
                    sharedSecret={sharedSecret}
                    setSharedSecret={setSharedSecret}
                    signature={pipeline.signature}
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

            {/* ── Layer Selector ── */}
            <div className="bg-muted/20 border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/30 overflow-x-auto">
                    {(Object.entries(LAYER_CONFIG) as [LayerView, typeof LAYER_CONFIG[LayerView]][]).map(([key, cfg]) => {
                        const Icon = cfg.icon;
                        const isActive = activeLayer === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveLayer(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${isActive
                                        ? 'bg-background border border-border shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                            >
                                <Icon className={`w-3 h-3 ${isActive ? cfg.color : ''}`} />
                                {cfg.label}
                            </button>
                        );
                    })}
                </div>

                {/* Layer Description & Stats */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{LAYER_CONFIG[activeLayer].desc}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">{activeData.length} bytes</span>
                        <button onClick={handleCopyHex} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-600/20 transition-colors">
                            <Copy className="w-3 h-3" /> Copy Hex
                        </button>
                    </div>
                </div>

                {/* Hex Dump */}
                <div className="p-4">
                    <HexDump
                        data={activeData}
                        highlights={activeHighlights}
                        onByteHover={setHoveredByte}
                    />
                </div>
            </div>
        </div>
    );
}
