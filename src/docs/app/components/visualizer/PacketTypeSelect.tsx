import React, { useState, useEffect } from 'react';
import type { PacketHeaderConfig } from './types';
import { PacketType, AddressingType } from './types';
import { hexToBytes } from './hermesProtocol';
import AckIcon from './icons/AckIcon';
import KeyIcon from './icons/KeyIcon';
import MoreIcon from './icons/MoreIcon';
import SearchIcon from './icons/SearchIcon';
import PingIcon from './icons/PingIcon';
import MessageIcon from './icons/MessageIcon';
import TelemetryIcon from './icons/TelemetryIcon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

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
    const currentPreset = packetTypePresets.find(p => p.config.type === config.type);
    const isOtherType = !currentPreset;
    const [isEditing, setIsEditing] = useState(isOtherType);

    useEffect(() => {
        setIsEditing(isOtherType);
    }, [isOtherType]);

    const handleSelect = (valueStr: string) => {
        const typeVal = parseInt(valueStr, 10);
        if (typeVal === OTHER_PRESET_TYPE) {
            if (!isOtherType) {
                setConfig(prev => ({ ...prev, type: 31 }));
            }
            setIsEditing(true);
        } else {
            const selectedPreset = packetTypePresets.find(p => p.config.type === typeVal);
            if (selectedPreset) {
                setConfig(prev => ({ ...prev, ...selectedPreset.config }));
            }
            setIsEditing(false);
        }
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
    };

    const selectedOption = isOtherType ? otherPreset : currentPreset;
    const Icon = selectedOption?.icon || MoreIcon;
    const typeName = isOtherType ? `(${config.type})` : `(${selectedOption?.config.type})`;

    return (
        <div className="relative">
            {isEditing ? (
                <div className="flex items-center w-full bg-black border border-neutral-800 rounded-md shadow-sm focus-within:ring-1 focus-within:ring-neutral-400 focus-within:border-neutral-400 transition">
                    <Input
                        type="number"
                        min="0"
                        max="31"
                        value={config.type}
                        onChange={handleOtherInputChange}
                        className="flex-grow w-full bg-transparent border-none py-2 px-3 text-sm text-neutral-200 focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-center"
                        autoFocus
                        aria-label="Custom packet type"
                    />
                    <button
                        type="button"
                        onClick={handleBackToPicker}
                        className="flex-shrink-0 p-2 h-full text-neutral-400 border-l border-neutral-800 hover:bg-neutral-800 hover:text-white"
                        aria-label="Open packet type picker"
                    >
                        <svg className="w-4 h-4 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            ) : (
                <Select value={selectedOption?.config.type.toString()} onValueChange={handleSelect}>
                    <SelectTrigger className="w-full bg-black border-neutral-800 text-neutral-200">
                        <div className="flex flex-row items-center justify-start gap-2 h-full">
                            <Icon className="w-4 h-4 text-neutral-500" />
                            <span className="truncate flex-grow text-left flex items-center gap-1">
                                {selectedOption?.label}
                                <span className="text-neutral-500 text-xs">{typeName}</span>
                            </span>
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-200">
                        {[...packetTypePresets, otherPreset].map((option) => {
                            const OptionIcon = option.icon;
                            const optionTypeName = option.config.type !== OTHER_PRESET_TYPE ? `(${option.config.type})` : '';
                            return (
                                <SelectItem
                                    key={option.label}
                                    value={option.config.type.toString()}
                                    className="focus:bg-neutral-800 focus:text-white cursor-pointer data-[state=checked]:bg-neutral-800 text-neutral-300"
                                >
                                    <div className="flex items-center">
                                        <OptionIcon className="w-4 h-4 mr-2 flex-shrink-0 text-neutral-500" />
                                        <span>{option.label}</span>
                                        {optionTypeName && <span className="text-neutral-500 text-xs ml-1">{optionTypeName}</span>}
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            )}
        </div>
    );
};

export default PacketTypeSelect;