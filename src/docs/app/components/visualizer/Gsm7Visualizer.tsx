import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { textToGsm7Septets, packGsm7, bytesToHex } from './hermesProtocol';
import { Type, Box, Binary, ArrowDown } from 'lucide-react';

const Gsm7Visualizer: React.FC = () => {
    const [text, setText] = useState('HERMES-1');

    const septets = useMemo(() => textToGsm7Septets(text), [text]);
    const octets = useMemo(() => packGsm7(septets, Math.ceil(septets.length * 7 / 8)), [septets]);

    return (
        <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur-md shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-neutral-800/50 bg-neutral-900/20 py-4">
                <CardTitle className="flex items-center text-sm font-bold tracking-widest text-indigo-400 uppercase">
                    <Type className="w-4 h-4 mr-2" /> GSM-7 Septet Packing Explorer
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                <div className="space-y-4">
                    <Label className="text-[10px] uppercase font-bold text-neutral-500">Input Text</Label>
                    <Input
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, 16))}
                        className="bg-black border-neutral-800 text-lg font-mono tracking-wider"
                        placeholder="Enter text..."
                    />
                </div>

                <div className="space-y-6">
                    {/* Septets View */}
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-neutral-500">7-Bit Septets</Label>
                        <div className="flex flex-wrap gap-2">
                            {septets.map((s: number, i: number) => (
                                <div key={i} className="flex flex-col items-center p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg min-w-[50px]">
                                    <span className="text-xs font-bold text-indigo-300">'{text[i]}'</span>
                                    <span className="text-[10px] font-mono text-neutral-500">0x{s.toString(16).toUpperCase()}</span>
                                    <span className="text-[9px] font-mono text-blue-400 mt-1">{s.toString(2).padStart(7, '0')}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <ArrowDown className="w-6 h-6 text-neutral-700" />
                    </div>

                    {/* Octets View */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-[10px] uppercase font-bold text-neutral-500">Packed 8-Bit Octets</Label>
                            <span className="text-[10px] font-mono text-emerald-500">Efficiency: +14.28%</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                            {(Array.from(octets) as number[]).map((o: number, i: number) => (
                                <div key={i} className="flex flex-col items-center p-3 bg-neutral-950 border border-neutral-800 rounded-xl shadow-inner group transition-all hover:border-emerald-500/30">
                                    <span className="text-[10px] font-mono text-neutral-500 mb-1">Byte {i}</span>
                                    <span className="text-lg font-mono text-emerald-400">{o.toString(16).padStart(2, '0').toUpperCase()}</span>
                                    <div className="mt-2 text-[8px] font-mono text-neutral-700 group-hover:text-emerald-500/50 transition-colors">
                                        {o.toString(2).padStart(8, '0')}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 p-3 bg-black/40 rounded border border-neutral-800/50 font-mono text-xs text-center tracking-[0.2em] text-blue-300">
                            {bytesToHex(octets)}
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-neutral-800/50 flex items-start space-x-3">
                    <Box className="w-4 h-4 text-neutral-500 mt-1 flex-shrink-0" />
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                        Notice how the bits "slide". Septet 1 (index 1) has its lowest bit in Byte 0's MSB, and its remaining 6 bits in Byte 1's LSBs.
                        This dense packing allows <strong>8 characters to fit in only 7 bytes</strong>.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default Gsm7Visualizer;
