import React, { useState, useEffect } from 'react';
import { bytesToHex, hexToBytes, callsignToBytes, bytesToCallsign } from './hermesProtocol';
import InfoIcon from './icons/InfoIcon';
import Tooltip from './Tooltip';
import { Input } from '@/components/ui/input';

type AddressMode = 'Hex' | 'Callsign';

interface AddressInputProps {
  label: string;
  tooltip: string;
  value: Uint8Array;
  onChange: (value: Uint8Array) => void;
  disabled?: boolean;
}

const AddressInput: React.FC<AddressInputProps> = ({ label, tooltip, value, onChange, disabled = false }) => {
  const [mode, setMode] = useState<AddressMode>('Hex');
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    if (!isEditing) {
      if (mode === 'Hex') {
        setInputValue(bytesToHex(value));
      } else {
        setInputValue(bytesToCallsign(value));
      }
    }
  }, [value, isEditing, mode]);

  const handleFocus = () => {
    if (disabled) return;
    setIsEditing(true);
    if (mode === 'Hex') {
      setInputValue(bytesToHex(value).replace(/\s/g, ''));
    } else {
      setInputValue(bytesToCallsign(value));
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setInputValue(newText);

    let valid = false;
    let newBytes: Uint8Array = new Uint8Array(6);

    if (mode === 'Hex') {
      const cleanHex = newText.replace(/\s/g, '');
      const hexRegex = /^[0-9a-fA-F]*$/;
      if (hexRegex.test(cleanHex) && cleanHex.length <= 12) {
        valid = true;
        newBytes = hexToBytes(cleanHex, 6);
      }
    } else { // Callsign mode
      const callsignRegex = /^[A-Z0-9-./\s]*$/i;
      if (callsignRegex.test(newText) && newText.length <= 6) {
        valid = true;
        newBytes = callsignToBytes(newText);
      }
    }
    setIsValid(valid);
    if (valid) {
      onChange(newBytes);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        {label && (
          <div className="flex items-center space-x-2 text-xs font-medium text-neutral-400 uppercase tracking-wide">
            <span>{label}</span>
            <Tooltip content={tooltip}>
              <InfoIcon className="w-3.5 h-3.5 text-neutral-600 hover:text-neutral-400 cursor-help" />
            </Tooltip>
          </div>
        )}
        <div className="flex items-center text-[10px] bg-neutral-900 rounded border border-neutral-800 p-0.5 ml-auto">
          {(['Hex', 'Callsign'] as AddressMode[]).map(m => (
            <button
              key={m}
              onClick={() => !disabled && setMode(m)}
              disabled={disabled}
              className={`px-2 py-0.5 rounded transition-colors ${mode === m ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <Input
        type="text"
        value={inputValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleInputChange}
        disabled={disabled}
        maxLength={mode === 'Hex' ? 12 : 6}
        className={`bg-black border-neutral-800 text-neutral-200 focus-visible:ring-neutral-400 font-mono ${!isValid ? 'border-red-500/50 text-red-400 focus-visible:ring-red-500/50' : ''}`}
        placeholder={mode === 'Hex' ? 'C0FFEE123456' : 'AB1CD'}
      />
    </div>
  );
};

export default AddressInput;