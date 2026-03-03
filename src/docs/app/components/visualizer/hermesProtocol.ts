import type { PacketHeaderConfig, AckedPacketInfo, TelemetryPacketInfo } from './types';
import { PacketType, AckStatus } from './types';
import { Poly1305 } from "@stablelib/poly1305";
import { chacha20Encrypt, chacha20Keystream } from './chacha20';

export const bytesToHex = (bytes: Uint8Array): string =>
    Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

export const hexToBytes = (hex: string, requiredLength?: number): Uint8Array => {
    const cleanHex = hex.replace(/\s/g, '');
    const bytes = new Uint8Array(Math.ceil(cleanHex.length / 2));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    if (requiredLength && bytes.length !== requiredLength) {
        const resized = new Uint8Array(requiredLength);
        resized.set(bytes.slice(0, requiredLength));
        return resized;
    }
    return bytes;
};

export const textToBytes = (text: string, length: number): Uint8Array => {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);
    const buffer = new Uint8Array(length);
    buffer.set(encoded.slice(0, length));
    return buffer;
};

export const bytesToText = (bytes: Uint8Array): string => {
    // Remove null terminators
    let len = bytes.length;
    while (len > 0 && bytes[len - 1] === 0) {
        len--;
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes.slice(0, len));
}

export const generateRandomBytes = (length: number): Uint8Array => {
    const buffer = new Uint8Array(length);
    crypto.getRandomValues(buffer);
    return buffer;
};

const BASE40_CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/.";

// GSM-7 Standard Charset (0x00 - 0x7F)
const GSM7_STANDARD =
    "@£$¥èéùìòÇ\nØø\rÅå" +
    "Δ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ" +
    " !\"#¤%&'()*+,-./" +
    "0123456789:;<=>?" +
    "¡ABCDEFGHIJKLMNO" +
    "PQRSTUVWXYZÄÖÑÜ§" +
    "¿abcdefghijklmno" +
    "pqrstuvwxyzäöñüà";

// GSM-7 Extended Charset (Preceded by 0x1B)
// Some custom Hermes symbols included
const GSM7_EXTENDED: Record<number, string> = {
    0x00: 'bold', // Custom
    0x01: 'ital', // Custom
    0x02: 'strk', // Custom
    0x03: 'und',  // Custom
    0x0A: '\f',   // Form Feed
    0x14: '^',
    0x1B: '\x1B', // SS2
    0x28: '{',
    0x29: '}',
    0x2C: '[',
    0x2F: '\\',
    0x30: '¶',
    0x31: '™',
    0x32: '®',
    0x33: '©',
    0x38: '«',
    0x39: '»',
    0x3E: ']',
    0x3D: '~',
    0x40: '│',
    0x41: '←',
    0x42: '→',
    0x43: '↑',
    0x44: '↓',
    0x46: '◀',
    0x47: '▶',
    0x50: '░',
    0x51: '▒',
    0x52: '█',
    0x53: '▄',
    0x54: '▌',
    0x55: '▐',
    0x56: '─',
    0x57: '┌',
    0x58: '┐',
    0x59: '└',
    0x5A: '┘',
    0x5B: '├',
    0x5C: '┤',
    0x5D: '┬',
    0x5E: '┴',
    0x5F: '┼',
    0x60: '■',
    0x61: '□',
    0x62: '●',
    0x63: '○',
    0x64: '▲',
    0x65: '△',
    0x66: '▼',
    0x67: '▽',
    0x68: '◆',
    0x69: '◇',
    0x6A: '★',
    0x6B: '☆',
    0x6C: '☺',
    0x6D: '☻',
    0x6E: '♥',
    0x6F: '🌡',
    0x70: '✓',
    0x71: '✗',
    0x72: '✉',
    0x75: '€',
};

// Reverse lookup for standard
const GSM7_STANDARD_REV: Record<string, number> = {};
for (let i = 0; i < GSM7_STANDARD.length; i++) {
    GSM7_STANDARD_REV[GSM7_STANDARD[i]] = i;
}

// Reverse lookup for extended
const GSM7_EXTENDED_REV: Record<string, number> = {};
for (const [code, char] of Object.entries(GSM7_EXTENDED)) {
    GSM7_EXTENDED_REV[char] = parseInt(code);
}

/**
 * Encodes a string into GSM-7 septets.
 */
