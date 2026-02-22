import React from 'react';
import { bytesToHex } from './hermesProtocol';
import AddressInput from './AddressInput';
import XIcon from './icons/XIcon';
import PlusIcon from './icons/PlusIcon';
import InfoIcon from './icons/InfoIcon';

interface PingPayloadBuilderProps {
    hopPath: Uint8Array[];
    setHopPath: React.Dispatch<React.SetStateAction<Uint8Array[]>>;
    isPong: boolean;
    onTogglePong: () => void;
    source: Uint8Array;
    destination: Uint8Array;
}

const PingPayloadBuilder: React.FC<PingPayloadBuilderProps> = ({ hopPath, setHopPath, isPong, onTogglePong, source, destination }) => {
    
    const handleAddHop = () => {
        if (hopPath.length < 9) { // Max 9 hops (54/6)
            setHopPath([...hopPath, new Uint8Array(6).fill(0)]);
        }
    };
    
    const handleRemoveHop = (index: number) => {
        setHopPath(hopPath.filter((_, i) => i !== index));
    };

    const handleHopChange = (index: number, newAddress: Uint8Array) => {
        const newHopPath = [...hopPath];
        newHopPath[index] = newAddress;
        setHopPath(newHopPath);
    };

    return (
        <div className="space-y-6">
            {/* Control Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/50 p-1 rounded-lg border border-neutral-800">
                 <div className="flex p-1 w-full sm:w-auto bg-neutral-950 rounded-md border border-neutral-800 relative">
                    <button 
                        onClick={() => isPong && onTogglePong()}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded transition-all z-10 ${!isPong ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Ping Request
                    </button>
                     <button 
                        onClick={() => !isPong && onTogglePong()}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded transition-all z-10 ${isPong ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Pong Response
                    </button>
                 </div>
                 <div className="px-3 text-xs text-neutral-500 hidden sm:block font-medium">
                    {isPong ? 'Returning path to originator' : 'Recording path to destination'}
                 </div>
            </div>

            {/* Path Visualization / Editor */}
            <div className="relative pl-6 border-l-2 border-neutral-800 ml-4 space-y-8 py-2">
                
                {/* Source Node (Fixed) */}
                <div className="relative">
                     <div className="absolute -left-[31px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-600 ring-4 ring-black box-content"></div>
                     <div className="bg-neutral-900/30 border border-neutral-800 rounded-lg p-3 opacity-70">
                        <div className="text-[10px] uppercase tracking-wide font-bold text-amber-500 mb-1">Source (Origin)</div>
                        <div className="font-mono text-xs text-neutral-400 break-all">{bytesToHex(source)}</div>
                     </div>
                </div>

                {/* Hops */}
                {hopPath.map((hop, index) => (
                    <div key={index} className="relative group animate-fade-in">
                         <div className="absolute -left-[33px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-neutral-800 border-2 border-neutral-600 ring-4 ring-black z-10 flex items-center justify-center text-[8px] font-bold text-white box-content">
                            {index + 1}
                         </div>
                         
                         <div className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-3 shadow-sm transition-all hover:border-neutral-500 group-hover:bg-neutral-900 relative">
                            <div className="flex justify-between items-start mb-2">
                                <div className="text-[10px] uppercase tracking-wide font-bold text-blue-400 flex items-center gap-2">
                                    Hop #{index + 1}
                                </div>
                                <button 
                                    onClick={() => handleRemoveHop(index)} 
                                    className="text-neutral-600 hover:text-rose-500 transition-colors p-1 -mr-2 -mt-2 rounded-full hover:bg-neutral-800"
                                    title="Remove Hop"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <AddressInput 
                                label="" 
                                tooltip="Address of the relaying node."
                                value={hop} 
                                onChange={(val) => handleHopChange(index, val)} 
                            />
                         </div>
                    </div>
                ))}

                {/* Add Hop Button (Inline) */}
                {hopPath.length < 9 && (
                    <div className="relative">
                         <div className="absolute -left-[31px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-neutral-800 ring-4 ring-black box-content"></div>
                         <button 
                            onClick={handleAddHop}
                            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-neutral-800 rounded-lg text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 hover:bg-neutral-900/50 transition-all group"
                         >
                            <div className="bg-neutral-800 p-1 rounded-full group-hover:bg-neutral-700 transition-colors">
                                <PlusIcon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-medium">Insert Intermediate Hop</span>
                         </button>
                    </div>
                )}

                {/* Destination Node (Fixed) */}
                <div className="relative">
                     <div className="absolute -left-[31px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-black box-content"></div>
                     <div className="bg-neutral-900/30 border border-neutral-800 rounded-lg p-3 opacity-70">
                        <div className="text-[10px] uppercase tracking-wide font-bold text-emerald-500 mb-1">Destination (Target)</div>
                        <div className="font-mono text-xs text-neutral-400 break-all">{bytesToHex(destination)}</div>
                     </div>
                </div>

            </div>
            
            <div className="flex items-start gap-3 bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
                <InfoIcon className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-400 leading-relaxed">
                    <span className="font-semibold text-neutral-300">Payload Capacity:</span> The payload simulates the route trace stored during transit. Maximum capacity is 9 hops (54 bytes). Currently using <span className="font-mono font-bold text-neutral-200">{hopPath.length * 6}</span> / 54 bytes.
                </div>
            </div>
        </div>
    );
};

export default PingPayloadBuilder;