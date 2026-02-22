import React, { useMemo } from 'react';
import type { TelemetryPacketInfo } from './types';
import InfoIcon from './icons/InfoIcon';
import Tooltip from './Tooltip';
import Slider from './Slider';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface TelemetryPayloadBuilderProps {
    telemetryInfo: TelemetryPacketInfo | null;
    setTelemetryInfo: React.Dispatch<React.SetStateAction<TelemetryPacketInfo | null>>;
}

const Label: React.FC<{ htmlFor: string, children: React.ReactNode, tooltip: string }> = ({ htmlFor, children, tooltip }) => (
    <label htmlFor={htmlFor} className="relative z-10 flex items-center space-x-2 text-sm font-medium text-slate-300">
        <span>{children}</span>
        <Tooltip content={tooltip}>
            <InfoIcon className="w-4 h-4 text-slate-500 cursor-help hover:text-slate-400 transition-colors" />
        </Tooltip>
    </label>
);

const RangeInput: React.FC<{
    id: string;
    label: string;
    tooltip: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    displayScale?: number;
    onChange: (val: number) => void;
}> = ({ id, label, tooltip, value, min, max, step, unit, displayScale = 1, onChange }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            <Label htmlFor={id} tooltip={tooltip}>{label}</Label>
            <span className="font-mono text-xs text-slate-400">{(value * displayScale).toFixed(displayScale < 1 ? 2 : 0)}{unit}</span>
        </div>
        <Slider
            id={id}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
        />
    </div>
);

const formatUptime = (totalSeconds: number) => {
    if (totalSeconds < 1) return '0s';
    totalSeconds = Math.floor(totalSeconds);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
};

