import React from 'react';
import { PacketHeaderConfig, AddressingType, PacketType } from '../types';

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

const Bit: React.FC<{ value: string; color: string; isFirst: boolean }> = ({ value, color, isFirst }) => (
  <div className={`w-7 h-9 flex items-center justify-center font-mono text-sm rounded ${color} text-white font-bold shadow-sm ring-1 ring-black/20 ${isFirst ? 'ml-1.5' : ''}`}>
    {value}
  </div>
);

const ByteCell: React.FC<{ value: number; color?: string }> = ({ value, color }) => (
    <div className={`w-8 h-8 flex items-center justify-center font-mono text-sm rounded ${color ? `${color} text-white shadow-sm ring-1 ring-white/10` : 'bg-neutral-800 text-neutral-300 border border-neutral-700'}`}>
        {value.toString(16).padStart(2, '0').toUpperCase()}
    </div>
);

const Section: React.FC<{ label: string; byteCount: number; children: React.ReactNode }> = ({ label, byteCount, children }) => (
    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-800/50">
            <h4 className="font-semibold text-xs text-neutral-400 uppercase tracking-wider">{label}</h4>
            <span className="text-[10px] font-mono text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">{byteCount} {byteCount === 1 ? 'byte' : 'bytes'}</span>
        </div>
        {children}
    </div>
);


const ControlBits: React.FC<{ config: PacketHeaderConfig }> = ({ config }) => {
  const fieldsByte0: BitField[] = [
    { name: 'Type', value: `${config.type} ${packetTypeMap[config.type] ? `(${packetTypeMap[config.type]})` : ''}`, bits: (config.type).toString(2).padStart(5, '0'), color: 'bg-blue-600' },
    { name: 'TTL', value: config.ttl.toString(), bits: (config.ttl).toString(2).padStart(3, '0'), color: 'bg-emerald-600' },
  ];

  const fieldsByte1: BitField[] = [
    { name: 'Addressing', value: `${config.addressing} (${addressingTypeMap[config.addressing]})`, bits: (config.addressing).toString(2).padStart(2, '0'), color: 'bg-amber-600' },
    { name: 'Want ACK', value: config.wantAck ? '1' : '0', bits: config.wantAck ? '1' : '0', color: 'bg-purple-600' },
    { name: 'Frag Idx', value: config.fragmentIndex.toString(), bits: (config.fragmentIndex).toString(2).padStart(4, '0'), color: 'bg-pink-600' },
    { name: 'Last Frag', value: config.lastFragment ? '1' : '0', bits: config.lastFragment ? '1' : '0', color: 'bg-rose-600' },
  ];
  
  const allFields = [...fieldsByte0, ...fieldsByte1];

  const renderByte = (fields: BitField[]) => {
    let bits: React.ReactNode[] = [];
    fields.forEach((field, fieldIndex) => {
        field.bits.split('').forEach((bit, bitIndex) => {
            bits.push(<Bit key={`${field.name}-${bitIndex}`} value={bit} color={field.color} isFirst={bitIndex === 0 && fieldIndex > 0} />);
        });
    });
    return bits;
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
        
        <Section label="Nonce" byteCount={12}>
            <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                {Array.from(config.nonce).map((byte, i) => <ByteCell key={i} value={byte} color="bg-cyan-600" />)}
            </div>
        </Section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section label="Destination" byteCount={6}>
                <div className="grid grid-cols-6 gap-2">
                    {Array.from(config.destination).map((byte, i) => <ByteCell key={i} value={byte} color="bg-emerald-600" />)}
                </div>
            </Section>
            <Section label="Source" byteCount={6}>
                <div className="grid grid-cols-6 gap-2">
                    {Array.from(config.source).map((byte, i) => <ByteCell key={i} value={byte} color="bg-amber-600" />)}
                </div>
            </Section>
        </div>
    </div>
  );
};

export default HeaderVisualizer;