import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, RefreshCw, ChevronRight, Binary } from 'lucide-react';
import { bytesToHex, textToBytes } from './hermesProtocol';

const KdfVisualizer: React.FC = () => {
    const [passcode, setPasscode] = useState('HERMES-2026');
    const [salt, setSalt] = useState('HERMES-NETWORK-SALT-2026');
    const [iterations, setIterations] = useState(100);
    const [isCalculating, setIsCalculating] = useState(false);
    const [result, setResult] = useState('');

    useEffect(() => {
        simulateKdf();
    }, []);

    const simulateKdf = () => {
        setIsCalculating(true);
        // We simulate the complexity by using a timeout and a "deterministic-ish" hash for visual purposes
        setTimeout(() => {
            const combined = passcode + salt + iterations;
            let hash = 0;
            for (let i = 0; i < combined.length; i++) {
                hash = ((hash << 5) - hash) + combined.charCodeAt(i);
                hash |= 0;
            }
            // Generate a fake 32-byte hex string based on hash
            const fakeBytes = new Uint8Array(32);
            for (let i = 0; i < 32; i++) {
                fakeBytes[i] = (Math.abs(hash) + i * 13) % 256;
            }
            setResult(bytesToHex(fakeBytes));
            setIsCalculating(false);
        }, 600);
    };

    return (
        <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur-md shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-neutral-800/50 bg-neutral-900/20 py-4">
                <CardTitle className="flex items-center text-sm font-bold tracking-widest text-emerald-400 uppercase">
                    <ShieldCheck className="w-4 h-4 mr-2" /> Network Key Derivation (PRF)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-neutral-500">Network Passcode</Label>
                            <Input
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                className="bg-black border-neutral-800 text-sm font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-neutral-500">Global Network Salt</Label>
                            <Input
                                value={salt}
                                onChange={(e) => setSalt(e.target.value)}
                                className="bg-black border-neutral-800 text-sm font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-neutral-500">Iterations (N)</Label>
                            <Input
                                type="number"
                                value={iterations}
                                onChange={(e) => setIterations(parseInt(e.target.value) || 0)}
                                className="bg-black border-neutral-800 text-sm font-mono"
                            />
                        </div>
                        <Button
                            variant="outline"
                            className="w-full border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-widest text-[10px]"
                            onClick={simulateKdf}
                            disabled={isCalculating}
                        >
                            <RefreshCw className={`w-3 h-3 mr-2 ${isCalculating ? 'animate-spin' : ''}`} />
                            Derive Key
                        </Button>
                    </div>

                    <div className="md:col-span-2 flex flex-col justify-center space-y-6">
                        <div className="relative">
                            <div className="flex items-center space-x-4 mb-2">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Binary className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                                <div className="text-[10px] font-mono text-neutral-500">ChaCha20 PRF Rotation Layer</div>
                            </div>

                            <div className="p-4 bg-black/60 rounded-xl border border-neutral-800/80 min-h-[140px] flex flex-col items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-emerald-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="text-[10px] uppercase font-bold text-neutral-600 mb-3 tracking-widest">Target Network Key ($K\_net$)</div>
                                <div className={`font-mono text-xs text-center break-all transition-all duration-500 ${isCalculating ? 'opacity-30 blur-sm scale-95' : 'opacity-100 blur-0 scale-100 text-emerald-300'}`}>
                                    {result || 'DERIVING...'}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 bg-neutral-900/30 rounded border border-neutral-800/50 flex items-start space-x-3">
                                <Lock className="w-4 h-4 text-neutral-500 mt-1 flex-shrink-0" />
                                <div className="text-[10px] text-neutral-400 leading-relaxed">
                                    <strong className="text-neutral-200">Deterministic</strong>: Same inputs always yield the same key across all mesh nodes.
                                </div>
                            </div>
                            <div className="p-3 bg-neutral-900/30 rounded border border-neutral-800/50 flex items-start space-x-3">
                                <ShieldCheck className="w-4 h-4 text-neutral-500 mt-1 flex-shrink-0" />
                                <div className="text-[10px] text-neutral-400 leading-relaxed">
                                    <strong className="text-neutral-200">Salted</strong>: Protects against pre-computed rainbow table attacks on common passcodes.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default KdfVisualizer;