export const textToGsm7Septets = (text: string): number[] => {
    const septets: number[] = [];
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (GSM7_EXTENDED_REV[char] !== undefined) {
            septets.push(0x1B); // Escape
            septets.push(GSM7_EXTENDED_REV[char]);
        } else if (GSM7_STANDARD_REV[char] !== undefined) {
            septets.push(GSM7_STANDARD_REV[char]);
        } else {
            septets.push(GSM7_STANDARD_REV['?']); // Replacement
        }
    }
    return septets;
};

/**
 * Packs 7-bit septets into 8-bit octets.
 */
export const packGsm7 = (septets: number[], maxLength: number): Uint8Array => {
    const octets = new Uint8Array(maxLength);
    let bitOffset = 0;

    for (const septet of septets) {
        const bytePos = Math.floor(bitOffset / 8);
        const shift = bitOffset % 8;

        if (bytePos < maxLength) {
            octets[bytePos] |= (septet << shift) & 0xFF;
            if (shift > 1 && bytePos + 1 < maxLength) {
                octets[bytePos + 1] |= (septet >> (8 - shift)) & 0xFF;
            }
        }
        bitOffset += 7;
    }
    return octets;
};

/**
 * Unpacks 8-bit octets into 7-bit septets.
 */
export const unpackGsm7 = (octets: Uint8Array): number[] => {
    const septets: number[] = [];
    const numSeptets = Math.floor((octets.length * 8) / 7);
    let bitOffset = 0;

    for (let i = 0; i < numSeptets; i++) {
        const bytePos = Math.floor(bitOffset / 8);
        const shift = bitOffset % 8;

        let septet = 0;
        if (bytePos < octets.length) {
            septet = (octets[bytePos] >> shift) & 0x7F;
            if (shift > 1 && bytePos + 1 < octets.length) {
                const remainingBits = 7 - (8 - shift);
                const mask = (1 << remainingBits) - 1;
                septet |= (octets[bytePos + 1] & mask) << (8 - shift);
            }
            septets.push(septet);
        }
        bitOffset += 7;
    }
    return septets;
};

/**
 * Converts GSM-7 septets back to a string.
 */
export const gsm7SeptetsToText = (septets: number[]): string => {
    let text = "";
    let escaped = false;
    for (const septet of septets) {
        if (septet === 0x1B && !escaped) {
            escaped = true;
            continue;
        }

        if (escaped) {
            text += GSM7_EXTENDED[septet] || '?';
            escaped = false;
        } else {
            text += GSM7_STANDARD[septet] || '?';
        }
    }
    return text;
};

export const callsignToBytes = (callsign: string): Uint8Array => {
    // Process only up to 9 characters per M17 spec (A.4)
    const clean = callsign.toUpperCase().slice(0, 9);
    let address = 0n;

    // A.4: "A callsign is encoded backwards, from the last character to the first character."
    // address = 40 * address + val;
    for (let i = clean.length - 1; i >= 0; i--) {
        const c = clean[i];
        const v = BigInt(BASE40_CHARS.indexOf(c) === -1 ? 0 : BASE40_CHARS.indexOf(c));
        address = address * 40n + v;
    }

    const bytes = new Uint8Array(6);
    // A.2: "the final 6-byte address is the big endian encoded representation of the base-40 value."
    for (let i = 5; i >= 0; i--) {
        bytes[i] = Number(address & 0xFFn);
        address >>= 8n;
    }
    return bytes;
};

export const bytesToCallsign = (bytes: Uint8Array): string => {
    let address = 0n;
    for (let i = 0; i < 6; i++) {
        address = (address << 8n) | BigInt(bytes[i]);
    }

    // A.3: Standard addresses are from 0x1 to 0xEE6B27FFFFFF
    if (address === 0n) return "";
    if (address >= 0xEE6B28000000n) {
        if (address === 0xFFFFFFFFFFFFn) return "BROADCAST";
        return `EXT-${address.toString(16).toUpperCase()}`;
    }

    let callsign = "";
    // A.5 Decoder Example:
    // while (address) { cs[i++] = m17chars[address % 40u]; address /= 40u; }
    while (address > 0n) {
        const remainder = Number(address % 40n);
        address /= 40n;
        callsign += BASE40_CHARS[remainder];
    }

    // M17 decoding produces the string in order (first char at index 0)
    return callsign;
};


const buildHeader = (config: PacketHeaderConfig): Uint8Array => {
    const header = new Uint8Array(24);
    // Byte 0: Type (4 bits) | TTL (4 bits)
    header[0] = (config.type << 4) | config.ttl;
    // Byte 1: Addressing (2 bits) | Want Ack (1 bit) | Fragment Index (4 bits) | Last Fragment (1 bit)
    header[1] = (config.addressing << 6) | ((config.wantAck ? 1 : 0) << 5) | (config.fragmentIndex << 1) | (config.lastFragment ? 1 : 0);
    // Bytes 2-7: Packet ID (6 bytes)
    header.set(config.packetId, 2);
    // Bytes 8-13: Destination (6 bytes)
    header.set(config.destination, 8);
    // Bytes 14-19: Source (6 bytes)
    header.set(config.source, 14);
    // Bytes 20-23: Hop Nonce (4 bytes)
    header.set(config.hopNonce, 20);
    return header;
};

export const parseHeader = (buffer: Uint8Array): PacketHeaderConfig => {
    const type = (buffer[0] >> 4) & 0x0F;
    const ttl = buffer[0] & 0x0F;
    const addressing = (buffer[1] >> 6) & 0x03;
    const wantAck = ((buffer[1] >> 5) & 0x01) === 1;
    const fragmentIndex = (buffer[1] >> 1) & 0x0F;
    const lastFragment = (buffer[1] & 0x01) === 1;
    const packetId = buffer.slice(2, 8);
    const destination = buffer.slice(8, 14);
    const source = buffer.slice(14, 20);
    const hopNonce = buffer.slice(20, 24);

    return { type, ttl, addressing, wantAck, fragmentIndex, lastFragment, packetId, destination, source, hopNonce };
};

export const calculatePoly1305 = (header: Uint8Array, payload: Uint8Array, key: Uint8Array): Uint8Array => {
    // The key must be 32 bytes. The app logic ensures this via hexToBytes and generateRandomBytes.
    const mac = new Poly1305(key);
    mac.update(header);
    mac.update(payload);
    // Explicitly provide an output buffer to the finish() method to resolve a TypeScript type issue.
    // The Poly1305 tag is 16 bytes.
    const tag = new Uint8Array(16);
    mac.finish(tag);
    return tag;
};

export const buildPayloadFromHopPath = (hopPath: Uint8Array[]): Uint8Array => {
    const payload = new Uint8Array(56);
    let offset = 0;
    for (const hop of hopPath) {
        if (offset + 6 <= 56) {
            payload.set(hop, offset);
            offset += 6;
        }
    }
    return payload;
};

export const parsePingPayload = (payload: Uint8Array): Uint8Array[] => {
    const hopPath: Uint8Array[] = [];
    for (let i = 0; i < 9; i++) { // Max 9 hops (56/6 truncated)
        const offset = i * 6;
        if (offset + 6 > 56) break;
        const hop = payload.slice(offset, offset + 6);
        // Check if hop is all zeros
        if (hop.every(b => b === 0)) break;
        hopPath.push(hop);
    }
    return hopPath;
};

export const buildRawPacket = (config: PacketHeaderConfig, payload: Uint8Array, sharedSecret: Uint8Array): { data: Uint8Array, header: Uint8Array, payload: Uint8Array, signature: Uint8Array } => {
    const header = buildHeader(config);
    // Ensure payload is 56 bytes
    if (payload.length !== 56) {
        const resized = new Uint8Array(56);
        resized.set(payload.slice(0, 56));
        payload = resized;
    }
    const signature = calculatePoly1305(header, payload, sharedSecret);

    const data = new Uint8Array(96);
    data.set(header, 0);
    data.set(payload, 24);
    data.set(signature, 80);

    return { data, header, payload, signature };
};

