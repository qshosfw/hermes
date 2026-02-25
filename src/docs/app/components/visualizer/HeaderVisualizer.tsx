import React from 'react';
import type { PacketHeaderConfig } from './types';
import { PacketType, AddressingType } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';

interface BitField {
    name: string;
    value: string;
    bits: string;
    color: string;
}

const packetTypeMap: { [key: number]: string } = {};
Object.entries(PacketType).filter(([key]) => isNaN(Number(key))).forEach(([key, value]) => {
    packetTypeMap[value as number] = key;
});

const addressingTypeMap: { [key: number]: string } = {};
Object.entries(AddressingType).filter(([key]) => isNaN(Number(key))).forEach(([key, value]) => {
    addressingTypeMap[value as number] = key;
});

const Bit: React.FC<{ value: string; color: string; isFirst?: boolean }> = ({ value, color, isFirst }) => (
    <div className={`w-7 h-9 flex items-center justify-center font-mono text-sm rounded ${color} text-white font-bold shadow-sm ring-1 ring-black/20 ${isFirst ? 'ml-1.5' : ''}`}>
        {value}
    </div>
);

const ByteCell: React.FC<{ value: number; color?: string }> = ({ value, color }) => (
    <div className={`w-8 h-8 flex items-center justify-center font-mono text-sm rounded ${color ? `${color} text-white shadow-sm ring-1 ring-white/10 cursor-pointer hover:brightness-110 transition-all` : 'bg-neutral-800 text-neutral-300 border border-neutral-700'}`}>
        {value.toString(16).padStart(2, '0').toUpperCase()}
    </div>
);

const Section: React.FC<{ label: string; byteCount: number; children: React.ReactNode }> = ({ label, byteCount, children }) => (
    <Card className="bg-neutral-900/30 border-neutral-800 shadow-none h-full">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 pb-2 border-b border-neutral-800/50 mb-3">
            <CardTitle className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{label}</CardTitle>
            <Badge variant="secondary" className="font-mono text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400">
                {byteCount} {byteCount === 1 ? 'byte' : 'bytes'}
            </Badge>
        </CardHeader>
        <CardContent className="p-4 pt-0">
            {children}
        </CardContent>
    </Card>
);

const ControlBits: React.FC<{ config: PacketHeaderConfig }> = ({ config }) => {
    const fieldsByte0: BitField[] = [
        { name: 'Type', value: `${config.type} ${packetTypeMap[config.type] ? `(${packetTypeMap[config.type]})` : ''}`, bits: (config.type).toString(2).padStart(4, '0'), color: 'bg-blue-600' },
        { name: 'TTL', value: config.ttl.toString(), bits: (config.ttl).toString(2).padStart(4, '0'), color: 'bg-emerald-600' },
    ];

    const fieldsByte1: BitField[] = [
        { name: 'Addressing', value: `${config.addressing} (${addressingTypeMap[config.addressing]})`, bits: (config.addressing).toString(2).padStart(2, '0'), color: 'bg-amber-600' },
        { name: 'Want ACK', value: config.wantAck ? '1' : '0', bits: config.wantAck ? '1' : '0', color: 'bg-purple-600' },
        { name: 'Frag Idx', value: config.fragmentIndex.toString(), bits: (config.fragmentIndex).toString(2).padStart(4, '0'), color: 'bg-pink-600' },
        { name: 'Last Frag', value: config.lastFragment ? '1' : '0', bits: config.lastFragment ? '1' : '0', color: 'bg-rose-600' },
    ];

    const allFields = [...fieldsByte0, ...fieldsByte1];

    const renderByte = (fields: BitField[]) => {
        let bitGroups: React.ReactNode[] = [];
        fields.forEach((field, fieldIndex) => {
            const fieldBits = field.bits.split('').map((bit, bitIndex) => (
                <Bit key={`${field.name}-${bitIndex}`} value={bit} color={field.color} />
            ));

            bitGroups.push(
                <HoverCard key={field.name} openDelay={50} closeDelay={50}>
                    <HoverCardTrigger asChild>
                        <div className={`flex ${fieldIndex > 0 ? 'ml-1.5' : ''} cursor-help transition-transform hover:scale-105 hover:z-10`}>
                            {fieldBits}
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-auto min-w-[200px] z-[9999]" sideOffset={8}>
                        <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-sm ${field.color}`}></div>
                                <h4 className="text-sm font-semibold">{field.name}</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-sm">
                                <span className="text-neutral-500">Value:</span>
                                <span className="font-mono text-neutral-200">{field.value}</span>
                                <span className="text-neutral-500">Bits:</span>
                                <span className="font-mono text-neutral-200">{field.bits}</span>
                            </div>
                        </div>
                    </HoverCardContent>
                </HoverCard>
            );
        });
        return bitGroups;
    };

    const getByteValue = (fields: BitField[]) => {
        const binString = fields.map(f => f.bits).join('');
        return parseInt(binString, 2);
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Byte 0 */}
                <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-xs font-mono text-neutral-500 px-1">
                        <span>Byte 0</span>
                        <span>0x{getByteValue(fieldsByte0).toString(16).padStart(2, '0').toUpperCase()}</span>
                    </div>
                    <div className="flex justify-center items-center bg-black/40 p-3 rounded-lg border border-neutral-800">
                        {renderByte(fieldsByte0)}
                    </div>
                </div>
                {/* Byte 1 */}
                <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-xs font-mono text-neutral-500 px-1">
                        <span>Byte 1</span>
                        <span>0x{getByteValue(fieldsByte1).toString(16).padStart(2, '0').toUpperCase()}</span>
                    </div>
                    <div className="flex justify-center items-center bg-black/40 p-3 rounded-lg border border-neutral-800">
                        {renderByte(fieldsByte1)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {allFields.map(field => (
                    <div key={field.name} className="flex items-center space-x-2.5">
                        <div className={`w-3 h-3 rounded-sm ${field.color} flex-shrink-0 shadow-sm`}></div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-medium text-neutral-400 truncate">{field.name}</span>
                            <span className="font-mono text-neutral-200 truncate">{field.value}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HeaderVisualizer: React.FC<{ config: PacketHeaderConfig }> = ({ config }) => {
    return (
        <div className="bg-black/20 p-1 rounded-lg space-y-4">
            <Section label="Control Flags" byteCount={2}>
                <ControlBits config={config} />
            </Section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section label="Packet ID" byteCount={6}>
                    <div className="grid grid-cols-6 gap-2">
                        {Array.from(config.packetId).map((byte, i) => <ByteCell key={i} value={byte} color="bg-cyan-600" />)}
                    </div>
                </Section>
                <Section label="Destination" byteCount={6}>
                    <div className="grid grid-cols-6 gap-2">
                        {Array.from(config.destination).map((byte, i) => <ByteCell key={i} value={byte} color="bg-emerald-600" />)}
                    </div>
                </Section>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section label="Source" byteCount={6}>
                    <div className="grid grid-cols-6 gap-2">
                        {Array.from(config.source).map((byte, i) => <ByteCell key={i} value={byte} color="bg-amber-600" />)}
                    </div>
                </Section>
                <Section label="Hop Nonce" byteCount={4}>
                    <div className="grid grid-cols-4 gap-2">
                        {Array.from(config.hopNonce).map((byte, i) => <ByteCell key={i} value={byte} color="bg-purple-600" />)}
                    </div>
                </Section>
            </div>
        </div>
    );
};

export default HeaderVisualizer;