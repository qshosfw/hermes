import React, { useState, useRef, useEffect } from 'react';
import { hexToBytes, bytesToHex, generatePn15Sequence, whiten, parseHeader, parsePingPayload, parseAckPayload, parseTelemetryPayload, bytesToText } from './hermesProtocol';
import UploadIcon from './icons/UploadIcon';
import XIcon from './icons/XIcon';
import type { PacketHeaderConfig, AckedPacketInfo, TelemetryPacketInfo } from './types';
import { PacketType } from './types';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSharedSecret: Uint8Array;
    onImport: (data: {
        config: PacketHeaderConfig;
        payloadText: string;
        hopPath: Uint8Array[];
        ackedPacketInfo: AckedPacketInfo | null;
        telemetryPacketInfo: TelemetryPacketInfo | null;
        syncWord: Uint8Array;
        sharedSecret: Uint8Array;
    }) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, currentSharedSecret, onImport }) => {
    const [file, setFile] = useState<File | null>(null);
    const [secretHex, setSecretHex] = useState(bytesToHex(currentSharedSecret));
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setSecretHex(bytesToHex(currentSharedSecret));
            setFile(null);
            setError(null);
        }
    }, [isOpen, currentSharedSecret]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleImport = async () => {
        if (!file) {
            setError("Please select a file.");
            return;
        }

        try {
            const secret = hexToBytes(secretHex);
            if (secret.length !== 32) throw new Error("Shared secret must be 32 bytes.");

            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);

            // Basic validation: 16 (Preamble) + 4 (Sync) + 128 (Data) = 148 bytes
            if (bytes.length !== 148) {
                throw new Error(`Invalid file size: ${bytes.length} bytes. Expected 148 bytes.`);
            }

            const syncWord = bytes.slice(16, 20);
            const whitenedData = bytes.slice(20, 148);

            // De-whiten
            const pn15 = generatePn15Sequence(128); // Generate for full 128 byte frame
            const frame = whiten(whitenedData, syncWord, pn15);

            // In the new pipeline, data is at the start [0:96] and parity is at [96:128]
            const data = frame.slice(0, 96);

            // Parse
            const headerBytes = data.slice(0, 24);
            const payloadBytes = data.slice(24, 80);
            // Signature is at 80-96

            const config = parseHeader(headerBytes);

            let payloadText = "";
            let hopPath: Uint8Array[] = [];
            let ackedPacketInfo: AckedPacketInfo | null = null;
            let telemetryPacketInfo: TelemetryPacketInfo | null = null;

            if (config.type === PacketType.PING) {
                hopPath = parsePingPayload(payloadBytes);
            } else if (config.type === PacketType.ACK) {
                ackedPacketInfo = parseAckPayload(payloadBytes);
            } else if (config.type === PacketType.TELEMETRY) {
                telemetryPacketInfo = parseTelemetryPayload(payloadBytes);
            } else {
                // Default to text
                payloadText = bytesToText(payloadBytes);
            }

            onImport({
                config,
                payloadText,
                hopPath,
                ackedPacketInfo,
                telemetryPacketInfo,
                syncWord,
                sharedSecret: secret
            });
            onClose();

        } catch (e: any) {
            setError(e.message || "Failed to parse file.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-800/30">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <UploadIcon className="w-4 h-4 text-blue-500" />
                        Import Binary Packet
                    </h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Binary File (.bin)</label>
                        <div
                            className={`border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-neutral-800/50 transition-all ${file ? 'border-blue-500 bg-blue-500/10' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".bin"
                                className="hidden"
                            />
                            {file ? (
                                <div className="text-sm text-blue-200 font-medium">{file.name}</div>
                            ) : (
                                <div className="text-sm text-neutral-500">Click to select a binary frame file</div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Shared Secret (Hex)</label>
                        <input
                            type="text"
                            value={secretHex}
                            onChange={e => {
                                setSecretHex(e.target.value);
                                setError(null);
                            }}
                            className="w-full bg-black border border-neutral-700 rounded-md py-2 px-3 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 font-mono"
                        />
                        <p className="text-[10px] text-neutral-600 mt-1">Must match the secret used to generate the packet.</p>
                    </div>

                    {error && (
                        <div className="bg-red-900/20 border border-red-900/50 text-red-200 text-xs p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md shadow-lg shadow-blue-900/20 transition-all active:translate-y-[1px]"
                        >
                            Import Packet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportModal;