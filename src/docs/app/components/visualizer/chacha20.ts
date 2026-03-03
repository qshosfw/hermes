/**
 * ChaCha20 Stream Cipher — Pure TypeScript Implementation
 *
 * RFC 8439 compliant. No external dependencies.
 * Key: 256 bits (32 bytes), Nonce: 96 bits (12 bytes), Counter: 32 bits.
 */

// --- Quarter Round (ARX: Add-Rotate-XOR) ---
function rotl(v: number, n: number): number {
    return ((v << n) | (v >>> (32 - n))) >>> 0;
}

function quarterRound(state: Uint32Array, a: number, b: number, c: number, d: number): void {
    state[a] = (state[a] + state[b]) >>> 0; state[d] = rotl(state[d] ^ state[a], 16);
    state[c] = (state[c] + state[d]) >>> 0; state[b] = rotl(state[b] ^ state[c], 12);
    state[a] = (state[a] + state[b]) >>> 0; state[d] = rotl(state[d] ^ state[a], 8);
    state[c] = (state[c] + state[d]) >>> 0; state[b] = rotl(state[b] ^ state[c], 7);
}

// --- Generate one 64-byte keystream block ---
export function chacha20Block(key: Uint8Array, counter: number, nonce: Uint8Array): Uint8Array {
    // State layout: "expand 32-byte k" constants + 8 key words + 1 counter + 3 nonce words
    const state = new Uint32Array(16);

    // Constants: "expand 32-byte k"
    state[0] = 0x61707865;
    state[1] = 0x3320646e;
    state[2] = 0x79622d32;
    state[3] = 0x6b206574;

    // Key (8 x 32-bit words, little-endian)
    const keyView = new DataView(key.buffer, key.byteOffset, 32);
    for (let i = 0; i < 8; i++) {
        state[4 + i] = keyView.getUint32(i * 4, true);
    }

    // Counter
    state[12] = counter >>> 0;

    // Nonce (3 x 32-bit words, little-endian)
    const nonceView = new DataView(nonce.buffer, nonce.byteOffset, 12);
    state[13] = nonceView.getUint32(0, true);
    state[14] = nonceView.getUint32(4, true);
    state[15] = nonceView.getUint32(8, true);

    // Working state
    const working = new Uint32Array(state);

    // 20 rounds (10 double-rounds)
    for (let i = 0; i < 10; i++) {
        // Column rounds
        quarterRound(working, 0, 4, 8, 12);
        quarterRound(working, 1, 5, 9, 13);
        quarterRound(working, 2, 6, 10, 14);
        quarterRound(working, 3, 7, 11, 15);
        // Diagonal rounds
        quarterRound(working, 0, 5, 10, 15);
        quarterRound(working, 1, 6, 11, 12);
        quarterRound(working, 2, 7, 8, 13);
        quarterRound(working, 3, 4, 9, 14);
    }

    // Add initial state
    for (let i = 0; i < 16; i++) {
        working[i] = (working[i] + state[i]) >>> 0;
    }

    // Serialize to bytes (little-endian)
    const output = new Uint8Array(64);
    const outView = new DataView(output.buffer);
    for (let i = 0; i < 16; i++) {
        outView.setUint32(i * 4, working[i], true);
    }

    return output;
}

// --- ChaCha20 encrypt/decrypt (XOR with keystream) ---
export function chacha20Encrypt(key: Uint8Array, nonce: Uint8Array, data: Uint8Array, initialCounter = 1): Uint8Array {
    const output = new Uint8Array(data.length);
    let counter = initialCounter;

    for (let offset = 0; offset < data.length; offset += 64) {
        const block = chacha20Block(key, counter, nonce);
        const remaining = Math.min(64, data.length - offset);
        for (let i = 0; i < remaining; i++) {
            output[offset + i] = data[offset + i] ^ block[i];
        }
        counter++;
    }

    return output;
}

// --- Generate keystream (without XOR) ---
export function chacha20Keystream(key: Uint8Array, nonce: Uint8Array, length: number, initialCounter = 0): Uint8Array {
    const output = new Uint8Array(length);
    let counter = initialCounter;

    for (let offset = 0; offset < length; offset += 64) {
        const block = chacha20Block(key, counter, nonce);
        const remaining = Math.min(64, length - offset);
        output.set(block.subarray(0, remaining), offset);
        counter++;
    }

    return output;
}
