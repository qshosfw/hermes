

// A high-entropy 4-byte Sync Word with good auto-correlation properties (e.g. from LoRa).
export const DEFAULT_SYNC_WORD = new Uint8Array([0x2F, 0x2A, 0x11, 0xDB]);