export const buildAckPacket = (
    config: PacketHeaderConfig,
    ackedInfo: AckedPacketInfo,
    sharedSecret: Uint8Array
): { data: Uint8Array, header: Uint8Array, payload: Uint8Array, signature: Uint8Array } => {
    const header = buildHeader(config);

    // Build the 56-byte ACK payload
    const payload = new Uint8Array(56);
    // 6 bytes: ACKed Packet ID
    payload.set(ackedInfo.packetId, 0);
    // 8 bytes: ACKed Inner MAC
    payload.set(ackedInfo.innerMac, 6);

    // 1 byte for bitfields at index 14
    // 4 bits: ACKed Fragment Index
    // 1 bit: ACKed Last Fragment
    // 2 bits: Status
    // 1 bit: Telemetry Bit
    const bitfields =
        (ackedInfo.fragmentIndex << 4) |
        ((ackedInfo.lastFragment ? 1 : 0) << 3) |
        (ackedInfo.status << 1) |
        (ackedInfo.telemetryBit ? 1 : 0);
    payload[14] = bitfields;

    // Bytes 15-39: Telemetry (if telemetryBit is set)
    if (ackedInfo.telemetryBit) {
        // --- Health Blob (5 bytes) ---
        const toRssiVal = (rssi: number): number => {
            if (rssi >= 7) return 127; // UNKNOWN
            // Clamp to valid range (-120 to +6) and add offset
            return Math.min(Math.max(rssi + 120, 0), 126);
        };

        const ackedRssiVal = toRssiVal(ackedInfo.ackedRssi);
        const ackingRssiVal = toRssiVal(ackedInfo.ackingRssi);
        // 7 bits: Acked RSSI
        // 7 bits: Acking RSSI
        // 6 bits: Idle RSSI (-120 to -60)
        // 8 bits: Prev LQI (0-255)
        // 4 bits: TX Power
        const toIdleRssiVal = (rssi: number): number => {
            if (rssi >= 7) return 63; // UNKNOWN maps to max
            return Math.min(Math.max(rssi + 120, 0), 62);
        };
        const idleRssiVal = toIdleRssiVal(ackedInfo.idleRssi);

        payload[15] = (ackedInfo.hasBattery ? 0x80 : 0) | (ackedInfo.batteryVoltage & 0x7F);
        payload[16] = (ackedRssiVal << 1) | ((ackingRssiVal >> 6) & 0x01);
        payload[17] = ((ackingRssiVal & 0x3F) << 2) | ((idleRssiVal >> 4) & 0x03);
        payload[18] = ((idleRssiVal & 0x0F) << 4) | ((ackedInfo.prevLqi >> 4) & 0x0F);
        payload[19] = ((ackedInfo.prevLqi & 0x0F) << 4) | (ackedInfo.txPowerLevel & 0x0F);

        // --- Location Blob (17 bytes) ---
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

        for (let i = 16; i >= 0; i--) {
            payload[20 + i] = Number(packed & 0xFFn);
            packed >>= 8n;
        }
    }

    // The rest are reserved/padding, which are 0 by default in a new Uint8Array.

    const signature = calculatePoly1305(header, payload, sharedSecret);

    const data = new Uint8Array(96);
    data.set(header, 0);
    data.set(payload, 24);
    data.set(signature, 80);

    return { data, header, payload, signature };
};

export const parseAckPayload = (payload: Uint8Array): AckedPacketInfo => {
    const packetId = payload.slice(0, 6);
    const innerMac = payload.slice(6, 14);

    const bitfields = payload[14];
    const fragmentIndex = (bitfields >> 4) & 0x0F;
    const lastFragment = ((bitfields >> 3) & 0x01) === 1;
    const status = (bitfields >> 1) & 0x03 as AckStatus;
    const telemetryBit = (bitfields & 0x01) === 1;

    let info: AckedPacketInfo = {
        packetId,
        innerMac,
        fragmentIndex,
        lastFragment,
        status,
        telemetryBit,
        // Defaults
        hasBattery: false,
        batteryVoltage: 0,
        ackedRssi: 7,
        ackingRssi: 7,
        idleRssi: 7,
        prevLqi: 0,
        txPowerLevel: 0,
        latitude: 0,
        longitude: 0,
        altitude: 0,
        gpsWeek: 0,
        timeOfWeek: 0,
        speed: 0,
        heading: 0,
        satellites: 0,
        precisionRadius: 0,
    };

    if (telemetryBit) {
        const byte15 = payload[15];
        info.hasBattery = (byte15 & 0x80) !== 0;
        info.batteryVoltage = byte15 & 0x7F;

        const byte16 = payload[16];
        const byte17 = payload[17];
        const byte18 = payload[18];
        const byte19 = payload[19];

        const ackedRssiVal = (byte16 >> 1) & 0x7F;
        const ackingRssiVal = ((byte16 & 0x01) << 6) | ((byte17 >> 2) & 0x3F);
        const idleRssiVal = ((byte17 & 0x03) << 4) | ((byte18 >> 4) & 0x0F);

        info.prevLqi = ((byte18 & 0x0F) << 4) | ((byte19 >> 4) & 0x0F);
        info.txPowerLevel = byte19 & 0x0F;

        const fromRssiVal = (val: number) => val === 127 ? 7 : val - 120;
        const fromIdleRssiVal = (val: number) => val === 63 ? 7 : val - 120;

        info.ackedRssi = fromRssiVal(ackedRssiVal);
        info.ackingRssi = fromRssiVal(ackingRssiVal);
        info.idleRssi = fromIdleRssiVal(idleRssiVal);

        // Location
        let packed = 0n;
        for (let i = 0; i < 17; i++) {
            packed = (packed << 8n) | BigInt(payload[20 + i]);
        }

        const qprec = Number(packed & 0xFFn); packed >>= 8n;
        const qsats = Number(packed & 0x3Fn); packed >>= 6n;
        const qhead = Number(packed & 0xFFFn); packed >>= 12n;
        const qspeed = Number(packed & 0xFFFn); packed >>= 12n;
        const qtow = Number(packed & 0xFFFFFn); packed >>= 20n;
        const qweek = Number(packed & 0x3FFn); packed >>= 10n;
        const qalt = Number(packed & 0xFFFFFn); packed >>= 20n;
        const qlon = Number(packed & 0xFFFFFFn); packed >>= 24n;
        const qlat = Number(packed & 0xFFFFFFn);

        info.latitude = (qlat / (Math.pow(2, 24) - 1)) * 180 - 90;
        info.longitude = (qlon / (Math.pow(2, 24) - 1)) * 360 - 180;
        info.altitude = (qalt * 0.1) - 1000;
        info.gpsWeek = qweek;
        info.timeOfWeek = qtow;
        info.speed = qspeed / 100;
        info.heading = (qhead / 4095) * 360;
        info.satellites = qsats;
        info.precisionRadius = qprec / 10;
    }

    return info;
};