const TelemetryPayloadBuilder: React.FC<TelemetryPayloadBuilderProps> = ({ telemetryInfo, setTelemetryInfo }) => {
    if (!telemetryInfo) return null;

    const handleInfoChange = <K extends keyof TelemetryPacketInfo>(field: K, value: TelemetryPacketInfo[K]) => {
        setTelemetryInfo(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleLocationChange = <K extends keyof TelemetryPacketInfo['location']>(field: K, value: TelemetryPacketInfo['location'][K]) => {
        setTelemetryInfo(prev => prev ? { ...prev, location: { ...prev.location, [field]: value } } : null);
    };

    const flagConfig = useMemo(() => [
        { name: 'hasBattery', size: 4, label: 'Has Battery', tooltip: 'Include battery voltage and current. (4 bytes)' },
        { name: 'hasLocation', size: 17, label: 'Has Location', tooltip: 'Include GPS location data. (17 bytes)' },
        { name: 'hasHygrometer', size: 4, label: 'Has Hygrometer', tooltip: 'Include humidity and temperature. (4 bytes)' },
        { name: 'hasGasSensor', size: 4, label: 'Has Gas Sensor', tooltip: 'Include gas PPM and pressure. (4 bytes)' },
        { name: 'hasLuxSensor', size: 2, label: 'Has Lux Sensor', tooltip: 'Include light intensity (Lux). (2 bytes)' },
        { name: 'hasUvSensor', size: 2, label: 'Has UV Sensor', tooltip: 'Include UV Index. (2 bytes)' },
        { name: 'hasMovementSensor', size: 2, label: 'Has Movement', tooltip: 'Include movement/accelerometer data. (2 bytes)' },
    ], []);

    const totalUsedSpace = useMemo(() => {
        let used = 21; // Base size: tag(17) + uptime(3) + flags(1)
        if (telemetryInfo.flags.isCustomData) {
            return 54;
        }
        flagConfig.forEach(flag => {
            if (telemetryInfo.flags[flag.name as keyof typeof telemetryInfo.flags]) {
                used += flag.size;
            }
        });
        return used;
    }, [telemetryInfo.flags, flagConfig]);

    const handleFlagChange = (flagName: keyof TelemetryPacketInfo['flags'], isChecked: boolean) => {
        // Prevent enabling if space exceeded
        if (isChecked && flagName !== 'isCustomData') {
            const flagSize = flagConfig.find(f => f.name === flagName)?.size || 0;
            if (totalUsedSpace + flagSize > 54) return;
        }

        setTelemetryInfo((prev: TelemetryPacketInfo | null) => {
            if (!prev) return null;
            const newFlags = { ...prev.flags, [flagName]: isChecked };

            if (flagName === 'isCustomData' && isChecked) {
                // Uncheck all sensor flags if custom data is selected
                flagConfig.forEach(f => {
                    newFlags[f.name as keyof typeof newFlags] = false;
                });
            } else if (flagName !== 'isCustomData' && isChecked) {
                // Uncheck custom data if a sensor is selected
                newFlags.isCustomData = false;
            }

            return { ...prev, flags: newFlags };
        });
    };

    const remainingBytes = 54 - totalUsedSpace;

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div>
                    <Label htmlFor="telemetry-tag" tooltip="A 17-character ASCII device identifier.">Device Tag</Label>
                    <Input
                        id="telemetry-tag"
                        type="text"
                        value={telemetryInfo.tag}
                        onChange={e => handleInfoChange('tag', e.target.value.substring(0, 17))}
                        maxLength={17}
                        className="mt-1 bg-slate-800 border-slate-700 text-slate-200 focus-visible:ring-blue-500 font-mono text-sm"
                    />
                </div>
                <div>
                    <Label htmlFor="uptime" tooltip="Device uptime (24-bit, 0.25s ticks). Max: ~48.5 days.">{`Uptime: ${formatUptime(telemetryInfo.uptime * 0.25)}`}</Label>
                    <Slider id="uptime" min={0} max={4194303} step={4} value={telemetryInfo.uptime} onChange={(e) => handleInfoChange('uptime', parseInt(e.target.value))} className="mt-1" />
                </div>
            </div>

            <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
                <div className="flex justify-between items-baseline mb-3 pb-2 border-b border-neutral-800">
                    <h4 className="text-sm font-semibold text-slate-300">Payload Configuration</h4>
                    <div className={`font-mono text-xs px-2 py-0.5 rounded ${remainingBytes < 0 ? 'bg-red-900 text-red-200' : 'bg-neutral-800 text-slate-400'}`}>
                        {totalUsedSpace} / 54 Bytes Used
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-2">
                    {flagConfig.map(flag => {
                        const isChecked = telemetryInfo.flags[flag.name as keyof typeof telemetryInfo.flags];
                        const willExceed = !isChecked && (totalUsedSpace + flag.size > 54);
                        const isDisabled = telemetryInfo.flags.isCustomData || willExceed;

                        return (
                            <div key={flag.name} className={`flex items-center space-x-2 ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                                <Checkbox
                                    id={`flag-${flag.name}`}
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onCheckedChange={(c) => handleFlagChange(flag.name as keyof TelemetryPacketInfo['flags'], !!c)}
                                    className="border-slate-600 bg-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 disabled:opacity-50"
                                />
                                <Label htmlFor={`flag-${flag.name}`} tooltip={flag.tooltip}>{flag.label}</Label>
                            </div>
                        );
                    })}

                    <div className={`flex items-center space-x-2 ${totalUsedSpace > 21 && !telemetryInfo.flags.isCustomData ? 'opacity-40' : ''}`}>
                        <Checkbox
                            id={`flag-isCustomData`}
                            checked={telemetryInfo.flags.isCustomData}
                            onCheckedChange={(c) => handleFlagChange('isCustomData', !!c)}
                            className="border-slate-600 bg-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <Label htmlFor={`flag-isCustomData`} tooltip="The rest of the payload is custom data.">Is Custom Data</Label>
                    </div>
                </div>
            </div>

            {/* Sensor Data Inputs */}
            <div className="space-y-4 animate-fade-in">
                {telemetryInfo.flags.hasBattery && (
                    <div className="bg-neutral-800/30 p-3 rounded border border-neutral-800/50">
                        <h5 className="text-xs font-bold text-green-500 uppercase tracking-wider mb-3">Battery Data</h5>
                        <div className="space-y-3">
                            <RangeInput id="batt-volt" label="Voltage" tooltip="Battery Voltage (uint16)" value={telemetryInfo.batteryVoltage} min={0} max={65535} step={1} unit="mV" onChange={v => handleInfoChange('batteryVoltage', v)} />
                            <RangeInput id="batt-curr" label="Current" tooltip="Battery Current (int16)" value={telemetryInfo.batteryCurrent} min={-32768} max={32767} step={1} unit="mA" onChange={v => handleInfoChange('batteryCurrent', v)} />
                        </div>
                    </div>
                )}

                {telemetryInfo.flags.hasHygrometer && (
                    <div className="bg-neutral-800/30 p-3 rounded border border-neutral-800/50">
                        <h5 className="text-xs font-bold text-sky-500 uppercase tracking-wider mb-3">Hygrometer Data</h5>
                        <div className="space-y-3">
                            <RangeInput id="hygro-hum" label="Humidity" tooltip="Relative Humidity (0-100%)" value={telemetryInfo.humidity} min={0} max={10000} step={10} unit="%" displayScale={0.01} onChange={v => handleInfoChange('humidity', v)} />
                            <RangeInput id="hygro-temp" label="Temperature" tooltip="Temperature (centidegrees C)" value={telemetryInfo.temperature} min={-4000} max={8500} step={10} unit="°C" displayScale={0.01} onChange={v => handleInfoChange('temperature', v)} />
                        </div>
                    </div>
                )}

                {telemetryInfo.flags.hasGasSensor && (
                    <div className="bg-neutral-800/30 p-3 rounded border border-neutral-800/50">
                        <h5 className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-3">Gas Sensor Data</h5>
                        <div className="space-y-3">
                            <RangeInput id="gas-ppm" label="Gas Concentration" tooltip="Gas PPM (uint16)" value={telemetryInfo.gasPpm} min={0} max={65535} step={1} unit=" PPM" onChange={v => handleInfoChange('gasPpm', v)} />
                            <RangeInput id="gas-pres" label="Pressure" tooltip="Atmospheric Pressure (hPa)" value={telemetryInfo.pressureHpa} min={0} max={2000} step={1} unit=" hPa" onChange={v => handleInfoChange('pressureHpa', v)} />
                        </div>
                    </div>
                )}

                {telemetryInfo.flags.hasLuxSensor && (
                    <div className="bg-neutral-800/30 p-3 rounded border border-neutral-800/50">
                        <h5 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-3">Light Sensor Data</h5>
                        <RangeInput id="lux-val" label="Illuminance" tooltip="Light Intensity (Lux)" value={telemetryInfo.lux} min={0} max={65535} step={10} unit=" Lux" onChange={v => handleInfoChange('lux', v)} />
                    </div>
                )}

                {telemetryInfo.flags.hasUvSensor && (
                    <div className="bg-neutral-800/30 p-3 rounded border border-neutral-800/50">
                        <h5 className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-3">UV Sensor Data</h5>
                        <RangeInput id="uv-val" label="UV Index" tooltip="UV Index * 100" value={telemetryInfo.uvIndex} min={0} max={2000} step={1} unit="" displayScale={0.01} onChange={v => handleInfoChange('uvIndex', v)} />
                    </div>
                )}

                {telemetryInfo.flags.hasMovementSensor && (
                    <div className="bg-neutral-800/30 p-3 rounded border border-neutral-800/50">
                        <h5 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3">Movement Data</h5>
                        <RangeInput id="move-val" label="Magnitude" tooltip="Movement Magnitude (uint16)" value={telemetryInfo.movement} min={0} max={65535} step={10} unit="" onChange={v => handleInfoChange('movement', v)} />
                    </div>
                )}

                {telemetryInfo.flags.hasLocation && (
                    <div className="bg-neutral-800/30 p-3 rounded border border-neutral-800/50">
                        <h5 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-3">Location Data</h5>
                        <div className="space-y-3">
                            <RangeInput id="tel-lat" label="Latitude" tooltip="Latitude" value={telemetryInfo.location.latitude} min={-90} max={90} step={0.0001} unit="°" onChange={v => handleLocationChange('latitude', v)} />
                            <RangeInput id="tel-lon" label="Longitude" tooltip="Longitude" value={telemetryInfo.location.longitude} min={-180} max={180} step={0.0001} unit="°" onChange={v => handleLocationChange('longitude', v)} />
                            <RangeInput id="tel-alt" label="Altitude" tooltip="Altitude" value={telemetryInfo.location.altitude} min={-1000} max={20000} step={1} unit="m" onChange={v => handleLocationChange('altitude', v)} />
                            <div className="grid grid-cols-2 gap-3">
                                <RangeInput id="tel-sats" label="Satellites" tooltip="Sats" value={telemetryInfo.location.satellites} min={0} max={32} step={1} unit="" onChange={v => handleLocationChange('satellites', v)} />
                                <RangeInput id="tel-prec" label="Precision" tooltip="Precision" value={telemetryInfo.location.precisionRadius} min={0} max={25.5} step={0.1} unit="m" onChange={v => handleLocationChange('precisionRadius', v)} />
                            </div>
                        </div>
                    </div>
                )}

                {telemetryInfo.flags.isCustomData && (
                    <div>
                        <Label htmlFor="custom-data" tooltip="Custom raw data. Will fill remaining payload space.">Custom Data</Label>
                        <textarea
                            id="custom-data"
                            value={telemetryInfo.customData}
                            onChange={(e) => handleInfoChange('customData', e.target.value)}
                            rows={2}
                            maxLength={54 - 21}
                            className="mt-1 block w-full bg-slate-800 border-slate-700 rounded-md shadow-sm p-2 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono text-sm"
                        ></textarea>
                        <p className="text-[10px] text-right text-slate-500 mt-1">{new TextEncoder().encode(telemetryInfo.customData).length} / {54 - 21} bytes</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TelemetryPayloadBuilder;