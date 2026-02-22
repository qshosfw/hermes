import React, { useMemo, useState, useEffect } from 'react';
import type { AckedPacketInfo, TelemetryPacketInfo } from './types';
import { AckStatus } from './types';
import { bytesToHex, generateRandomBytes } from './hermesProtocol';
import InfoIcon from './icons/InfoIcon';
import CustomSelect from './CustomSelect';
import CheckIcon from './icons/CheckIcon';
import SparklesIcon from './icons/SparklesIcon';
import XCircleIcon from './icons/XCircleIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import Tooltip from './Tooltip';
import Slider from './Slider';
import { Checkbox } from '@/components/ui/checkbox';

interface AckPayloadBuilderProps {
    ackedPacketInfo: AckedPacketInfo | null;
    setAckedPacketInfo: React.Dispatch<React.SetStateAction<AckedPacketInfo | null>>;
    hoveredByte?: number | null;
    isTelemetrySectionExpanded: boolean;
    onToggleTelemetrySection: () => void;
}

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        {...props}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
        />
    </svg>
);


const Label: React.FC<{ htmlFor: string, children: React.ReactNode, tooltip: string }> = ({ htmlFor, children, tooltip }) => (
    <label htmlFor={htmlFor} className="relative z-10 flex items-center space-x-2 text-sm font-medium text-slate-300">
        <span>{children}</span>
        <Tooltip content={tooltip}>
            <InfoIcon className="w-4 h-4 text-slate-500 cursor-help hover:text-slate-400 transition-colors" />
        </Tooltip>
    </label>
);

