import React from 'react';
import { bytesToHex, bytesToCallsign } from './hermesProtocol';
import InfoIcon from './icons/InfoIcon';

interface PingPayloadVisualizerProps {
  hopPath: Uint8Array[];
  isPong: boolean;
}

const PingPayloadVisualizer: React.FC<PingPayloadVisualizerProps> = ({ hopPath, isPong }) => {
  const maxHops = 9;
  const hopCount = hopPath.length;

  return (
    <div className="bg-neutral-900/30 p-6 rounded-xl border border-neutral-800 space-y-6">
      
      {/* Visual Route Flow */}
      <div>
         <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 pl-1">Route Trace</h4>
         {hopCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 bg-black/20 p-4 rounded-lg border border-neutral-800/50">
              {hopPath.map((hop, i) => (
                  <div key={`flow-${i}`} className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="relative group">
                          {/* Glow effect */}
                          <div className="absolute inset-0 bg-cyan-500/10 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          
                          <div className="relative bg-neutral-900 border border-cyan-500/30 text-cyan-200 pl-2 pr-3 py-1.5 rounded-full text-xs font-mono shadow-sm flex items-center gap-2 min-w-[80px] hover:border-cyan-500/60 transition-colors cursor-default">
                               <div className="w-5 h-5 rounded-full bg-cyan-950 flex items-center justify-center text-[9px] font-bold text-cyan-500 border border-cyan-900">
                                   {i + 1}
                               </div>
                               <div className="flex flex-col leading-none">
                                   <span className="font-bold tracking-tight text-[10px] text-cyan-100">{bytesToCallsign(hop) || 'UNKNOWN'}</span>
                                   <span className="text-[8px] text-cyan-500/70 mt-0.5">{bytesToHex(hop).slice(0, 5).replace(/\s/g, '')}...</span>
                               </div>
                          </div>
                          
                          {/* Tooltip for full hex */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-white text-[10px] rounded shadow-xl border border-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-mono">
                              {bytesToHex(hop)}
                          </div>
                      </div>
                      {i < hopCount - 1 && (
                           <svg className="w-4 h-4 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                           </svg>
                      )}
                  </div>
              ))}
            </div>
        ) : (
            <div className="flex items-center justify-center h-16 border-2 border-dashed border-neutral-800 rounded-lg text-neutral-600 text-xs uppercase tracking-wide bg-neutral-900/20">
                No hops recorded yet
            </div>
        )}
      </div>

      <div className="h-px bg-neutral-800 w-full"></div>

      {/* Memory Map Layout */}
      <div>
         <div className="flex justify-between items-center mb-3 px-1">
             <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Payload Memory Map (54 Bytes)</h4>
             <span className="text-[10px] font-mono text-neutral-600 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">6 bytes / slot</span>
         </div>
         <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-9 gap-2">
          {Array.from({ length: maxHops }).map((_, i) => {
            const hop = hopPath[i];
            const isActive = i < hopCount;
            
            return (
              <div 
                key={i} 
                className={`
                    relative p-2 rounded-lg border flex flex-col justify-between h-20 transition-all duration-300 overflow-hidden
                    ${isActive 
                        ? 'bg-cyan-900/10 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.05)]' 
                        : 'bg-neutral-900/20 border-neutral-800 opacity-60'
                    }
                `}
              >
                 <div className="flex justify-between items-start z-10">
                     <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-cyan-600' : 'text-neutral-700'}`}>
                        Slot {i}
                     </span>
                 </div>

                 <div className="flex flex-col items-center justify-center flex-grow gap-0.5 z-10">
                    {isActive ? (
                        <>
                             <span className="font-mono text-[10px] font-bold text-cyan-300 tracking-tighter">
                                {bytesToCallsign(hop) || 'UNK'}
                             </span>
                             <span className="font-mono text-[8px] text-cyan-500/70 break-all leading-none text-center">
                                {bytesToHex(hop).replace(/\s/g, '').slice(0, 6)}...
                             </span>
                        </>
                    ) : (
                        <span className="text-neutral-800 text-xl font-thin select-none">×</span>
                    )}
                 </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-start gap-3 bg-neutral-900 p-3 rounded-lg border border-neutral-800">
        <InfoIcon className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-400 leading-relaxed">
           <span className="font-semibold text-neutral-200">Protocol Behavior:</span>
           {isPong 
             ? " This frame is a PONG response. It carries the complete path discovered during the request, allowing the source to analyze the route."
             : " This frame is a PING request. As it travels through the mesh, each repeating node appends its own address to the next available slot in this payload."
           }
        </div>
      </div>
    </div>
  );
};

export default PingPayloadVisualizer;