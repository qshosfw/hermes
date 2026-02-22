

export enum PacketType {
  ACK = 0,
  PING = 1,
  MESSAGE = 2,
  TELEMETRY = 3,
  DISCOVERY = 4,
  KEY_RATCHET = 5,
  NACK = 6,
}

export enum AddressingType {
  UNICAST = 0,
  MULTICAST = 1,
  BROADCAST = 2,
  DISCOVER = 3,
}

export interface PacketHeaderConfig {
  type: number; // 0-31 (5 bits)
  addressing: AddressingType; // 2 bits
  ttl: number; // 0-7 (3 bits)
  wantAck: boolean;
  fragmentIndex: number; // 0-15 (4 bits)
  lastFragment: boolean;
  nonce: Uint8Array; // 12 bytes
  destination: Uint8Array; // 6 bytes
  source: Uint8Array; // 6 bytes
}

export interface Highlight {
    index: number;
    length: number;
    color: string;
    label: string;
}

export enum AckStatus {
    ACK_OK = 0, // FEC syndrome is 0, no errors
    ACK_CORRECTED = 1, // Non-zero syndrome, correctable
    NACK_NORETRY = 2, // NACK non-correctable, do not retransmit
    NACK_RETRY = 3, // NACK, try to retransmit
}

export interface AckedPacketInfo {
    nonce: Uint8Array; // 12 bytes
    signature: Uint8Array; // 16 bytes
    fragmentIndex: number; // 4 bits
    lastFragment: boolean; // 1 bit
    status: AckStatus; // 2 bits
    telemetryBit: boolean; // 1 bit
    // Health Blob Data
    hasBattery: boolean;
    batteryVoltage: number; // 0-127
    ackedRssi: number; // -120 to 6, with 7 for UNKNOWN
    ackingRssi: number; // -120 to 6, with 7 for UNKNOWN
    idleRssi: number; // -120 to 6, with 7 for UNKNOWN
    prevLqi: number; // 0-127
    txPowerLevel: number; // 0-15
    // Location Blob Data
    latitude: number;
    longitude: number;
    altitude: number;
    gpsWeek: number;
    timeOfWeek: number;
    speed: number;
    heading: number;
    satellites: number;
    precisionRadius: number;
}

export interface TelemetryLocationInfo {
    latitude: number;
    longitude: number;
    altitude: number;
    gpsWeek: number;
    timeOfWeek: number;
    speed: number;
    heading: number;
    satellites: number;
    precisionRadius: number;
}

export interface TelemetryPacketInfo {
    tag: string; // 17 bytes, ASCII
    uptime: number; // ticks (0.25s per tick), uint24
    flags: {
        hasBattery: boolean;
        hasLocation: boolean;
        hasHygrometer: boolean;
        hasGasSensor: boolean;
        hasLuxSensor: boolean;
        hasUvSensor: boolean;
        hasMovementSensor: boolean;
        isCustomData: boolean;
    };
    batteryVoltage: number; // mV, uint16
    batteryCurrent: number; // mA, int16
    location: TelemetryLocationInfo;
    humidity: number; // % * 100, uint16
    temperature: number; // C * 100, int16
    gasPpm: number; // uint16
    pressureHpa: number; // uint16
    lux: number; // uint16
    uvIndex: number; // UV * 100, uint16
    movement: number; // magnitude, uint16
    customData: string;
}