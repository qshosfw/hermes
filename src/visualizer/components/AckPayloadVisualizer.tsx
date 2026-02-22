import React, { useMemo } from 'react';
import { AckedPacketInfo, AckStatus } from '../types';

interface BitField {
  name: string;
  value: string;
  bits: string;
  color: string;
}

const ackStatusMap: { [key in AckStatus]: string } = {
    [AckStatus.ACK_OK]: "OK",
    [AckStatus.ACK_CORRECTED]: "Corrected",
    [AckStatus.NACK_NORETRY]: "NACK NoRetry",
    [AckStatus.NACK_RETRY]: "NACK Retry",
};

const txPowerMap = [
    0.00, 0.13, 0.18, 0.26, 0.38, 0.56, 0.82, 1.21,
    1.79, 2.64, 3.89, 5.73, 8.44, 10.71, 12.00, 12.00
];
const valueToTxPower = (v: number): number => txPowerMap[v] ?? 0.0;

const Bit: React.FC<{ value: string; color: string; isFirst?: boolean }> = ({ value, color, isFirst }) => (
  <div className={`w-6 h-8 flex items-center justify-center font-mono text-sm rounded ${color} text-white font-bold shadow-sm ring-1 ring-black/20 ${isFirst ? 'ml-1.5' : ''}`}>
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

const ControlBits: React.FC<{ ackedInfo: AckedPacketInfo }> = ({ ackedInfo }) => {
    const fields: BitField[] = [
        { name: 'ACKed Frag Idx', value: ackedInfo.fragmentIndex.toString(), bits: ackedInfo.fragmentIndex.toString(2).padStart(4, '0'), color: 'bg-purple-600' },
        { name: 'ACKed Last Frag', value: ackedInfo.lastFragment ? '1' : '0', bits: ackedInfo.lastFragment ? '1' : '0', color: 'bg-pink-600' },
        { name: 'Status', value: `${ackedInfo.status} (${ackStatusMap[ackedInfo.status]})`, bits: ackedInfo.status.toString(2).padStart(2, '0'), color: 'bg-yellow-600' },
        { name: 'Telemetry Blob', value: ackedInfo.telemetryBit ? '1' : '0', bits: ackedInfo.telemetryBit ? '1' : '0', color: 'bg-green-600' },
    ];

    const byteValue = parseInt(fields.map(f => f.bits).join(''), 2);

    return (
        <div className="space-y-4">
            <div className="flex flex-col space-y-2">
                <div className="flex justify-between text-xs font-mono text-neutral-500 px-1">
                    <span>Byte 28</span>
                    <span>0x{byteValue.toString(16).padStart(2, '0').toUpperCase()}</span>
                </div>
                <div className="flex justify-center items-center bg-black/40 p-3 rounded-lg border border-neutral-800">
                    {fields.map((field, fieldIndex) => (
                         field.bits.split('').map((bit, bitIndex) => (
                            <Bit key={`${field.name}-${bitIndex}`} value={bit} color={field.color} isFirst={bitIndex === 0 && fieldIndex > 0} />
                        ))
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {fields.map(field => (
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

const HealthBlobVisualizer: React.FC<{ ackedInfo: AckedPacketInfo }> = ({ ackedInfo }) => {
    const toRssiVal = (rssi: number): number => {
        if (rssi >= 7) return 127; // UNKNOWN
        return Math.min(Math.max(rssi + 120, 0), 126);
    };
    
    const ackedRssiVal = toRssiVal(ackedInfo.ackedRssi);
    const ackingRssiVal = toRssiVal(ackedInfo.ackingRssi);
    const idleRssiVal = toRssiVal(ackedInfo.idleRssi);

    const byte29 = (ackedInfo.hasBattery ? 0x80 : 0) | (ackedInfo.batteryVoltage & 0x7F);
    const byte30 = (ackedRssiVal << 1) | ((ackingRssiVal >> 6) & 0x01);
    const byte31 = ((ackingRssiVal & 0x3F) << 2) | ((idleRssiVal >> 5) & 0x03);
    const byte32 = ((idleRssiVal & 0x1F) << 3) | ((ackedInfo.prevLqi >> 4) & 0x07);
    const byte33 = ((ackedInfo.prevLqi & 0x0F) << 4) | (ackedInfo.txPowerLevel & 0x0F);

    const allBitsString = [byte29, byte30, byte31, byte32, byte33].map(b => b.toString(2).padStart(8, '0')).join('');
    
    const fields = [
        { name: 'Has Battery', value: ackedInfo.hasBattery ? 'Yes' : 'No', color: 'bg-lime-600' },
        { name: 'Battery', value: `${(ackedInfo.batteryVoltage / 10).toFixed(1)}V`, color: 'bg-cyan-600' },
        { name: 'ACKed RSSI', value: ackedInfo.ackedRssi >= 7 ? "Unk" : `${ackedInfo.ackedRssi}dBm`, color: 'bg-red-600' },
        { name: 'ACKing RSSI', value: ackedInfo.ackingRssi >= 7 ? "Unk" : `${ackedInfo.ackingRssi}dBm`, color: 'bg-orange-600' },
        { name: 'Idle RSSI', value: ackedInfo.idleRssi >= 7 ? "Unk" : `${ackedInfo.idleRssi}dBm`, color: 'bg-amber-600' },
        { name: 'Prev LQI', value: ackedInfo.prevLqi.toString(), color: 'bg-teal-600' },
        { name: 'TX Power', value: `${valueToTxPower(ackedInfo.txPowerLevel).toFixed(2)}W`, color: 'bg-fuchsia-600' },
    ];

    const bitFieldDefinitions = [
        { bits: allBitsString.substring(0, 1), color: 'bg-lime-600' },
        { bits: allBitsString.substring(1, 8), color: 'bg-cyan-600' },
        { bits: allBitsString.substring(8, 15), color: 'bg-red-600' },
        { bits: allBitsString.substring(15, 22), color: 'bg-orange-600' },
        { bits: allBitsString.substring(22, 29), color: 'bg-amber-600' },
        { bits: allBitsString.substring(29, 36), color: 'bg-teal-600' },
        { bits: allBitsString.substring(36, 40), color: 'bg-fuchsia-600' },
    ];

    return (
        <div className="space-y-4">
             <div className="flex flex-col space-y-2">
                <div className="font-mono text-xs text-neutral-500 text-center">Bytes 29-33</div>
                <div className="flex flex-wrap justify-center items-center gap-y-1 bg-black/40 p-3 rounded-lg border border-neutral-800">
                    {bitFieldDefinitions.flatMap((field, fieldIndex) =>
                        field.bits.split('').map((bit, bitIndex) => (
                            <Bit
                                key={`${fieldIndex}-${bitIndex}`}
                                value={bit}
                                color={field.color}
                                isFirst={bitIndex === 0 && fieldIndex > 0}
                            />
                        ))
                    )}
                </div>
            </div>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {fields.map(field => (
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
    )
};

const LocationBlobVisualizer: React.FC<{ ackedInfo: AckedPacketInfo }> = ({ ackedInfo }) => {
    const { allBitsString, fields } = useMemo(() => {
        const qlat = BigInt(Math.round((ackedInfo.latitude + 90) / 180 * (Math.pow(2, 24) - 1)));
        const qlon = BigInt(Math.round((ackedInfo.longitude + 180) / 360 * (Math.pow(2, 24) - 1)));
        const qalt = BigInt(Math.round((ackedInfo.altitude + 1000) / 0.1));
        const qweek = BigInt(ackedInfo.gpsWeek & 0x3FF);
        const qtow = BigInt(ackedInfo.timeOfWeek);
        const qspeed = BigInt(Math.min(4095, Math.round(ackedInfo.speed * 100)));
        const qhead = BigInt(Math.round((ackedInfo.heading % 360) / 360 * 4095));
        const qsats = BigInt(Math.min(63, ackedInfo.satellites));
        const qprec = BigInt(Math.min(255, Math.round(ackedInfo.precisionRadius * 10)));

        let packed = 0n;
        packed = (packed << 24n) | qlat;
        packed = (packed << 24n) | qlon;
        packed = (packed << 20n) | qalt;
        packed = (packed << 10n) | qweek;
        packed = (packed << 20n) | qtow;
        packed = (packed << 12n) | qspeed;
        packed = (packed << 12n) | qhead;
        packed = (packed << 6n) | qsats;
        packed = (packed << 8n) | qprec;

        const allBitsString = packed.toString(2).padStart(136, '0');

        const fields = [
            { name: 'Latitude', value: `${ackedInfo.latitude.toFixed(5)}°` },
            { name: 'Longitude', value: `${ackedInfo.longitude.toFixed(5)}°` },
            { name: 'Altitude', value: `${ackedInfo.altitude.toFixed(1)} m` },
            { name: 'GPS Week', value: ackedInfo.gpsWeek },
            { name: 'Time of Week', value: `${ackedInfo.timeOfWeek} s` },
            { name: 'Speed', value: `${ackedInfo.speed.toFixed(2)} m/s` },
            { name: 'Heading', value: `${ackedInfo.heading.toFixed(1)}°` },
            { name: 'Satellites', value: ackedInfo.satellites },
            { name: 'Precision', value: `${ackedInfo.precisionRadius.toFixed(1)} m` },
        ];
        
        return { allBitsString, fields };
    }, [ackedInfo]);
    
    const bitFieldDefinitions = useMemo(() => [
        { name: 'Latitude', bits: allBitsString.substring(0, 24), color: 'bg-red-600' },
        { name: 'Longitude', bits: allBitsString.substring(24, 48), color: 'bg-orange-600' },
        { name: 'Altitude', bits: allBitsString.substring(48, 68), color: 'bg-amber-600' },
        { name: 'GPS Week', bits: allBitsString.substring(68, 78), color: 'bg-yellow-600' },
        { name: 'Time of Week', bits: allBitsString.substring(78, 98), color: 'bg-lime-600' },
        { name: 'Speed', bits: allBitsString.substring(98, 110), color: 'bg-green-600' },
        { name: 'Heading', bits: allBitsString.substring(110, 122), color: 'bg-emerald-600' },
        { name: 'Satellites', bits: allBitsString.substring(122, 128), color: 'bg-teal-600' },
        { name: 'Precision', bits: allBitsString.substring(128, 136), color: 'bg-cyan-600' },
    ], [allBitsString]);


    return (
        <div className="space-y-4">
             <div className="flex flex-col space-y-2">
                <div className="font-mono text-xs text-neutral-500 text-center">Bytes 34-50 (136 bits)</div>
                 <div className="flex flex-wrap justify-center items-center gap-y-1 bg-black/40 p-3 rounded-lg border border-neutral-800">
                    {bitFieldDefinitions.flatMap((field, fieldIndex) =>
                        field.bits.split('').map((bit, bitIndex) => (
                            <Bit
                                key={`${field.name}-${bitIndex}`}
                                value={bit}
                                color={field.color}
                                isFirst={bitIndex === 0 && fieldIndex > 0}
                            />
                        ))
                    )}
                </div>
            </div>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {fields.map((field, i) => (
                    <div key={field.name} className="flex items-center space-x-2.5">
                         <div className={`w-3 h-3 rounded-sm ${bitFieldDefinitions[i].color} flex-shrink-0 shadow-sm`}></div>
                         <div className="flex flex-col overflow-hidden">
                            <span className="font-medium text-neutral-400 truncate">{field.name}</span>
                            <span className="font-mono text-neutral-200 truncate">{String(field.value)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const AckPayloadVisualizer: React.FC<{ ackedInfo: AckedPacketInfo }> = ({ ackedInfo }) => {
  return (
    <div className="bg-black/20 p-1 rounded-lg space-y-4">
        <Section label="Acknowledged Nonce" byteCount={12}>
            <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                {Array.from(ackedInfo.nonce).map((byte, i) => <ByteCell key={i} value={byte} color="bg-cyan-600" />)}
            </div>
        </Section>
        
        <Section label="Acknowledged Signature" byteCount={16}>
             <div className="grid grid-cols-8 md:grid-cols-16 gap-2">
                {Array.from(ackedInfo.signature).map((byte, i) => <ByteCell key={i} value={byte} color="bg-purple-600" />)}
            </div>
        </Section>
        
        <Section label="Control" byteCount={1}>
            <ControlBits ackedInfo={ackedInfo} />
        </Section>

        {ackedInfo.telemetryBit && (
            <div className="animate-fade-in space-y-4">
                <Section label="Health" byteCount={5}>
                    <HealthBlobVisualizer ackedInfo={ackedInfo} />
                </Section>
                <Section label="Location" byteCount={17}>
                    <LocationBlobVisualizer ackedInfo={ackedInfo} />
                </Section>
            </div>
        )}

        <Section label="Reserved" byteCount={ackedInfo.telemetryBit ? 3 : 25}>
            <p className="text-xs text-neutral-500 pt-2 text-center">These bytes are reserved for future use.</p>
        </Section>
    </div>
  );
};

export default AckPayloadVisualizer;