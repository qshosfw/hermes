import React, { useState, useRef, useEffect } from 'react';
import { PacketHeaderConfig, PacketType, AddressingType } from '../types';
import { hexToBytes } from '../services/hermesProtocol';
import AckIcon from './icons/AckIcon';
import KeyIcon from './icons/KeyIcon';
import MoreIcon from './icons/MoreIcon';
import SearchIcon from './icons/SearchIcon';
import PingIcon from './icons/PingIcon';
import MessageIcon from './icons/MessageIcon';
import TelemetryIcon from './icons/TelemetryIcon';

const OTHER_PRESET_TYPE = -1;

const packetTypePresets = [
    {
        label: 'ACK',
        icon: AckIcon,
        config: { type: PacketType.ACK, wantAck: false, addressing: AddressingType.UNICAST, ttl: 7, lastFragment: true, fragmentIndex: 0 }
    },
    {
        label: 'Ping',
        icon: PingIcon,
        config: { type: PacketType.PING, wantAck: true, addressing: AddressingType.UNICAST, ttl: 7, lastFragment: true, fragmentIndex: 0 }
    },
    {
        label: 'Message',
        icon: MessageIcon,
        config: { type: PacketType.MESSAGE, wantAck: true, addressing: AddressingType.UNICAST, ttl: 7, lastFragment: true, fragmentIndex: 0 }
    },
    {
        label: 'Telemetry',
        icon: TelemetryIcon,
        config: { type: PacketType.TELEMETRY, wantAck: false, addressing: AddressingType.UNICAST, ttl: 7, lastFragment: true, fragmentIndex: 0 }
    },
    {
        label: 'Discovery',
        icon: SearchIcon,
        config: { 
            type: PacketType.DISCOVERY, 
            wantAck: false, 
            addressing: AddressingType.DISCOVER, 
            ttl: 1, 
            lastFragment: true, 
            fragmentIndex: 0,
            destination: hexToBytes('DDDDDDDDDDDD', 6)
        }
    },
    {
        label: 'Key Ratchet',
        icon: KeyIcon,
        config: { type: PacketType.KEY_RATCHET, wantAck: true, addressing: AddressingType.UNICAST, ttl: 7, lastFragment: true, fragmentIndex: 0 }
    },
];

const otherPreset = {
    label: 'Other',
    icon: MoreIcon,
    config: { type: OTHER_PRESET_TYPE }
};

interface PacketTypeSelectProps {
  config: PacketHeaderConfig;
  setConfig: React.Dispatch<React.SetStateAction<PacketHeaderConfig>>;
}

const PacketTypeSelect: React.FC<PacketTypeSelectProps> = ({ config, setConfig }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const currentPreset = packetTypePresets.find(p => p.config.type === config.type);
    const isOtherType = !currentPreset;
    const [isEditing, setIsEditing] = useState(isOtherType);

    useEffect(() => {
        setIsEditing(isOtherType);
    }, [isOtherType]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (newConfig: Partial<PacketHeaderConfig>) => {
        if (newConfig.type === OTHER_PRESET_TYPE) {
             if (!isOtherType) {
                setConfig(prev => ({ ...prev, type: 31 }));
            }
            setIsEditing(true);
        } else {
            setConfig(prev => ({ ...prev, ...newConfig }));
            setIsEditing(false);
        }
        setIsOpen(false);
    };

    const handleOtherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 0 && value <= 31) {
            setConfig(prev => ({ ...prev, type: value }));
        } else if (e.target.value === '') {
             setConfig(prev => ({ ...prev, type: 0 }));
        }
    };

    const handleBackToPicker = () => {
        setIsEditing(false);
        setIsOpen(true);
    };
    
    const selectedOption = isOtherType ? otherPreset : currentPreset;
    const Icon = selectedOption.icon;
    const typeName = isOtherType ? `(${config.type})` : `(${selectedOption.config.type})`;

    return (
        <div className="relative" ref={wrapperRef}>
            {isEditing ? (
                 <div className="flex items-center w-full bg-black border border-neutral-800 rounded-md shadow-sm focus-within:ring-1 focus-within:ring-neutral-400 focus-within:border-neutral-400 transition">
                    <input 
                        type="number"
                        min="0"
                        max="31"
                        value={config.type}
                        onChange={handleOtherInputChange}
                        className="flex-grow w-full bg-transparent py-2 px-3 text-sm text-neutral-200 focus:outline-none font-mono text-center"
                        autoFocus
                        aria-label="Custom packet type"
                    />
                    <button
                        type="button"
                        onClick={handleBackToPicker}
                        className="flex-shrink-0 p-2 text-neutral-400 border-l border-neutral-800 hover:bg-neutral-800 hover:text-white"
                        aria-label="Open packet type picker"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    className="w-full flex items-center justify-between bg-black border border-neutral-800 rounded-md py-2 px-3 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-400 transition-all hover:bg-neutral-900"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                >
                    <div className="flex items-center overflow-hidden">
                        <Icon className="w-4 h-4 mr-2 text-neutral-500 flex-shrink-0" />
                        <span className="flex-grow truncate">{selectedOption.label} <span className="text-neutral-500 text-xs ml-1">{typeName}</span></span>
                    </div>
                    <svg className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            )}

            {isOpen && !isEditing && (
                <ul className="absolute z-50 mt-1 w-full bg-neutral-900 border border-neutral-800 shadow-xl rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {[...packetTypePresets, otherPreset].map((option) => {
                        const OptionIcon = option.icon;
                        const optionTypeName = option.config.type !== OTHER_PRESET_TYPE ? `(${option.config.type})` : '';
                        return (
                            <li key={option.label} className="cursor-pointer select-none relative py-2 pl-3 pr-9 transition-colors text-neutral-300 hover:bg-neutral-800 hover:text-white" onClick={() => handleSelect(option.config)}>
                                <div className="flex items-center">
                                    <OptionIcon className="w-4 h-4 mr-2 text-neutral-500 flex-shrink-0" />
                                    <span className="font-normal block whitespace-nowrap">{option.label} <span className="text-neutral-500 text-xs">{optionTypeName}</span></span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default PacketTypeSelect;