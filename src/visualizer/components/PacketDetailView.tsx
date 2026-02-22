import React from 'react';
import { bytesToHex } from '../services/hermesProtocol';
import XIcon from './icons/XIcon';

interface PacketDetailViewProps {
    section: string;
    packetData: any; // Can be a Uint8Array or the packet object
    onClose: () => void;
}

const DetailSegment: React.FC<{ label: string; size: number; value: string; }> = ({ label, size, value }) => (
    <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/30 space-y-1">
        <div className="flex justify-between items-baseline">
            <span className="font-semibold text-sm text-neutral-300">{label}</span>
            <span className="text-xs text-neutral-500">{size} {size === 1 ? 'byte' : 'bytes'}</span>
        </div>
        <p className="font-mono text-xs text-neutral-300 bg-black p-2 rounded border border-neutral-800 whitespace-nowrap overflow-x-auto">{value}</p>
    </div>
);

const PacketDetailView: React.FC<PacketDetailViewProps> = ({ section, packetData, onClose }) => {
    
    const renderContent = () => {
        if (!packetData) return null;

        switch (section) {
            case 'Header':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                             <DetailSegment label="Control" size={2} value={bytesToHex(packetData.header.slice(0,2))} />
                        </div>
                        <DetailSegment label="Nonce" size={12} value={bytesToHex(packetData.header.slice(2, 14))} />
                        <DetailSegment label="Destination" size={6} value={bytesToHex(packetData.header.slice(14, 20))} />
                        <DetailSegment label="Source" size={6} value={bytesToHex(packetData.header.slice(20, 26))} />
                    </div>
                );
            case 'Payload':
                 return <DetailSegment label="Payload Data" size={packetData.payload.length} value={bytesToHex(packetData.payload)} />;
            case 'Signature':
                return <DetailSegment label="Poly1305 Signature" size={packetData.signature.length} value={bytesToHex(packetData.signature)} />;
            case 'Preamble':
                 return <DetailSegment label="Preamble" size={packetData.length} value={bytesToHex(packetData)} />;
            case 'Sync Word':
                return <DetailSegment label="Sync Word" size={packetData.length} value={bytesToHex(packetData)} />;
            default:
                return null;
        }
    };

    return (
        <div className="mt-4 bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 space-y-3 animate-fade-in backdrop-blur-sm">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">{section} Breakdown</h4>
                <button onClick={onClose} className="p-1 rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white focus:outline-none transition-colors">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
            {renderContent()}
        </div>
    );
};

export default PacketDetailView;