const LqiVisualizer: React.FC<{ lqi: number }> = ({ lqi }) => {
    const percentage = (lqi / 255) * 100;

    // Choose color based on probability
    let colorClass = "text-rose-400 bg-rose-500/20";
    if (percentage > 80) colorClass = "text-emerald-400 bg-emerald-500/20";
    else if (percentage > 50) colorClass = "text-blue-400 bg-blue-500/20";
    else if (percentage > 20) colorClass = "text-amber-400 bg-amber-500/20";

    return (
        <div className="flex flex-col gap-1 items-end">
            <Label htmlFor="lqi" tooltip="Link Quality Indicator (0-255). A client-side metric calculated from RSSI values to estimate link reliability. Use fast integer sigmoid logic.">
                Estimated P(Link)
            </Label>
            <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div className={`h-full ${colorClass.split(' ')[0].replace('text-', 'bg-')}`} style={{ width: `${percentage}%` }}></div>
                </div>
                <div className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${colorClass}`}>
                    {lqi} / 255
                </div>
            </div>
        </div>
    );
};


const RssiSlider: React.FC<{
    label: string;
    tooltip: string;
    value: number;
    onChange: (value: number) => void;
}> = ({ label, tooltip, value, onChange }) => {
    const displayValue = value >= 7 ? 'Unknown' : `${value} dBm`;
    return (
        <div>
            <Label htmlFor={label.replace(/\s+/g, '-')} tooltip={tooltip}>{`${label}: ${displayValue}`}</Label>
            <Slider
                id={label.replace(/\s+/g, '-')}
                min={-120}
                max={7}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value, 10))}
                className="mt-1"
            />
        </div>
    );
};

const ackStatusOptions = [
    { value: AckStatus.ACK_OK, label: 'OK (No Errors)', icon: CheckIcon },
    { value: AckStatus.ACK_CORRECTED, label: 'OK (Corrected)', icon: SparklesIcon },
    { value: AckStatus.NACK_NORETRY, label: 'NACK (No Retry)', icon: XCircleIcon },
    { value: AckStatus.NACK_RETRY, label: 'NACK (Request Retry)', icon: ArrowPathIcon },
];

const txPowerMap = [
    0.00, 0.13, 0.18, 0.26, 0.38, 0.56, 0.82, 1.21,
    1.79, 2.64, 3.89, 5.73, 8.44, 10.71, 12.00, 12.00
];
const valueToTxPower = (v: number): number => txPowerMap[v] ?? 0.0;

const calculateLqiPart = (snr: number): number => {
    // Fast Integer Sigmoid (Elliot Approximation)
    // P_int(S) = 127 + ((S - M) << 7) / (|S - M| + K)
    const M = 6;
    const K = 2;
    const x = snr - M;
    return 127 + Math.floor((x << 7) / (Math.abs(x) + K));
};

const calculateLqi = (ackedRssi: number, ackingRssi: number, idleRssi: number): number => {
    // Treat "Unknown" RSSI as a very weak signal for LQI purposes
    const getRssi = (val: number) => val >= 7 ? -120 : val;
    const rssiPkt = getRssi(ackedRssi);
    const rssiAck = getRssi(ackingRssi);
    const rssiIdle = getRssi(idleRssi);

    const snrF = rssiPkt - rssiIdle;
    const snrR = rssiAck - rssiIdle;

    const lqiF = calculateLqiPart(snrF);
    const lqiR = calculateLqiPart(snrR);

    // Combine average of the 0-255 scale logic
    let lqi = Math.floor((lqiF + lqiR) / 2);

    if (lqi < 0) lqi = 0;
    if (lqi > 255) lqi = 255;

    return lqi;
};



const AckPayloadBuilder: React.FC<AckPayloadBuilderProps> = ({ ackedPacketInfo, setAckedPacketInfo, hoveredByte, isTelemetrySectionExpanded, onToggleTelemetrySection }) => {
    if (!ackedPacketInfo) return null;

    const [overflowHidden, setOverflowHidden] = useState(!isTelemetrySectionExpanded);

    useEffect(() => {
        if (isTelemetrySectionExpanded) {
            // When expanding, remove overflow-hidden after the animation to allow tooltips to show
            const timer = setTimeout(() => {
                setOverflowHidden(false);
            }, 300); // Corresponds to duration-300
            return () => clearTimeout(timer);
        } else {
            // When collapsing, add overflow-hidden immediately to clip content
            setOverflowHidden(true);
        }
    }, [isTelemetrySectionExpanded]);

    const lqi = useMemo(() =>
        calculateLqi(ackedPacketInfo.ackedRssi, ackedPacketInfo.ackingRssi, ackedPacketInfo.idleRssi),
        [ackedPacketInfo.ackedRssi, ackedPacketInfo.ackingRssi, ackedPacketInfo.idleRssi]
    );

    const handleAckedInfoChange = <K extends keyof AckedPacketInfo>(field: K, value: AckedPacketInfo[K]) => {
        setAckedPacketInfo(prev => prev ? { ...prev, [field]: value } : null);
    };

    const isHovered = (start: number, end: number) => hoveredByte !== null && hoveredByte !== undefined && hoveredByte >= start && hoveredByte <= end;
    const highlightClass = 'ring-2 ring-blue-500';

    const buttonClasses = "p-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white flex-shrink-0 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 focus:outline-none";

    return (
        <div className="space-y-4">
            <div className={`p-1 -m-1 rounded-lg transition-all ${isHovered(26, 37) ? highlightClass : ''}`}>
                <Label htmlFor="acked-nonce" tooltip="The 12-byte nonce of the packet being acknowledged.">ACKed Nonce</Label>
                <div className="mt-1 flex items-center space-x-2">
                    <div className="flex-grow font-mono text-sm p-2 bg-slate-950 rounded-md text-slate-400 border border-slate-700 break-all">
                        {bytesToHex(ackedPacketInfo.nonce)}
                    </div>
                    <button onClick={() => handleAckedInfoChange('nonce', generateRandomBytes(12))} className={buttonClasses}>New</button>
                </div>
            </div>

            <div className={`p-1 -m-1 rounded-lg transition-all ${isHovered(38, 53) ? highlightClass : ''}`}>
                <Label htmlFor="acked-signature" tooltip="The 16-byte signature of the packet being acknowledged.">ACKed Signature</Label>
                <div className="mt-1 flex items-center space-x-2">
                    <div className="flex-grow font-mono text-sm p-2 bg-slate-950 rounded-md text-slate-400 border border-slate-700 break-all">
                        {bytesToHex(ackedPacketInfo.signature)}
                    </div>
                    <button onClick={() => handleAckedInfoChange('signature', generateRandomBytes(16))} className={buttonClasses}>New</button>
                </div>
            </div>

            <div className={`p-1 -m-1 rounded-lg transition-all ${isHovered(54, 54) ? highlightClass : ''}`}>
                <div>
                    <Label htmlFor="acked-fragment-index" tooltip="The fragment index of the packet being acknowledged (4 bits).">{`ACKed Fragment Index: ${ackedPacketInfo.fragmentIndex}`}</Label>
                    <Slider
                        id="acked-fragment-index"
                        min={0} max={15}
                        value={ackedPacketInfo.fragmentIndex}
                        onChange={(e) => handleAckedInfoChange('fragmentIndex', parseInt(e.target.value))}
                        className="mt-1" />
                </div>

                <div className="pt-3">
                    <Label htmlFor="ack-status" tooltip="The status of the acknowledged packet (2 bits).">ACK/NACK Status</Label>
                    <CustomSelect
                        options={ackStatusOptions}
                        value={ackedPacketInfo.status}
                        onChange={(value) => handleAckedInfoChange('status', value)}
                    />
                </div>

                <div className="flex items-center justify-between pt-3">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="acked-last-fragment" checked={ackedPacketInfo.lastFragment} onCheckedChange={(c) => handleAckedInfoChange('lastFragment', !!c)} className="border-slate-600 bg-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                        <Label htmlFor="acked-last-fragment" tooltip="The 'Last Fragment' flag of the packet being acknowledged (1 bit).">ACKed Last Fragment</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="telemetry-bit" checked={ackedPacketInfo.telemetryBit} onCheckedChange={(c) => handleAckedInfoChange('telemetryBit', !!c)} className="border-slate-600 bg-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                        <Label htmlFor="telemetry-bit" tooltip="Indicates the presence of a telemetry blob (health and/or location) (1 bit).">Telemetry Blob</Label>
                    </div>
                </div>
            </div>

            {ackedPacketInfo.telemetryBit && (
                <div className="mt-4 pt-4 border-t border-slate-700/60 animate-fade-in">
                    <button
                        className="w-full flex justify-between items-center text-left"
                        onClick={onToggleTelemetrySection}
                        aria-expanded={isTelemetrySectionExpanded}
                    >
                        <h4 className="text-base font-semibold text-slate-300">Telemetry</h4>
                        <ChevronDownIcon
                            className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isTelemetrySectionExpanded ? 'rotate-180' : 'rotate-0'}`}
                        />
                    </button>
                    <div className={`transition-all duration-300 ease-in-out grid ${isTelemetrySectionExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className={`min-h-0 ${overflowHidden ? 'overflow-hidden' : ''}`}>
                            <div className="pt-4 space-y-4">
                                <h5 className="text-sm font-semibold text-slate-300 -mb-2">Health</h5>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="has-battery" checked={ackedPacketInfo.hasBattery} onCheckedChange={(c) => handleAckedInfoChange('hasBattery', !!c)} className="border-slate-600 bg-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                                    <Label htmlFor="has-battery" tooltip="Indicates if battery voltage is included (1 bit).">Has Battery Info</Label>
                                </div>

                                {ackedPacketInfo.hasBattery && (
                                    <div className="pl-6">
                                        <Label htmlFor="battery-voltage" tooltip="Device battery voltage level (7 bits, 0.0V-12.7V in 0.1V steps)">{`Battery Voltage: ${(ackedPacketInfo.batteryVoltage / 10).toFixed(1)}V`}</Label>
                                        <Slider
                                            id="battery-voltage"
                                            min={0}
                                            max={255}
                                            value={ackedPacketInfo.batteryVoltage}
                                            onChange={(e) => handleAckedInfoChange('batteryVoltage', parseInt(e.target.value, 10))}
                                            className="mt-1" />
                                    </div>
                                )}

                                <RssiSlider
                                    label="ACKed RSSI"
                                    tooltip="RSSI of the packet being ACKed. Range: -120 to +6 dBm, or Unknown."
                                    value={ackedPacketInfo.ackedRssi}
                                    onChange={(v) => handleAckedInfoChange('ackedRssi', v)}
                                />
                                <RssiSlider
                                    label="ACKing RSSI"
                                    tooltip="RSSI of the last packet from the destination. Range: -120 to +6 dBm, or Unknown."
                                    value={ackedPacketInfo.ackingRssi}
                                    onChange={(v) => handleAckedInfoChange('ackingRssi', v)}
                                />
                                <RssiSlider
                                    label="Idle RSSI"
                                    tooltip="Background noise floor RSSI. Range: -120 to +6 dBm, or Unknown."
                                    value={ackedPacketInfo.idleRssi}
                                    onChange={(v) => handleAckedInfoChange('idleRssi', v)}
                                />
                                <div className="pt-2">
                                    <LqiVisualizer lqi={lqi} />
                                </div>
                                <div>
                                    <Label htmlFor="prev-lqi" tooltip="The LQI value calculated by this station on its last transmission (7 bits).">
                                        {`Previous LQI: ${ackedPacketInfo.prevLqi}`}
                                    </Label>
                                    <Slider
                                        id="prev-lqi"
                                        min={0} max={255}
                                        value={ackedPacketInfo.prevLqi}
                                        onChange={(e) => handleAckedInfoChange('prevLqi', parseInt(e.target.value, 10))}
                                        className="mt-1" />
                                </div>
                                <div>
                                    <Label htmlFor="tx-power" tooltip="Transmitter power level of the ACKing radio (4 bits, logarithmic scale).">
                                        {`TX Power: ${valueToTxPower(ackedPacketInfo.txPowerLevel).toFixed(2)} W`}
                                    </Label>
                                    <Slider
                                        id="tx-power"
                                        min={0} max={15}
                                        value={ackedPacketInfo.txPowerLevel}
                                        onChange={(e) => handleAckedInfoChange('txPowerLevel', parseInt(e.target.value, 10))}
                                        className="mt-1" />
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-700/60">
                                    <h5 className="text-sm font-semibold text-slate-300 mb-2">Location</h5>
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="latitude" tooltip="Latitude (-90 to +90 degrees)">{`Latitude: ${ackedPacketInfo.latitude.toFixed(4)}°`}</Label>
                                            <Slider id="latitude" min={-90} max={90} step={0.0001} value={ackedPacketInfo.latitude} onChange={(e) => handleAckedInfoChange('latitude', parseFloat(e.target.value))} className="mt-1" />
                                        </div>
                                        <div>
                                            <Label htmlFor="longitude" tooltip="Longitude (-180 to +180 degrees)">{`Longitude: ${ackedPacketInfo.longitude.toFixed(4)}°`}</Label>
                                            <Slider id="longitude" min={-180} max={180} step={0.0001} value={ackedPacketInfo.longitude} onChange={(e) => handleAckedInfoChange('longitude', parseFloat(e.target.value))} className="mt-1" />
                                        </div>
                                        <div>
                                            <Label htmlFor="altitude" tooltip="Altitude (-1000 to +30000 meters)">{`Altitude: ${ackedPacketInfo.altitude.toFixed(1)} m`}</Label>
                                            <Slider id="altitude" min={-1000} max={30000} step={0.1} value={ackedPacketInfo.altitude} onChange={(e) => handleAckedInfoChange('altitude', parseFloat(e.target.value))} className="mt-1" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="gps-week" tooltip="GPS Week number (0-1023)">{`GPS Week: ${ackedPacketInfo.gpsWeek}`}</Label>
                                                <Slider id="gps-week" min={0} max={1023} value={ackedPacketInfo.gpsWeek} onChange={(e) => handleAckedInfoChange('gpsWeek', parseInt(e.target.value))} className="mt-1" />
                                            </div>
                                            <div>
                                                <Label htmlFor="time-of-week" tooltip="Time of week (0-604799 seconds)">{`Time of Week: ${ackedPacketInfo.timeOfWeek} s`}</Label>
                                                <Slider id="time-of-week" min={0} max={604799} value={ackedPacketInfo.timeOfWeek} onChange={(e) => handleAckedInfoChange('timeOfWeek', parseInt(e.target.value))} className="mt-1" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="speed" tooltip="Speed (0-40.95 m/s)">{`Speed: ${ackedPacketInfo.speed.toFixed(2)} m/s`}</Label>
                                                <Slider id="speed" min={0} max={40.95} step={0.01} value={ackedPacketInfo.speed} onChange={(e) => handleAckedInfoChange('speed', parseFloat(e.target.value))} className="mt-1" />
                                            </div>
                                            <div>
                                                <Label htmlFor="heading" tooltip="Heading (0-359.9 degrees)">{`Heading: ${ackedPacketInfo.heading.toFixed(1)}°`}</Label>
                                                <Slider id="heading" min={0} max={359.9} step={0.1} value={ackedPacketInfo.heading} onChange={(e) => handleAckedInfoChange('heading', parseFloat(e.target.value))} className="mt-1" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="satellites" tooltip="Number of satellites (0-63)">{`Satellites: ${ackedPacketInfo.satellites}`}</Label>
                                                <Slider id="satellites" min={0} max={63} value={ackedPacketInfo.satellites} onChange={(e) => handleAckedInfoChange('satellites', parseInt(e.target.value))} className="mt-1" />
                                            </div>
                                            <div>
                                                <Label htmlFor="precision-radius" tooltip="Precision radius (0-25.5 meters)">{`Precision: ${ackedPacketInfo.precisionRadius.toFixed(1)} m`}</Label>
                                                <Slider id="precision-radius" min={0} max={25.5} step={0.1} value={ackedPacketInfo.precisionRadius} onChange={(e) => handleAckedInfoChange('precisionRadius', parseFloat(e.target.value))} className="mt-1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AckPayloadBuilder;