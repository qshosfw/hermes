import type { PacketHeaderConfig, AckedPacketInfo, TelemetryPacketInfo } from './types';
import { PacketType, AckStatus } from './types';
import { Poly1305 } from "@stablelib/poly1305";

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

const BASE40_CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789./";

export const callsignToBytes = (callsign: string): Uint8Array => {
    const padded = callsign.toUpperCase().padEnd(6, ' ');
    let address = 0n;

    // Per M17 spec: encode backwards from right to left (Horner's method on the reversed string)
    // This is equivalent to `c0*40^0 + c1*40^1 + ...`
    for (let i = 5; i >= 0; i--) {
        const c = padded[i];
        const v = BigInt(BASE40_CHARS.indexOf(c));
        address = address * 40n + v;
    }

    const bytes = new Uint8Array(6);
    for (let i = 5; i >= 0; i--) {
        bytes[i] = Number(address & 0xFFn);
        address >>= 8n;
    }
    return bytes;
};

export const bytesToCallsign = (bytes: Uint8Array): string => {
    let address = 0n;
    for (let i = 0; i < 6; i++) {
        address = (address << 8n) + BigInt(bytes[i]);
    }

    if (address === 0n) return "";

    let callsign = "";
    // Decode by repeatedly taking modulo 40 to get the coefficients
    // from lowest power to highest (c0, c1, c2...), which builds the callsign left-to-right.
    for (let i = 0; i < 6; i++) {
        const remainder = Number(address % 40n);
        address /= 40n;
        callsign += BASE40_CHARS[remainder];
    }
    return callsign.trim();
};


const buildHeader = (config: PacketHeaderConfig): Uint8Array => {
    const header = new Uint8Array(26);
    // Byte 0: Type (5 bits) | TTL (3 bits)
    header[0] = (config.type << 3) | config.ttl;
    // Byte 1: Addressing (2 bits) | Want Ack (1 bit) | Fragment Index (4 bits) | Last Fragment (1 bit)
    header[1] = (config.addressing << 6) | ((config.wantAck ? 1 : 0) << 5) | (config.fragmentIndex << 1) | (config.lastFragment ? 1 : 0);
    // Bytes 2-13: Nonce (12 bytes)
    header.set(config.nonce, 2);
    // Bytes 14-19: Destination (6 bytes)
    header.set(config.destination, 14);
    // Bytes 20-25: Source (6 bytes)
    header.set(config.source, 20);
    return header;
};

export const parseHeader = (buffer: Uint8Array): PacketHeaderConfig => {
    const type = (buffer[0] >> 3) & 0x1F;
    const ttl = buffer[0] & 0x07;
    const addressing = (buffer[1] >> 6) & 0x03;
    const wantAck = ((buffer[1] >> 5) & 0x01) === 1;
    const fragmentIndex = (buffer[1] >> 1) & 0x0F;
    const lastFragment = (buffer[1] & 0x01) === 1;
    const nonce = buffer.slice(2, 14);
    const destination = buffer.slice(14, 20);
    const source = buffer.slice(20, 26);

    return { type, ttl, addressing, wantAck, fragmentIndex, lastFragment, nonce, destination, source };
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
    const payload = new Uint8Array(54);
    let offset = 0;
    for (const hop of hopPath) {
        if (offset + 6 <= 54) {
            payload.set(hop, offset);
            offset += 6;
        }
    }
    return payload;
};

export const parsePingPayload = (payload: Uint8Array): Uint8Array[] => {
    const hopPath: Uint8Array[] = [];
    for (let i = 0; i < 9; i++) { // Max 9 hops (54/6)
        const offset = i * 6;
        const hop = payload.slice(offset, offset + 6);
        // Check if hop is all zeros
        if (hop.every(b => b === 0)) break;
        hopPath.push(hop);
    }
    return hopPath;
};

export const buildRawPacket = (config: PacketHeaderConfig, payload: Uint8Array, sharedSecret: Uint8Array): { data: Uint8Array, header: Uint8Array, payload: Uint8Array, signature: Uint8Array } => {
    const header = buildHeader(config);
    // Ensure payload is 54 bytes
    if (payload.length !== 54) {
        const resized = new Uint8Array(54);
        resized.set(payload.slice(0, 54));
        payload = resized;
    }
    const signature = calculatePoly1305(header, payload, sharedSecret);

    const data = new Uint8Array(96);
    data.set(header, 0);
    data.set(payload, 26);
    data.set(signature, 80);

    return { data, header, payload, signature };
};

