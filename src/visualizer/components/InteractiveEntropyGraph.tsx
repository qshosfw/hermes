import React, { useState, useMemo } from 'react';
import InfoIcon from './icons/InfoIcon';

interface EntropyGraphProps {
  beforeData: Uint8Array;
  afterData: Uint8Array;
}

const calculateDistribution = (data: Uint8Array) => {
  let zeros = 0;
  let ones = 0;
  data.forEach(byte => {
    for (let i = 0; i < 8; i++) {
      if ((byte >> i) & 1) ones++;
      else zeros++;
    }
  });
  const total = zeros + ones;
  const zeroPercent = total > 0 ? (zeros / total) * 100 : 50;
  const onePercent = total > 0 ? (ones / total) * 100 : 50;
  return { zeros, ones, zeroPercent, onePercent };
};

const InteractiveEntropyGraph: React.FC<EntropyGraphProps> = ({ beforeData, afterData }) => {
  const [sliderValue, setSliderValue] = useState(50);

  const beforeDist = useMemo(() => calculateDistribution(beforeData), [beforeData]);
  const afterDist = useMemo(() => calculateDistribution(afterData), [afterData]);
  
  // Interpolated values for the text display
  const currentZeroPercent = beforeDist.zeroPercent + (afterDist.zeroPercent - beforeDist.zeroPercent) * (sliderValue / 100);
  const currentOnePercent = 100 - currentZeroPercent;

  return (
    <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-6 space-y-6 select-none">
      
      {/* Header / Legend */}
      <div className="flex justify-between items-center">
          <div className="flex gap-6 text-xs font-medium uppercase tracking-wider text-neutral-500">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-600 shadow-[0_0_8px_rgba(8,145,178,0.6)]"></div>
                <span>Logic '0'</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.6)]"></div>
                <span>Logic '1'</span>
            </div>
          </div>
          <div className="font-mono text-xs text-neutral-400 bg-neutral-800/50 px-2 py-1 rounded">
              {beforeData.length * 8} bits
          </div>
      </div>

      {/* Interactive Graph Container */}
      <div className="relative group pt-4 pb-2">
        
        {/* Label Overlays */}
        <div className="absolute top-0 left-0 text-[10px] uppercase font-bold text-neutral-600 tracking-wider">Before</div>
        <div className="absolute top-0 right-0 text-[10px] uppercase font-bold text-neutral-200 tracking-wider">After</div>

        {/* The Bar Container */}
        <div className="relative w-full h-16 rounded-lg overflow-hidden ring-1 ring-white/10 bg-neutral-950 shadow-inner">
            
            {/* Layer 1: Before State (Background) */}
            <div className="absolute inset-0 flex w-full h-full opacity-60 grayscale-[0.3] saturate-50">
                <div className="h-full bg-cyan-900/60 flex items-center justify-center relative overflow-hidden transition-all duration-300" style={{ width: `${beforeDist.zeroPercent}%` }}>
                    <span className="z-10 font-mono text-xs text-cyan-200/50 font-bold">{beforeDist.zeroPercent.toFixed(1)}%</span>
                     {/* Diagonal stripes pattern */}
                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.1)_75%,rgba(255,255,255,0.1)_100%)] bg-[length:8px_8px]"></div>
                </div>
                <div className="h-full bg-rose-900/60 flex items-center justify-center relative overflow-hidden transition-all duration-300" style={{ width: `${beforeDist.onePercent}%` }}>
                     <span className="z-10 font-mono text-xs text-rose-200/50 font-bold">{beforeDist.onePercent.toFixed(1)}%</span>
                      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.1)_75%,rgba(255,255,255,0.1)_100%)] bg-[length:8px_8px]"></div>
                </div>
            </div>

            {/* Layer 2: After State (Foreground, Clipped) */}
            <div 
                className="absolute inset-0 flex w-full h-full shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }} 
            >
                <div className="h-full bg-cyan-600 flex items-center justify-center transition-all duration-300 relative overflow-hidden" style={{ width: `${afterDist.zeroPercent}%` }}>
                    <span className="font-mono text-lg text-white font-bold drop-shadow-md z-10">{afterDist.zeroPercent.toFixed(1)}%</span>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                </div>
                <div className="h-full bg-rose-600 flex items-center justify-center transition-all duration-300 relative overflow-hidden" style={{ width: `${afterDist.onePercent}%` }}>
                    <span className="font-mono text-lg text-white font-bold drop-shadow-md z-10">{afterDist.onePercent.toFixed(1)}%</span>
                     <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                </div>
            </div>
            
            {/* Slider Handle Line */}
            <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] z-20 pointer-events-none"
                style={{ left: `${sliderValue}%` }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-10 bg-white rounded-md flex items-center justify-center shadow-lg ring-1 ring-black/20">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-neutral-800">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" /> 
                    </svg>
                </div>
            </div>
        </div>

        {/* Input Range (Invisible Overlay for interaction) */}
        <input 
            type="range" 
            min="0" 
            max="100" 
            value={sliderValue} 
            onChange={e => setSliderValue(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30 touch-none"
            aria-label="Whitening comparison slider"
        />
      </div>

       {/* Analysis Box */}
      <div className="border-t border-neutral-800 pt-4">
        <div className="flex items-start gap-3">
             <div className="p-2 bg-neutral-800 rounded-lg shrink-0">
                <InfoIcon className="w-5 h-5 text-neutral-400" />
             </div>
             <div className="space-y-1 text-sm text-neutral-400 leading-relaxed">
                  <p>
                      <span className="font-semibold text-neutral-200">Entropy Maximization:</span> 
                      Data whitening XORs the payload with a pseudo-random sequence (PN15). This breaks up long sequences of identical bits (e.g. 0x00 bytes become random-looking), ensuring sufficient signal transitions for the receiver's clock recovery.
                  </p>
                  <p className="text-xs pt-1">
                      Current View: <span className="text-cyan-400 font-mono font-bold">{currentZeroPercent.toFixed(1)}% Zeros</span> vs <span className="text-rose-400 font-mono font-bold">{currentOnePercent.toFixed(1)}% Ones</span>. 
                      Target is ~50/50.
                  </p>
             </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveEntropyGraph;