import React, { useState, useEffect } from 'react';
import type { PacketHeaderConfig } from './types';
import { PacketType, AddressingType } from './types';
import { hexToBytes } from './hermesProtocol';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle, Navigation, MessageSquare, Activity, Search, KeyRound, MoreHorizontal, ChevronDown } from 'lucide-react';

const OTHER_PRESET_TYPE = -1;

const packetTypePresets = [
    {
        label: 'ACK',
        icon: CheckCircle,
        config: { type: PacketType.ACK, wantAck: false, addressing: AddressingType.UNICAST, ttl: 7, lastFragment: true, fragmentIndex: 0 }
    },
    {
        label: 'Ping',
        icon: Navigation,
        config: { type: PacketType.PING, wantAck: true, addressing: AddressingType.UNICAST, ttl: 7, lastFragment: true, fragmentIndex: 0 }
    },
    {
        label: 'Message',
        icon: MessageSquare,
        config: { type: PacketType.MESSAGE, wantAck: true, addressing: AddressingType.UNICAST, ttl: 7, lastFragment: true, fragmentIndex: 0 }
    },
    {
        label: 'Telemetry',
        icon: Activity,
        config: { type: PacketType.TELEMETRY, wantAck: false, addressing: AddressingType.UNICAST, ttl: 7, lastFragment: true, fragmentIndex: 0 }
    },
    {
        label: 'Discovery',
        icon: Search,
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
        icon: KeyRound,
        config: { type: PacketType.KEY_RATCHET, wantAck: true, addressing: AddressingType.UNICAST, ttl: 7, lastFragment: true, fragmentIndex: 0 }
    },
];

const otherPreset = {
    label: 'Other',
    icon: MoreHorizontal,
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
    const SelectedIcon = selectedOption?.icon || MoreHorizontal;
    const typeName = isOtherType ? `(${config.type})` : `(${selectedOption?.config.type})`;

    return (
        <div className="relative">
            {isEditing ? (
                <div className="flex items-center w-full bg-background border border-border rounded-md shadow-sm focus-within:ring-1 focus-within:ring-ring transition">
                    <Input
                        type="number"
                        min="0"
                        max="31"
                        value={config.type}
                        onChange={handleOtherInputChange}
                        className="flex-grow w-full bg-transparent border-none py-2 px-3 text-sm text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-center"
                        autoFocus
                        aria-label="Custom packet type"
                    />
                    <button
                        type="button"
                        onClick={handleBackToPicker}
                        className="flex-shrink-0 p-2 h-full text-muted-foreground border-l border-border hover:bg-accent hover:text-accent-foreground"
                        aria-label="Open packet type picker"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <Select value={selectedOption?.config.type.toString()} onValueChange={handleSelect}>
                    <SelectTrigger className="w-full bg-background border-border text-foreground">
                        <div className="flex flex-row items-center justify-start gap-2 h-full">
                            <SelectedIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="truncate flex-grow text-left flex items-center gap-1.5 text-sm">
                                {selectedOption?.label}
                                <span className="text-muted-foreground/60 text-xs font-mono">{typeName}</span>
                            </span>
                        </div>
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-popover border-border text-popover-foreground">
                        {[...packetTypePresets, otherPreset].map((option) => {
                            const OptionIcon = option.icon;
                            const optionTypeName = option.config.type !== OTHER_PRESET_TYPE ? `(${option.config.type})` : '';
                            return (
                                <SelectItem
                                    key={option.label}
                                    value={option.config.type.toString()}
                                    className="cursor-pointer"
                                >
                                    <div className="flex items-center gap-2">
                                        <OptionIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span>{option.label}</span>
                                        {optionTypeName && <span className="text-muted-foreground/60 text-xs font-mono">{optionTypeName}</span>}
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