import React from 'react';

export const ProtocolStackHero = () => {
    const layers = [
        { name: 'Application', details: 'Message, Telemetry, Discovery payloads', l: '7' },
        { name: 'Transport', details: '24-byte Header, 48-bit Packet ID, Addressing', l: '4' },
        { name: 'Security', details: 'ChaCha20-Poly1305 AEAD Integrity', l: '3' },
        { name: 'Data Link', details: 'RS(128,96) FEC, PN15 Whitening', l: '2' },
        { name: 'Physical', details: 'FSK 1200bps, BK4819 Front-end', l: '1' },
    ];

    return (
        <div className="w-full max-w-sm mx-auto py-8 font-sans">
            <div className="grid grid-cols-1 gap-1">
                {layers.map((layer, i) => (
                    <div
                        key={i}
                        className="relative group flex items-stretch border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors rounded-sm overflow-hidden"
                    >
                        <div className="w-12 bg-muted/60 border-r flex items-center justify-center text-[10px] font-mono opacity-60">
                            L{layer.l}
                        </div>
                        <div className="flex-1 px-4 py-3">
                            <div className="text-xs font-semibold tracking-tight uppercase text-primary/90">{layer.name}</div>
                            <div className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">{layer.details}</div>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};

export const PacketStructureVisual = () => {
    return (
        <div className="w-full bg-card border rounded-lg p-6 shadow-sm font-sans">
            <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Physical Frame Structure
                </h4>
                <div className="text-[10px] font-mono opacity-50 text-right">
                    Total: 1024 Bits / 128 Bytes
                </div>
            </div>

            <div className="space-y-4">
                {/* Frame Segments */}
                <div className="flex h-10 w-full border border-border/80 rounded-sm overflow-hidden text-[9px] font-mono leading-none">
                    <div className="w-[15%] bg-blue-500/10 border-r border-border/40 flex flex-col items-center justify-center gap-1">
                        <span className="opacity-60 italic">Preamble</span>
                        <span className="font-bold">48b</span>
                    </div>
                    <div className="w-[10%] bg-indigo-500/10 border-r border-border/40 flex flex-col items-center justify-center gap-1 text-center">
                        <span className="opacity-60 italic">Sync</span>
                        <span className="font-bold">32b</span>
                    </div>
                    <div className="w-[20%] bg-primary/5 border-r border-border/40 flex flex-col items-center justify-center gap-1 text-center">
                        <span className="opacity-60 italic">Header</span>
                        <span className="font-bold">208b</span>
                    </div>
                    <div className="w-[40%] bg-muted/30 border-r border-border/40 flex flex-col items-center justify-center gap-1 text-center">
                        <span className="opacity-60 italic">Encrypted Payload</span>
                        <span className="font-bold">432b</span>
                    </div>
                    <div className="w-[15%] bg-rose-500/10 flex flex-col items-center justify-center gap-1 text-center">
                        <span className="opacity-60 italic">RS-Parity</span>
                        <span className="font-bold">256b</span>
                    </div>
                </div>

                {/* Subtext info */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-tighter opacity-80">Spectral Integrity</div>
                        <div className="text-[10px] text-muted-foreground leading-relaxed">
                            FSK 1200bps @ 2.2kHz Shift. PN15 Scrambling ensures DC neutrality across long packets.
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-tighter opacity-80">Robustness Factors</div>
                        <div className="text-[10px] text-muted-foreground leading-relaxed">
                            RS(128,96) FEC provides autonomous recovery of up to 16 symbols / 12% frame corruption.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
