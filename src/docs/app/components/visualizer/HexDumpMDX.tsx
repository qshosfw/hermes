import React from 'react';
import HexDump from './HexDump';
import { hexToBytes } from './hermesProtocol';
import type { Highlight } from './types';

interface HexDumpMDXProps {
    hexString: string;
    bytesPerRow?: number;
    highlights?: Highlight[];
}

export default function HexDumpMDX({ hexString, highlights = [], bytesPerRow = 16 }: HexDumpMDXProps) {
    const data = hexToBytes(hexString);
    return <HexDump data={data} highlights={highlights} bytesPerRow={bytesPerRow} />;
}