export const buildAckPacket = (
    config: PacketHeaderConfig,
    ackedInfo: AckedPacketInfo,
    sharedSecret: Uint8Array
): { data: Uint8Array, header: Uint8Array, payload: Uint8Array, signature: Uint8Array } => {
    const header = buildHeader(config);

    // Build the 54-byte ACK payload
    const payload = new Uint8Array(54);
    // 12 bytes: ACKed Nonce
    payload.set(ackedInfo.nonce, 0);
    // 16 bytes: ACKed Signature
    payload.set(ackedInfo.signature, 12);

    // 1 byte for bitfields at index 28
    // 4 bits: ACKed Fragment Index
    // 1 bit: ACKed Last Fragment
    // 2 bits: Status
    // 1 bit: Telemetry Bit
    const bitfields =
        (ackedInfo.fragmentIndex << 4) |
        ((ackedInfo.lastFragment ? 1 : 0) << 3) |
        (ackedInfo.status << 1) |
        (ackedInfo.telemetryBit ? 1 : 0);
    payload[28] = bitfields;

    // Bytes 29-53: Telemetry (if telemetryBit is set)
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

        payload[29] = (ackedInfo.hasBattery ? 0x80 : 0) | (ackedInfo.batteryVoltage & 0x7F);
        payload[30] = (ackedRssiVal << 1) | ((ackingRssiVal >> 6) & 0x01);
        payload[31] = ((ackingRssiVal & 0x3F) << 2) | ((idleRssiVal >> 4) & 0x03);
        payload[32] = ((idleRssiVal & 0x0F) << 4) | ((ackedInfo.prevLqi >> 4) & 0x0F);
        payload[33] = ((ackedInfo.prevLqi & 0x0F) << 4) | (ackedInfo.txPowerLevel & 0x0F);

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
            payload[34 + i] = Number(packed & 0xFFn);
            packed >>= 8n;
        }
    }

    // The rest are reserved/padding, which are 0 by default in a new Uint8Array.

    const signature = calculatePoly1305(header, payload, sharedSecret);

    const data = new Uint8Array(96);
    data.set(header, 0);
    data.set(payload, 26);
    data.set(signature, 80);

    return { data, header, payload, signature };
};