export const buildTelemetryPayload = (telemetryInfo: TelemetryPacketInfo): Uint8Array => {
    const payload = new Uint8Array(56);
    const view = new DataView(payload.buffer);
    let offset = 0;

    // Tag (17 bytes)
    const tagBytes = textToBytes(telemetryInfo.tag, 17);
    payload.set(tagBytes, offset);
    offset += 17;

    // Uptime (3 bytes, 24-bit) - Big Endian
    const uptimeTicks = telemetryInfo.uptime;
    view.setUint8(offset, (uptimeTicks >>> 16) & 0xFF);
    view.setUint8(offset + 1, (uptimeTicks >>> 8) & 0xFF);
    view.setUint8(offset + 2, uptimeTicks & 0xFF);
    offset += 3;

    // Flags (1 byte)
    const flags = (telemetryInfo.flags.hasBattery ? 0b10000000 : 0) |
        (telemetryInfo.flags.hasLocation ? 0b01000000 : 0) |
        (telemetryInfo.flags.hasHygrometer ? 0b00100000 : 0) |
        (telemetryInfo.flags.hasGasSensor ? 0b00010000 : 0) |
        (telemetryInfo.flags.hasLuxSensor ? 0b00001000 : 0) |
        (telemetryInfo.flags.hasUvSensor ? 0b00000100 : 0) |
        (telemetryInfo.flags.hasMovementSensor ? 0b00000010 : 0) |
        (telemetryInfo.flags.isCustomData ? 0b00000001 : 0);
    view.setUint8(offset, flags);
    offset += 1;

    if (telemetryInfo.flags.isCustomData) {
        const customBytes = textToBytes(telemetryInfo.customData, 56 - offset);
        payload.set(customBytes, offset);
        return payload; // Custom data takes the rest of the payload
    }

    // Conditional fields in flag order
    if (telemetryInfo.flags.hasBattery && offset + 4 <= 56) {
        view.setUint16(offset, telemetryInfo.batteryVoltage, false);
        view.setInt16(offset + 2, telemetryInfo.batteryCurrent, false);
        offset += 4;
    }

    if (telemetryInfo.flags.hasLocation && offset + 17 <= 56) {
        const loc = telemetryInfo.location;
        const qlat = BigInt(Math.round((loc.latitude + 90) / 180 * (Math.pow(2, 24) - 1)));
        const qlon = BigInt(Math.round((loc.longitude + 180) / 360 * (Math.pow(2, 24) - 1)));
        const qalt = BigInt(Math.round((loc.altitude + 1000) / 0.1));
        const qweek = BigInt(loc.gpsWeek & 0x3FF);
        const qtow = BigInt(loc.timeOfWeek);
        const qspeed = BigInt(Math.min(4095, Math.round(loc.speed * 100)));
        const qhead = BigInt(Math.round((loc.heading % 360) / 360 * 4095));
        const qsats = BigInt(Math.min(63, loc.satellites));
        const qprec = BigInt(Math.min(255, Math.round(loc.precisionRadius * 10)));

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

        for (let i = 16; i >= 0; i--) {
            payload[offset + i] = Number(packed & 0xFFn);
            packed >>= 8n;
        }
        offset += 17;
    }

    if (telemetryInfo.flags.hasHygrometer && offset + 4 <= 56) {
        view.setUint16(offset, telemetryInfo.humidity, false);
        view.setInt16(offset + 2, telemetryInfo.temperature, false);
        offset += 4;
    }

    if (telemetryInfo.flags.hasGasSensor && offset + 4 <= 56) {
        view.setUint16(offset, telemetryInfo.gasPpm, false);
        view.setUint16(offset + 2, telemetryInfo.pressureHpa, false);
        offset += 4;
    }

    if (telemetryInfo.flags.hasLuxSensor && offset + 2 <= 56) {
        view.setUint16(offset, telemetryInfo.lux, false);
        offset += 2;
    }

    if (telemetryInfo.flags.hasUvSensor && offset + 2 <= 56) {
        view.setUint16(offset, telemetryInfo.uvIndex, false);
        offset += 2;
    }

    if (telemetryInfo.flags.hasMovementSensor && offset + 2 <= 56) {
        view.setUint16(offset, telemetryInfo.movement, false);
        offset += 2;
    }

    return payload;
};

export const parseTelemetryPayload = (payload: Uint8Array): TelemetryPacketInfo => {
    const view = new DataView(payload.buffer);
    let offset = 0;

    const tag = bytesToText(payload.slice(0, 17));
    offset += 17;

    const uptime = (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
    offset += 3;

    const flagByte = view.getUint8(offset);
    offset += 1;

    const flags = {
        hasBattery: (flagByte & 0x80) !== 0,
        hasLocation: (flagByte & 0x40) !== 0,
        hasHygrometer: (flagByte & 0x20) !== 0,
        hasGasSensor: (flagByte & 0x10) !== 0,
        hasLuxSensor: (flagByte & 0x08) !== 0,
        hasUvSensor: (flagByte & 0x04) !== 0,
        hasMovementSensor: (flagByte & 0x02) !== 0,
        isCustomData: (flagByte & 0x01) !== 0,
    };

    const info: TelemetryPacketInfo = {
        tag,
        uptime,
        flags,
        batteryVoltage: 0,
        batteryCurrent: 0,
        location: {
            latitude: 0,
            longitude: 0,
            altitude: 0,
            gpsWeek: 0,
            timeOfWeek: 0,
            speed: 0,
            heading: 0,
            satellites: 0,
            precisionRadius: 0
        },
        humidity: 0,
        temperature: 0,
        gasPpm: 0,
        pressureHpa: 0,
        lux: 0,
        uvIndex: 0,
        movement: 0,
        customData: '',
    };

    if (flags.isCustomData) {
        info.customData = bytesToText(payload.slice(offset));
        return info;
    }

    if (flags.hasBattery && offset + 4 <= 56) {
        info.batteryVoltage = view.getUint16(offset, false);
        info.batteryCurrent = view.getInt16(offset + 2, false);
        offset += 4;
    }

    if (flags.hasLocation && offset + 17 <= 56) {
        let packed = 0n;
        for (let i = 0; i < 17; i++) {
            packed = (packed << 8n) | BigInt(payload[offset + i]);
        }

        const qprec = Number(packed & 0xFFn); packed >>= 8n;
        const qsats = Number(packed & 0x3Fn); packed >>= 6n;
        const qhead = Number(packed & 0xFFFn); packed >>= 12n;
        const qspeed = Number(packed & 0xFFFn); packed >>= 12n;
        const qtow = Number(packed & 0xFFFFFn); packed >>= 20n;
        const qweek = Number(packed & 0x3FFn); packed >>= 10n;
        const qalt = Number(packed & 0xFFFFFn); packed >>= 20n;
        const qlon = Number(packed & 0xFFFFFFn); packed >>= 24n;
        const qlat = Number(packed & 0xFFFFFFn);

        info.location.latitude = (qlat / (Math.pow(2, 24) - 1)) * 180 - 90;
        info.location.longitude = (qlon / (Math.pow(2, 24) - 1)) * 360 - 180;
        info.location.altitude = (qalt * 0.1) - 1000;
        info.location.gpsWeek = qweek;
        info.location.timeOfWeek = qtow;
        info.location.speed = qspeed / 100;
        info.location.heading = (qhead / 4095) * 360;
        info.location.satellites = qsats;
        info.location.precisionRadius = qprec / 10;
        offset += 17;
    }

    if (flags.hasHygrometer && offset + 4 <= 56) {
        info.humidity = view.getUint16(offset, false);
        info.temperature = view.getInt16(offset + 2, false);
        offset += 4;
    }

    if (flags.hasGasSensor && offset + 4 <= 56) {
        info.gasPpm = view.getUint16(offset, false);
        info.pressureHpa = view.getUint16(offset + 2, false);
        offset += 4;
    }

    if (flags.hasLuxSensor && offset + 2 <= 56) {
        info.lux = view.getUint16(offset, false);
        offset += 2;
    }

    if (flags.hasUvSensor && offset + 2 <= 56) {
        info.uvIndex = view.getUint16(offset, false);
        offset += 2;
    }

    if (flags.hasMovementSensor && offset + 2 <= 56) {
        info.movement = view.getUint16(offset, false);
        offset += 2;
    }

    return info;
};

// FEC is now the last stage. Interleaving is removed.

/**
 * Generates a pseudo-random byte sequence using a PN15 LFSR (x^15 + x^14 + 1).
 * @param length The number of bytes to generate.
 * @param initialState An optional 15-bit initial state.
 * @returns A Uint8Array containing the pseudo-random sequence.
 */
export const generatePn15Sequence = (length: number, initialState = 0x4224): Uint8Array => {
    const sequence = new Uint8Array(length);
    let lfsr = initialState & 0x7FFF; // Ensure it's a 15-bit value

    for (let i = 0; i < length; i++) {
        let byte = 0;
        for (let j = 0; j < 8; j++) {
            // Output the MSB of the 15-bit LFSR
            const outputBit = (lfsr >> 14) & 1;
            byte = (byte << 1) | outputBit;

            // Calculate the new bit to shift in (tap at x^15 and x^14)
            const newBit = ((lfsr >> 14) ^ (lfsr >> 13)) & 1;

            // Shift left and add the new bit
            lfsr = ((lfsr << 1) | newBit) & 0x7FFF;
        }
        sequence[i] = byte;
    }
    return sequence;
};

export const whiten = (data: Uint8Array, syncWord: Uint8Array, pn15Sequence: Uint8Array): Uint8Array => {
    const whitened = new Uint8Array(96);
    for (let i = 0; i < 96; i++) {
        const syncByte = syncWord[i % syncWord.length];
        whitened[i] = data[i] ^ syncByte ^ pn15Sequence[i];
    }
    return whitened;
};

// ══════════════════════════════════════════════════════════════════════════════
//  FULL PROTOCOL PIPELINE — Per RFC Security §4: Encryption Pipeline
// ══════════════════════════════════════════════════════════════════════════════

/** All intermediate snapshots from the full encryption pipeline */
export interface PipelineResult {
    // Layer 0: Cleartext Transport Frame
    cleartext: Uint8Array;          // 96 bytes: header(24) + payload(56) + mac(16)
    header: Uint8Array;             // 24 bytes
    payload: Uint8Array;            // 56 bytes (plaintext)
    signature: Uint8Array;          // 16 bytes (Poly1305 MAC)
    // Layer 1: Inner AEAD (ChaCha20 encrypts payload region)
    innerAead: Uint8Array;          // 96 bytes: header(24) + encrypted_payload(56) + mac(16)
    // Layer 2: Outer Shroud (mesh obfuscation via K_mesh keystream)
    outerShroud: Uint8Array;        // 96 bytes: fully obfuscated
    // Layer 3: PN15 Whitened
    whitened: Uint8Array;           // 96 bytes: spectrally flat
    // Layer 4: Physical Frame (128 bytes: preamble + sync + whitened + FEC pad)
    physicalFrame: Uint8Array;      // 128 bytes
}

/**
 * Stage 1: Inner AEAD Encryption
 * Encrypts the 56-byte payload region using ChaCha20 with the shared secret as key.
 * The nonce is derived from the packet ID + hop nonce for uniqueness.
 */
const innerAeadEncrypt = (
    cleartext: Uint8Array,
    sharedSecret: Uint8Array,
): Uint8Array => {
    const result = new Uint8Array(cleartext);

    // Derive a 12-byte nonce from packet ID (bytes 2-7) + hop nonce (bytes 20-23) + 2 padding bytes
    const nonce = new Uint8Array(12);
    nonce.set(cleartext.subarray(2, 8), 0);   // 6 bytes: Packet ID
    nonce.set(cleartext.subarray(20, 24), 6); // 4 bytes: Hop Nonce
    // Last 2 bytes stay 0x00 (padding)

    // Encrypt the payload region (bytes 24-79) with ChaCha20
    const plaintextPayload = cleartext.subarray(24, 80);
    const encrypted = chacha20Encrypt(sharedSecret, nonce, plaintextPayload);
    result.set(encrypted, 24);

    return result;
};

/**
 * Stage 2: Outer Shroud (Mesh Obfuscation)
 * XOR the header (excluding hop nonce at 20-23) and encrypted payload+MAC
 * with a keystream derived from K_mesh and the hop nonce.
 */
const outerShroudApply = (
    innerAead: Uint8Array,
    sharedSecret: Uint8Array,
): Uint8Array => {
    const result = new Uint8Array(innerAead);

    // Derive outer keystream nonce from hop nonce (bytes 20-23) padded to 12 bytes
    const outerNonce = new Uint8Array(12);
    outerNonce.set(innerAead.subarray(20, 24), 0);

    // Generate 96 bytes of keystream
    const keystream = chacha20Keystream(sharedSecret, outerNonce, 96);

    // XOR everything EXCEPT the hop nonce (bytes 20-23) — routers need to read it
    for (let i = 0; i < 96; i++) {
        if (i >= 20 && i < 24) continue; // Skip hop nonce
        result[i] = innerAead[i] ^ keystream[i];
    }

    return result;
};

/**
 * Stage 3 + 4: PN15 Whitening + Physical Frame Assembly
 * - Whiten the 96 bytes with PN15 LFSR XOR
 * - Prepend: 16-byte preamble pattern + 4-byte sync word + 12 bytes FEC/RS padding
 * - Result: 128 bytes total physical frame
 */
const buildPhysicalFrame = (
    obfuscated: Uint8Array,
    syncWord: Uint8Array,
): Uint8Array => {
    // PN15 Whitening
    const pn15 = generatePn15Sequence(96);
    const whitened = whiten(obfuscated, syncWord, pn15);

    // Build 128-byte physical frame:
    // [0-15]   Preamble (16 bytes: alternating 0xAA/0x55 pattern based on sync word MSB)
    // [16-19]  Sync Word (4 bytes)
    // [20-115] Whitened Data (96 bytes)
    // [116-127] FEC/RS padding (12 bytes, filled with PN15 continuation)
    const frame = new Uint8Array(128);

    // Preamble: 16 bytes of alternating pattern
    const preambleByte = (syncWord[0] & 0x80) ? 0x55 : 0xAA;
    for (let i = 0; i < 16; i++) {
        frame[i] = preambleByte;
    }

    // Sync Word
    frame.set(syncWord.subarray(0, 4), 16);

    // Whitened packet data
    frame.set(whitened, 20);

    // FEC/RS parity placeholder (PN15 continuation for spectral flatness)
    const fecPad = generatePn15Sequence(12, 0x1337);
    frame.set(fecPad, 116);

    return { whitened, frame } as any; // We return both for the pipeline
};

/**
 * Full Pipeline Orchestrator
 * Runs all 4 stages and returns snapshots of every layer.
 */
export const buildFullPipeline = (
    config: PacketHeaderConfig,
    payload: Uint8Array,
    sharedSecret: Uint8Array,
    syncWord: Uint8Array,
): PipelineResult => {
    // --- Stage 0: Build cleartext transport frame ---
    const rawResult = buildRawPacket(config, payload, sharedSecret);
    const cleartext = rawResult.data;

    // --- Stage 1: Inner AEAD (ChaCha20 on payload) ---
    const innerAead = innerAeadEncrypt(cleartext, sharedSecret);

    // --- Stage 2: Outer Shroud (mesh obfuscation) ---
    const outerShroud = outerShroudApply(innerAead, sharedSecret);

    // --- Stage 3 & 4: Whitening + Physical Frame ---
    const pn15 = generatePn15Sequence(96);
    const whitened = whiten(outerShroud, syncWord, pn15);

    // Build 128-byte physical frame
    const frame = new Uint8Array(128);
    const preambleByte = (syncWord[0] & 0x80) ? 0x55 : 0xAA;
    for (let i = 0; i < 16; i++) frame[i] = preambleByte;
    frame.set(syncWord.subarray(0, 4), 16);
    frame.set(whitened, 20);
    const fecPad = generatePn15Sequence(12, 0x1337);
    frame.set(fecPad, 116);

    return {
        cleartext,
        header: rawResult.header,
        payload: rawResult.payload,
        signature: rawResult.signature,
        innerAead,
        outerShroud,
        whitened,
        physicalFrame: frame,
    };
};