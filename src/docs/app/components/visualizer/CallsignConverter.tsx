import React, { useState, useEffect } from 'react';
import { callsignToBytes, bytesToCallsign, bytesToHex } from './hermesProtocol';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRightLeft, Radio, Hash } from 'lucide-react';

const CallsignConverter: React.FC = () => {
    const [callsign, setCallsign] = useState('AB1CD');
    const [address, setAddress] = useState<Uint8Array>(new Uint8Array(6));
    const [hex, setHex] = useState('');

    useEffect(() => {
        const bytes = callsignToBytes(callsign);
        setAddress(bytes);
        setHex(bytesToHex(bytes));
    }, [callsign]);

    const handleCallsignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-./]/g, '').slice(0, 9);
        setCallsign(val);
    };

    return (
        <Card className="border-neutral-800 bg-neutral-900/50 backdrop-blur-sm overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-neutral-800/50 bg-neutral-900/30 py-4">
                <CardTitle className="flex items-center text-sm font-bold tracking-widest text-blue-400 uppercase">
                    <Radio className="w-4 h-4 mr-2" /> M17 Callsign to Base40 Converter
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    {/* Left Side: Input */}
                    <div className="space-y-4">
                        <Label htmlFor="callsign-input" className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">
                            Source / Destination Ident
                        </Label>
                        <div className="relative group">
                            <Input
                                id="callsign-input"
                                value={callsign}
                                onChange={handleCallsignChange}
                                placeholder="E.g. K1ABC"
                                className="h-14 text-2xl font-mono bg-black border-neutral-800 focus-visible:ring-blue-500/50 transition-all text-center tracking-widest"
                            />
                            <div className="absolute inset-0 rounded-md bg-blue-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                        </div>
                        <p className="text-[10px] text-neutral-600 text-center italic">
                            Max 9 characters. Alphabet: A-Z, 0-9, -, ., /
                        </p>
                    </div>

                    {/* Right Side: Output */}
                    <div className="space-y-4 relative">
                        <div className="md:absolute md:-left-10 md:top-1/2 md:-translate-y-1/2 flex justify-center py-4 md:py-0">
                            <ArrowRightLeft className="w-6 h-6 text-neutral-700 md:rotate-0 rotate-90" />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">
                                    48-bit Address (Big Endian)
                                </Label>
                                <div className="h-14 flex items-center justify-center bg-black/40 border border-neutral-800 rounded-md font-mono text-xl text-emerald-400 tracking-wider shadow-inner">
                                    {hex || '00 00 00 00 00 00'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom: Math Breakdown Info (Small) */}
                <div className="pt-6 border-t border-neutral-800/50">
                    <Label className="text-[9px] uppercase tracking-wider text-neutral-600 font-bold block mb-4">
                        Backwards Horner Summation: Σ value[i] × 40ⁱ
                    </Label>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {callsign.split('').map((char, i) => {
                            const charSet = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/.";
                            const val = charSet.indexOf(char);
                            return (
                                <div key={i} className="flex flex-col items-center p-3 rounded-xl bg-black/40 border border-neutral-800/50 shadow-lg min-w-[70px]">
                                    <span className="text-lg font-mono text-white mb-1">
                                        {char === ' ' ? '␣' : char}
                                    </span>
                                    <span className="text-[9px] font-mono text-neutral-500 border-b border-neutral-800 pb-1 mb-1">
                                        idx {i}
                                    </span>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-[10px] font-mono text-blue-500">v: {val}</span>
                                        <span className="text-[8px] font-mono text-neutral-600">× 40^{i}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default CallsignConverter;
