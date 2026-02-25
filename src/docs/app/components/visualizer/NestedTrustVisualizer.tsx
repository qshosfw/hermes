import React, { useState, useMemo } from 'react';
import { Shield, Lock, Radio, Zap, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { bytesToHex, generateRandomBytes, calculatePoly1305 } from './hermesProtocol';

const NestedTrustVisualizer: React.FC = () => {
    const [tamperOuter, setTamperOuter] = useState(false);
    const [tamperInner, setTamperInner] = useState(false);

    // Mock data for the demonstration
    const packetId = useMemo(() => generateRandomBytes(6), []);
    const destination = useMemo(() => generateRandomBytes(6), []);
    const source = useMemo(() => generateRandomBytes(6), []);
    const hopNonce = useMemo(() => generateRandomBytes(4), []);
    const payload = useMemo(() => generateRandomBytes(56), []);
    const trafficKey = useMemo(() => generateRandomBytes(32), []);
    const networkKey = useMemo(() => generateRandomBytes(32), []);

    // 1. Inner Layer Calculation
    const header = new Uint8Array(24);
    header.set(packetId, 2);
    header.set(destination, 8);
    header.set(source, 14);
    header.set(hopNonce, 20);

    const innerMac = useMemo(() => {
        const mac = calculatePoly1305(header, payload, trafficKey);
        return mac.slice(0, 8); // Truncated to 8 bytes
    }, [header, payload, trafficKey]);

    const modifiedPayload = useMemo(() => {
        if (!tamperInner) return payload;
        const tampered = new Uint8Array(payload);
        tampered[0] ^= 0xFF; // Flip some bits
        return tampered;
    }, [payload, tamperInner]);

    // 2. Outer Layer (Honey-Token Chain)
    const outerMac = useMemo(() => {
        // Outer IV uses Inner MAC + Hop Nonce
        const outerIv = new Uint8Array(12);
        outerIv.set(innerMac, 0);
        outerIv.set(hopNonce, 8);

        // Calculate Outer MAC
        const mac = calculatePoly1305(header, modifiedPayload, networkKey);
        return mac.slice(0, 8);
    }, [header, modifiedPayload, innerMac, hopNonce, networkKey]);

    const routerVerification = useMemo(() => {
        if (tamperOuter) return "FAIL";
        return "PASS";
    }, [tamperOuter]);

    const destinationVerification = useMemo(() => {
        if (tamperOuter) return "BLOCK"; // Router dropped it
        if (tamperInner) return "FAIL";
        return "PASS";
    }, [tamperOuter, tamperInner]);

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
            {/* Header / Title */}
            <div className="bg-neutral-800/50 px-6 py-4 border-b border-neutral-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-neutral-100">Nested Trust Verification</h3>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => { setTamperOuter(!tamperOuter); if (!tamperOuter) setTamperInner(false); }}
                        className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${tamperOuter ? 'bg-amber-600 text-white' : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'}`}
                    >
                        {tamperOuter ? 'Outer Tamper Active' : 'Tamper Outer MAC'}
                    </button>
                    <button
                        onClick={() => { setTamperInner(!tamperInner); if (!tamperInner) setTamperOuter(false); }}
                        className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${tamperInner ? 'bg-rose-600 text-white' : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'}`}
                    >
                        {tamperInner ? 'Inner Tamper Active' : 'Tamper Payload'}
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-8">
                {/* Visual Flow */}
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Transmitter */}
                    <div className="w-full md:w-1/4 p-4 bg-neutral-800/30 border border-neutral-700 rounded-lg flex flex-col items-center gap-2">
                        <Radio className="w-8 h-8 text-neutral-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Transmitter</span>
                        <div className="h-2 w-full bg-blue-500 rounded-full mt-2 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    </div>

                    <ArrowRight className="hidden md:block w-6 h-6 text-neutral-700" />

                    {/* Router */}
                    <div className={`w-full md:w-1/3 p-4 bg-neutral-800/30 border rounded-lg flex flex-col items-center gap-3 transition-all ${routerVerification === "PASS" ? 'border-emerald-900/50' : 'border-amber-900 bg-amber-950/20'
                        }`}>
                        <div className="flex items-center gap-2">
                            <Zap className={`w-6 h-6 ${routerVerification === "PASS" ? 'text-emerald-500' : 'text-amber-500'}`} />
                            <span className="text-xs font-bold uppercase tracking-widest text-neutral-300">Relay Router</span>
                        </div>

                        <div className="w-full space-y-2">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-neutral-500">
                                <span>Outer Auth</span>
                                <span className={routerVerification === "PASS" ? 'text-emerald-400' : 'text-amber-400'}>
                                    {routerVerification}
                                </span>
                            </div>
                            <div className="h-1 w-full bg-neutral-700 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${routerVerification === "PASS" ? 'w-full bg-emerald-500' : 'w-1/2 bg-amber-500'}`}></div>
                            </div>
                        </div>

                        {routerVerification === "PASS" ? (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verified by Network Key</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Shadow Tracker: DROP</span>
                            </div>
                        )}
                    </div>

                    <ArrowRight className="hidden md:block w-6 h-6 text-neutral-700" />

                    {/* Destination */}
                    <div className={`w-full md:w-1/3 p-4 bg-neutral-800/30 border rounded-lg flex flex-col items-center gap-3 transition-all ${destinationVerification === "PASS" ? 'border-emerald-900/50' :
                            destinationVerification === "BLOCK" ? 'border-neutral-800 opacity-40' : 'border-rose-900 bg-rose-950/20'
                        }`}>
                        <div className="flex items-center gap-2">
                            <Lock className={`w-6 h-6 ${destinationVerification === "PASS" ? 'text-blue-500' :
                                    destinationVerification === "BLOCK" ? 'text-neutral-600' : 'text-rose-500'
                                }`} />
                            <span className="text-xs font-bold uppercase tracking-widest text-neutral-300">Recipient Node</span>
                        </div>

                        <div className="w-full space-y-2">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-neutral-500">
                                <span>Inner MAC</span>
                                <span className={
                                    destinationVerification === "PASS" ? 'text-emerald-400' :
                                        destinationVerification === "BLOCK" ? 'text-neutral-600' : 'text-rose-400'
                                }>
                                    {destinationVerification === "BLOCK" ? "N/A" : destinationVerification}
                                </span>
                            </div>
                            <div className="h-1 w-full bg-neutral-700 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${destinationVerification === "PASS" ? 'w-full bg-emerald-500' :
                                        destinationVerification === "BLOCK" ? 'w-0' : 'w-1/2 bg-rose-500'
                                    }`}></div>
                            </div>
                        </div>

                        {destinationVerification === "PASS" ? (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Payload Integrity OK</span>
                            </div>
                        ) : destinationVerification === "BLOCK" ? (
                            <div className="text-[10px] text-neutral-600 italic">No packet received</div>
                        ) : (
                            <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1.5 text-xs text-rose-500 font-bold">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>GHOST ROUTER ALERT</span>
                                </div>
                                <span className="text-[9px] text-rose-400/70 uppercase">Router Compromise Detected</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Cryptographic Details Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Inner Cryptography */}
                    <div className="bg-neutral-950/50 p-4 rounded-lg border border-neutral-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Inner Layer (End-to-End)</h4>
                            <div className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-mono">Traffic Key: Scoped</div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-500">Payload Integrity:</span>
                                <span className="font-mono text-neutral-300">{bytesToHex(innerMac)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-500">Inner IV:</span>
                                <span className="font-mono text-neutral-300 tabular-nums">
                                    {bytesToHex(packetId.slice(0, 3))}...{bytesToHex(destination.slice(0, 3))}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Outer Cryptography (The Honey-Token) */}
                    <div className="bg-neutral-950/50 p-4 rounded-lg border border-neutral-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Outer Layer (Honey-Token Chain)</h4>
                            <div className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px] font-mono">Network Key: Base</div>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-500 italic">Outer IV Composition:</span>
                            </div>
                            <div className="flex justify-between items-center bg-purple-500/5 p-1.5 rounded border border-purple-500/10">
                                <div className="flex flex-col">
                                    <span className="text-[8px] uppercase text-purple-500/70">Inner MAC</span>
                                    <span className="font-mono text-neutral-300">{bytesToHex(innerMac)}</span>
                                </div>
                                <span className="text-neutral-600 font-bold px-2">+</span>
                                <div className="flex flex-col text-right">
                                    <span className="text-[8px] uppercase text-purple-500/70">Hop Nonce</span>
                                    <span className="font-mono text-neutral-300">{bytesToHex(hopNonce)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Explanation Context */}
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-xs text-neutral-400 leading-relaxed">
                        <span className="font-bold text-blue-400">Security insight:</span>
                        {tamperOuter ? (
                            "The router detected that the Outer MAC does not match the header and Network Key. This packet is dropped as garbage or an injection attempt, preventing network congestion from unauthenticated nodes."
                        ) : tamperInner ? (
                            "The router forwarded the packet because it correctly possesses the Network Key and the header is valid. However, the destination node detected that the application payload was modified. Because only a router could re-sign an authentic header but not re-calculate the Inner MAC, this confirms a specific routing node has been physically compromised."
                        ) : (
                            <>
                                The 8-byte <strong>Inner MAC</strong> is chained into the <strong>Outer IV</strong>. This "Honey-Token" ensures that if a router attempts to move a valid header to a different payload, the Outer MAC calculation fails.
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NestedTrustVisualizer;
