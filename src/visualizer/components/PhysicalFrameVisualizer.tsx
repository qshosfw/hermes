import React from 'react';
import * as Hermes from '../services/hermesProtocol';
import Tooltip from './Tooltip';

interface PhysicalFrameVisualizerProps {
  preamble: Uint8Array;
  syncWord: Uint8Array;
  data: Uint8Array;
  isExpanded: boolean;
  onDataClick: () => void;
  onSectionClick: (section: 'Preamble' | 'Sync Word' | 'Header') => void;
  packetParts: {
    header: Uint8Array;
    payload: Uint8Array;
    signature: Uint8Array;
  }
}

const FrameSegment: React.FC<{
  label: string;
  bytes: Uint8Array;
  color: string;
  onClick?: () => void;
  isClickable?: boolean;
}> = ({ label, bytes, color, onClick, isClickable = true }) => {
  const byteLength = bytes.length;
  
  const tooltipContent = (
      <div className="flex flex-col gap-1">
          <div className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px] border-b border-neutral-800 pb-1 mb-1">{label}</div>
          <div className="font-mono text-white break-all leading-relaxed text-xs">
            {Hermes.bytesToHex(bytes.slice(0, 8))}
            {bytes.length > 8 ? '...' : ''}
        </div>
      </div>
  );

  return (
    <div className="flex-grow h-20" style={{ flexGrow: byteLength }}>
        <Tooltip content={tooltipContent} className="w-full h-full block">
            <div
            className={`h-full w-full flex flex-col items-center justify-center text-center p-2 group relative transition-all duration-300 ${color} ${isClickable ? 'cursor-pointer hover:brightness-110 shadow-md hover:shadow-lg' : ''} first:rounded-l-xl last:rounded-r-xl border-r border-black/10 last:border-0`}
            onClick={isClickable ? onClick : undefined}
            >
            <div className="relative z-10 flex flex-col items-center justify-center h-full">
                <div className="font-bold text-sm md:text-base text-white drop-shadow-sm tracking-tight">{label}</div>
                <div className="font-mono text-[10px] text-white/80 mt-1 bg-black/20 px-2 py-0.5 rounded-full">{byteLength} B</div>
            </div>
            </div>
        </Tooltip>
    </div>
  );
};

const DataBreakdown: React.FC<{ 
    packetParts: PhysicalFrameVisualizerProps['packetParts'],
    onSectionClick: PhysicalFrameVisualizerProps['onSectionClick']
}> = ({ packetParts, onSectionClick }) => (
    <div className="mt-6 animate-fade-in">
        <div className="flex justify-between items-center mb-3 px-1">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Data Frame Internal Structure</h4>
            <div className="h-px bg-neutral-800 flex-grow ml-4"></div>
        </div>
        <div className="flex w-full rounded-xl overflow-hidden shadow-lg ring-1 ring-white/5">
            <FrameSegment label="Header" bytes={packetParts.header} color="bg-indigo-600" onClick={() => onSectionClick('Header')} />
            <FrameSegment label="Payload" bytes={packetParts.payload} color="bg-emerald-600" isClickable={false} />
            <FrameSegment label="Signature" bytes={packetParts.signature} color="bg-purple-600" isClickable={false} />
            <FrameSegment label="RS Parity" bytes={new Uint8Array(32)} color="bg-rose-600" isClickable={false} />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-neutral-500 font-mono px-1">
            <span>26 Bytes</span>
            <span>54 Bytes</span>
            <span>16 Bytes</span>
            <span>32 Bytes</span>
        </div>
    </div>
);


const PhysicalFrameVisualizer: React.FC<PhysicalFrameVisualizerProps> = ({ preamble, syncWord, data, isExpanded, onDataClick, onSectionClick, packetParts }) => {
  const totalLength = preamble.length + syncWord.length + data.length;
  
  return (
    <div className="bg-neutral-900/30 p-6 rounded-xl border border-neutral-800">
        <div className="flex justify-between items-center mb-4 px-1">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Physical Frame Transmission Order</h4>
            <span className="font-mono text-xs text-neutral-400 bg-neutral-800 px-2 py-1 rounded-md border border-neutral-700">{totalLength} Bytes</span>
        </div>
      
      {/* Main Bar */}
      <div className="flex w-full rounded-xl overflow-hidden shadow-lg ring-1 ring-white/5">
        <FrameSegment label="Preamble" bytes={preamble} color="bg-amber-600" onClick={() => onSectionClick('Preamble')} />
        <FrameSegment label="Sync Word" bytes={syncWord} color="bg-lime-600" onClick={() => onSectionClick('Sync Word')} />
        <FrameSegment label="Interleaved Data" bytes={data} color="bg-cyan-600" onClick={onDataClick} />
      </div>
      
      <div className="mt-3 text-center">
          {!isExpanded && (
            <button onClick={onDataClick} className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center justify-center gap-1 mx-auto transition-colors">
                <span>Click Data block to inspect contents</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
            </button>
          )}
      </div>
      
      {isExpanded && <DataBreakdown packetParts={packetParts} onSectionClick={onSectionClick} />}
    </div>
  );
};

export default PhysicalFrameVisualizer;