export const parseAckPayload = (payload: Uint8Array): AckedPacketInfo => {
    const nonce = payload.slice(0, 12);
    const signature = payload.slice(12, 28);

    const bitfields = payload[28];
    const fragmentIndex = (bitfields >> 4) & 0x0F;
    const lastFragment = ((bitfields >> 3) & 0x01) === 1;
    const status = (bitfields >> 1) & 0x03 as AckStatus;
    const telemetryBit = (bitfields & 0x01) === 1;

    let info: AckedPacketInfo = {
        nonce,
        signature,
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
        const byte29 = payload[29];
        info.hasBattery = (byte29 & 0x80) !== 0;
        info.batteryVoltage = byte29 & 0x7F;

        const byte30 = payload[30];
        const byte31 = payload[31];
        const byte32 = payload[32];
        const byte33 = payload[33];

        const ackedRssiVal = (byte30 >> 1) & 0x7F;
        const ackingRssiVal = ((byte30 & 0x01) << 6) | ((byte31 >> 2) & 0x3F);
        const idleRssiVal = ((byte31 & 0x03) << 4) | ((byte32 >> 4) & 0x0F);

        info.prevLqi = ((byte32 & 0x0F) << 4) | ((byte33 >> 4) & 0x0F);
        info.txPowerLevel = byte33 & 0x0F;

        const fromRssiVal = (val: number) => val === 127 ? 7 : val - 120;
        const fromIdleRssiVal = (val: number) => val === 63 ? 7 : val - 120;

        info.ackedRssi = fromRssiVal(ackedRssiVal);
        info.ackingRssi = fromRssiVal(ackingRssiVal);
        info.idleRssi = fromIdleRssiVal(idleRssiVal);

        // Location
        let packed = 0n;
        for (let i = 0; i < 17; i++) {
            packed = (packed << 8n) | BigInt(payload[34 + i]);
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
    const payload = new Uint8Array(54);
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
        const customBytes = textToBytes(telemetryInfo.customData, 54 - offset);
        payload.set(customBytes, offset);
        return payload; // Custom data takes the rest of the payload
    }

    // Conditional fields in flag order
    if (telemetryInfo.flags.hasBattery && offset + 4 <= 54) {
        view.setUint16(offset, telemetryInfo.batteryVoltage, false);
        view.setInt16(offset + 2, telemetryInfo.batteryCurrent, false);
        offset += 4;
    }

    if (telemetryInfo.flags.hasLocation && offset + 17 <= 54) {
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

    if (telemetryInfo.flags.hasHygrometer && offset + 4 <= 54) {
        view.setUint16(offset, telemetryInfo.humidity, false);
        view.setInt16(offset + 2, telemetryInfo.temperature, false);
        offset += 4;
    }

    if (telemetryInfo.flags.hasGasSensor && offset + 4 <= 54) {
        view.setUint16(offset, telemetryInfo.gasPpm, false);
        view.setUint16(offset + 2, telemetryInfo.pressureHpa, false);
        offset += 4;
    }

    if (telemetryInfo.flags.hasLuxSensor && offset + 2 <= 54) {
        view.setUint16(offset, telemetryInfo.lux, false);
        offset += 2;
    }

    if (telemetryInfo.flags.hasUvSensor && offset + 2 <= 54) {
        view.setUint16(offset, telemetryInfo.uvIndex, false);
        offset += 2;
    }

    if (telemetryInfo.flags.hasMovementSensor && offset + 2 <= 54) {
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

    if (flags.hasBattery && offset + 4 <= 54) {
        info.batteryVoltage = view.getUint16(offset, false);
        info.batteryCurrent = view.getInt16(offset + 2, false);
        offset += 4;
    }

    if (flags.hasLocation && offset + 17 <= 54) {
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

    if (flags.hasHygrometer && offset + 4 <= 54) {
        info.humidity = view.getUint16(offset, false);
        info.temperature = view.getInt16(offset + 2, false);
        offset += 4;
    }

    if (flags.hasGasSensor && offset + 4 <= 54) {
        info.gasPpm = view.getUint16(offset, false);
        info.pressureHpa = view.getUint16(offset + 2, false);
        offset += 4;
    }

    if (flags.hasLuxSensor && offset + 2 <= 54) {
        info.lux = view.getUint16(offset, false);
        offset += 2;
    }

    if (flags.hasUvSensor && offset + 2 <= 54) {
        info.uvIndex = view.getUint16(offset, false);
        offset += 2;
    }

    if (flags.hasMovementSensor && offset + 2 <= 54) {
        info.movement = view.getUint16(offset, false);
        offset += 2;
    }

    return info;
};

// Simulates Reed-Solomon(128,96) encoding
export const reedSolomonEncode = (data: Uint8Array): { data: Uint8Array, parity: Uint8Array } => {
    if (data.length !== 96) throw new Error("Input data must be 96 bytes");
    // Simulate parity generation. In a real scenario, this would be calculated.
    // We'll create a simple pattern for visualization.
    const parity = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        parity[i] = (0xDA + i) % 256;
    }
    return { data, parity };
};

// 3:1 data/parity interleaving
export const interleave = (data: Uint8Array, parity: Uint8Array): Uint8Array => {
    const interleaved = new Uint8Array(128);
    for (let i = 0; i < 32; i++) {
        interleaved.set(data.slice(i * 3, i * 3 + 3), i * 4);
        interleaved[i * 4 + 3] = parity[i];
    }
    return interleaved;
};

export const deInterleave = (interleaved: Uint8Array): { data: Uint8Array, parity: Uint8Array } => {
    const data = new Uint8Array(96);
    const parity = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        data.set(interleaved.slice(i * 4, i * 4 + 3), i * 3);
        parity[i] = interleaved[i * 4 + 3];
    }
    return { data, parity };
};

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
    const whitened = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        const syncByte = syncWord[i % syncWord.length];
        whitened[i] = data[i] ^ syncByte ^ pn15Sequence[i];
    }
    return whitened;
};

export const nrziEncode = (data: Uint8Array): number[] => {
    let lastLevel = 1;
    const levels: number[] = [];

    for (let i = 0; i < data.length; i++) {
        for (let j = 7; j >= 0; j--) {
            const bit = (data[i] >> j) & 1;
            if (bit === 0) { // 0 -> transition
                lastLevel *= -1;
            }
            // 1 -> no transition
            levels.push(lastLevel);
        }
    }
    return levels;
};