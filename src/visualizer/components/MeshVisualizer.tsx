import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import ResetIcon from './icons/ResetIcon';
import InfoIcon from './icons/InfoIcon';
import Slider from './Slider';

// --- SIMULATION TYPES ---
interface Node {
  id: number;
  x: number;
  y: number;
}

enum NodeState {
  Idle,
  Source,
  Destination,
  Listening,      // In suppression backoff period
  CSMA_Wait,      // Suppression period over, waiting for clear channel
  Transmitting,
  Suppressed,
  Done,
}

interface NodeStatus {
  state: NodeState;
  ttl: number;
  packetId: number | null;
  suppressionBackoffUntil: number; // Time until suppression check is over
  transmissionEndsAt: number; // Time until a transmission completes
  parentTxSourceId: number | null;
  csmaAttempts: number;
  csmaBackoffUntil: number;
}

interface Transmission {
  id: number;
  sourceNodeId: number;
  ttl: number;
  radius: number;
  maxRadius: number;
  initialTxPower: number;
  color: string;
  gradientId: string;
}

// --- SIMULATION CONSTANTS ---
const WIDTH = 800;
const HEIGHT = 500;
const MAX_SUPPRESSION_DELAY_MS = 600;
const TRANSMISSION_DURATION_MS = 300;
const BASE_CSMA_BACKOFF_MS = 20;
const NODE_RADIUS = 8;
const PROPAGATION_SPEED = 150; // pixels per second

// --- HELPER COMPONENTS ---
const ControlSlider: React.FC<{ label: string; value: number; min: number; max: number; step: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; unit?: string; }> =
  ({ label, value, min, max, step, onChange, unit }) => (
    <div className="flex-1 min-w-[120px]">
      <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-1 block">{label}: <span className="font-mono text-neutral-200">{value}{unit}</span></label>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} />
    </div>
  );

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="text-center bg-black border border-neutral-800 p-2 rounded-md">
    <div className="text-[10px] text-neutral-500 uppercase tracking-wide">{label}</div>
    <div className="text-xl font-bold font-mono text-neutral-200">{value}</div>
  </div>
);

// --- HELPER FUNCTIONS ---
const findFarthestNodes = (nodes: Node[]): { sourceId: number | null, destId: number | null } => {
    if (nodes.length < 2) return { sourceId: null, destId: null };
    let maxDist = -1;
    let bestPair = { sourceId: nodes[0].id, destId: nodes[1].id };

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
            if (dist > maxDist) {
                maxDist = dist;
                bestPair = { sourceId: nodes[i].id, destId: nodes[j].id };
            }
        }
    }
    return bestPair;
};

const gaussianRandom = (mean = 0, stdev = 1) => {
    let u = 1 - Math.random(); 
    let v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
};

const legendItems = [
  { state: 'Source', color: 'bg-sky-500' },
  { state: 'Destination', color: 'bg-emerald-500' },
  { state: 'Transmitting', color: 'bg-red-500' },
  { state: 'Listening', color: 'bg-amber-400' },
  { state: 'CSMA Wait', color: 'bg-orange-500' },
  { state: 'Suppressed', color: 'bg-purple-500' },
  { state: 'Idle', color: 'bg-neutral-600' },
  { state: 'Done', color: 'bg-neutral-400' },
];

// --- MAIN COMPONENT ---
const MeshVisualizer: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [settings, setSettings] = useState({ numNodes: 14, ttl: 5, txPower: 275, speed: 1, noise: 20 });
  const [simState, setSimState] = useState<'idle' | 'running' | 'paused' | 'succeeded' | 'failed'>('idle');
  const [sourceNodeId, setSourceNodeId] = useState<number | null>(null);
  const [destinationNodeId, setDestinationNodeId] = useState<number | null>(null);

  const nodeStatuses = useRef<Map<number, NodeStatus>>(new Map());
  const transmissions = useRef<Transmission[]>([]);
  const lastTimestamp = useRef<number>(0);
  const animationFrameId = useRef<number>(0);
  const nextPacketId = useRef<number>(0);

  const stats = useMemo(() => {
    let transmitting = 0, listening = 0, csma = 0, suppressed = 0;
    if (simState === 'idle' || simState === 'succeeded' || simState === 'failed') {
      return { transmitting: 0, listening: 0, csma: 0, suppressed: 0 };
    }

    for (const status of nodeStatuses.current.values()) {
      switch (status.state) {
        case NodeState.Transmitting: transmitting++; break;
        case NodeState.Listening: listening++; break;
        case NodeState.CSMA_Wait: csma++; break;
        case NodeState.Suppressed: suppressed++; break;
      }
    }
    return { transmitting, listening, csma, suppressed };
  }, [simState]);

  const [, forceUpdate] = useState({}); 
  
  const gradients = useMemo(() => {
    const colors = ['#0ea5e9']; // Sky blue base
    for(let i=0; i < settings.ttl; i++) {
        // Shift hue slightly for each TTL level
        colors.push(`hsl(${190 + (settings.ttl - i) * 15}, 90%, 60%)`);
    }
    return colors.map((color, i) => ({
      id: `grad-${i}`,
      color: color
    }));
  }, [settings.ttl]);


  const resetSimulation = useCallback(() => {
    setSimState('idle');
    const newNodes: Node[] = [];
    for (let i = 0; i < settings.numNodes; i++) {
      newNodes.push({
        id: i,
        x: Math.random() * (WIDTH - 40) + 20,
        y: Math.random() * (HEIGHT - 40) + 20,
      });
    }
    setNodes(newNodes);
    
    const { sourceId, destId } = findFarthestNodes(newNodes);
    setSourceNodeId(sourceId);
    setDestinationNodeId(destId);

    nodeStatuses.current.clear();
    newNodes.forEach(node => {
        let initialState = NodeState.Idle;
        if(node.id === sourceId) initialState = NodeState.Source;
        if(node.id === destId) initialState = NodeState.Destination;
      
        nodeStatuses.current.set(node.id, {
            state: initialState,
            ttl: 0,
            packetId: null,
            suppressionBackoffUntil: 0,
            transmissionEndsAt: 0,
            parentTxSourceId: null,
            csmaAttempts: 0,
            csmaBackoffUntil: 0,
        });
    });

    transmissions.current = [];
    lastTimestamp.current = 0;
    return { newSourceId: sourceId };
  }, [settings.numNodes]);

  useEffect(() => {
      const minNodes = 3, maxNodes = 25;
      const minPower = 200, maxPower = 350;
      const suggestedTxPower = Math.round(maxPower - ((settings.numNodes - minNodes) / (maxNodes - minNodes)) * (maxPower - minPower));
      setSettings(s => ({ ...s, txPower: suggestedTxPower }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.numNodes]);


  const gameLoop = useCallback((timestamp: number) => {
    if (simState !== 'running' || !lastTimestamp.current) {
      lastTimestamp.current = timestamp;
      animationFrameId.current = requestAnimationFrame(gameLoop);
      return;
    }

    const delta = (timestamp - lastTimestamp.current);
    if (delta < 16) { 
        animationFrameId.current = requestAnimationFrame(gameLoop);
        return;
    }
    const effectiveDelta = (delta / 1000) * settings.speed;
    lastTimestamp.current = timestamp;
    const now = performance.now();

    nodeStatuses.current.forEach((status) => {
        if (status.state === NodeState.Transmitting && now >= status.transmissionEndsAt) {
            status.state = NodeState.Done;
        }
        if (status.state === NodeState.Suppressed && now >= status.transmissionEndsAt) {
            status.state = NodeState.Done;
        }
    });

    transmissions.current = transmissions.current.filter(t => {
      t.radius += PROPAGATION_SPEED * effectiveDelta;
      return t.radius < t.maxRadius * 1.5; 
    });

    nodes.forEach(node => {
      const status = nodeStatuses.current.get(node.id);
      if (!status) return;
      
      const isReceptive = status.state === NodeState.Idle || (status.state === NodeState.Destination && status.packetId === null);
      
      if (isReceptive) {
        for (const tx of transmissions.current) {
          const sourceNode = nodes.find(n => n.id === tx.sourceNodeId);
          if(!sourceNode) continue;

          const dist = Math.hypot(node.x - sourceNode.x, node.y - sourceNode.y);
          if (dist <= tx.radius && dist <= tx.maxRadius && status.packetId !== tx.id) {
            
            if (node.id === destinationNodeId) {
                setSimState('succeeded');
                status.state = NodeState.Done;
                status.packetId = tx.id;
                break; 
            }

            if (tx.ttl > 0) {
              status.state = NodeState.Listening;
              status.ttl = tx.ttl - 1;
              
              const distanceRatio = Math.min(dist / tx.maxRadius, 1.0);
              const backoffDelay = (1.0 - distanceRatio) * MAX_SUPPRESSION_DELAY_MS;
              const gaussianNoise = Math.abs(gaussianRandom(0, 15)); 

              status.suppressionBackoffUntil = now + (backoffDelay + gaussianNoise) / settings.speed;
              
              status.packetId = tx.id;
              status.parentTxSourceId = tx.sourceNodeId;
            } else {
              status.state = NodeState.Done;
              status.packetId = tx.id;
            }
            break; 
          }
        }
      }

      if (status.state === NodeState.Listening) {
        let wasSuppressed = false;
        for (const tx of transmissions.current) {
          if (tx.id === status.packetId && tx.sourceNodeId !== node.id && tx.sourceNodeId !== status.parentTxSourceId) {
            const txNode = nodes.find(n => n.id === tx.sourceNodeId);
            if (!txNode) continue;
            const dist = Math.hypot(node.x - txNode.x, node.y - txNode.y);
            if (dist <= tx.radius) {
              status.state = NodeState.Suppressed;
              status.transmissionEndsAt = now + TRANSMISSION_DURATION_MS / settings.speed;
              wasSuppressed = true;
              break;
            }
          }
        }
        if(wasSuppressed) return;

        if (now >= status.suppressionBackoffUntil) {
            status.state = NodeState.CSMA_Wait;
            status.csmaAttempts = 0;
            status.csmaBackoffUntil = 0;
        }
      }
      
      if (status.state === NodeState.CSMA_Wait) {
          if (now < status.csmaBackoffUntil) {
              return; 
          }

          let isChannelClear = true;
          for (const tx of transmissions.current) {
            const txNode = nodes.find(n => n.id === tx.sourceNodeId);
            if (!txNode) continue;
            const dist = Math.hypot(node.x - txNode.x, node.y - txNode.y);
            if (dist < tx.radius) {
              isChannelClear = false;
              break;
            }
          }

          if (isChannelClear) {
            status.state = NodeState.Transmitting;
            status.transmissionEndsAt = now + TRANSMISSION_DURATION_MS / settings.speed;
            const newTxTTL = status.ttl;
            const color = `hsl(${190 + newTxTTL * 15}, 90%, 60%)`;
            
            transmissions.current.push({
              id: status.packetId!,
              sourceNodeId: node.id,
              ttl: newTxTTL,
              radius: 0,
              maxRadius: settings.txPower + (Math.random() - 0.5) * settings.noise,
              initialTxPower: settings.txPower,
              color: color,
              gradientId: `grad-${Math.min(newTxTTL, gradients.length -1)}`
            });

          } else {
            status.csmaAttempts++;
            const maxAttempts = 5; 
            const backoffDelay = (Math.random() * Math.pow(2, Math.min(status.csmaAttempts, maxAttempts)) * BASE_CSMA_BACKOFF_MS) / settings.speed;
            status.csmaBackoffUntil = now + backoffDelay;
          }
      }
    });
    
    if (simState === 'running' && transmissions.current.length === 0) {
      const activeNodes = Array.from(nodeStatuses.current.values()).some(s =>
        s.state === NodeState.Listening || s.state === NodeState.CSMA_Wait
      );
      if (!activeNodes) {
          const destStatus = destinationNodeId !== null ? nodeStatuses.current.get(destinationNodeId) : null;
          if (destStatus && destStatus.packetId === nextPacketId.current -1) {
               setSimState('succeeded');
          } else {
               setSimState('failed');
          }
      }
    }

    forceUpdate({});
    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [simState, nodes, settings.speed, settings.txPower, settings.noise, destinationNodeId, gradients.length]);


  const startSimulation = () => {
    const { newSourceId } = resetSimulation();
    if (newSourceId === null) return;

    setSimState('running');
    nextPacketId.current++;

    const sourceStatus = nodeStatuses.current.get(newSourceId);
    if (sourceStatus) {
      sourceStatus.state = NodeState.Transmitting;
      sourceStatus.ttl = settings.ttl;
      sourceStatus.packetId = nextPacketId.current;
      sourceStatus.transmissionEndsAt = performance.now() + TRANSMISSION_DURATION_MS / settings.speed;
      sourceStatus.csmaAttempts = 0;
      sourceStatus.csmaBackoffUntil = 0;
    }

    transmissions.current.push({
      id: nextPacketId.current,
      sourceNodeId: newSourceId,
      ttl: settings.ttl,
      radius: 0,
      maxRadius: settings.txPower + (Math.random() - 0.5) * settings.noise,
      initialTxPower: settings.txPower,
      color: `hsl(${190 + settings.ttl * 15}, 90%, 60%)`,
      gradientId: `grad-${settings.ttl}`
    });
  };

  useEffect(() => {
    if (simState === 'running') {
      animationFrameId.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [simState, gameLoop]);


  const getStateColor = (state: NodeState) => {
    switch (state) {
      case NodeState.Source: return 'fill-sky-500 stroke-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.5)]';
      case NodeState.Destination: return 'fill-emerald-500 stroke-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
      case NodeState.Transmitting: return 'fill-red-500 stroke-red-300 animate-pulse';
      case NodeState.Listening: return 'fill-amber-500 stroke-amber-300';
      case NodeState.CSMA_Wait: return 'fill-orange-500 stroke-orange-300';
      case NodeState.Suppressed: return 'fill-purple-500 stroke-purple-300';
      case NodeState.Done: return 'fill-neutral-400 stroke-neutral-200';
      default: return 'fill-neutral-700 stroke-neutral-500';
    }
  };

  return (
    <div className="space-y-4">
       <div className="relative bg-black rounded-lg overflow-hidden border border-neutral-800 shadow-inner">
            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full relative z-10">
                <defs>
                    {gradients.map(grad => (
                        <radialGradient key={grad.id} id={grad.id}>
                            <stop offset="0%" stopColor={grad.color} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={grad.color} stopOpacity="0" />
                        </radialGradient>
                    ))}
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {transmissions.current.map(tx => (
                    <circle
                        key={`${tx.id}-${tx.sourceNodeId}`}
                        cx={nodes.find(n => n.id === tx.sourceNodeId)?.x}
                        cy={nodes.find(n => n.id === tx.sourceNodeId)?.y}
                        r={tx.radius}
                        fill={`url(#${tx.gradientId})`}
                        style={{ mixBlendMode: 'screen' }}
                    />
                ))}

                {nodes.map(node => (
                    <circle
                        key={node.id}
                        cx={node.x}
                        cy={node.y}
                        r={NODE_RADIUS}
                        className={`${getStateColor(nodeStatuses.current.get(node.id)?.state ?? NodeState.Idle)} transition-all duration-300`}
                        strokeWidth="2"
                    />
                ))}
            </svg>
             {simState === 'succeeded' && <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[2px] flex items-center justify-center text-5xl font-bold text-emerald-300 tracking-wider">SUCCESS</div>}
             {simState === 'failed' && <div className="absolute inset-0 bg-red-500/10 backdrop-blur-[2px] flex items-center justify-center text-5xl font-bold text-red-300 tracking-wider">FAILED</div>}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat label="Transmitting" value={stats.transmitting} />
            <Stat label="Listening" value={stats.listening} />
            <Stat label="CSMA Wait" value={stats.csma} />
            <Stat label="Suppressed" value={stats.suppressed} />
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-xs pt-2">
          {legendItems.map(item => (
            <div key={item.state} className="flex items-center space-x-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color} shadow-sm`}></div>
              <span className="text-neutral-400 font-medium">{item.state}</span>
            </div>
          ))}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg space-y-4">
             <div className="flex flex-col sm:flex-row gap-6">
                <ControlSlider label="Nodes" value={settings.numNodes} min={3} max={25} step={1} onChange={e => setSettings(s => ({ ...s, numNodes: Number(e.target.value) }))} />
                <ControlSlider label="Start TTL" value={settings.ttl} min={1} max={10} step={1} onChange={e => setSettings(s => ({ ...s, ttl: Number(e.target.value) }))} />
                <ControlSlider label="TX Power" value={settings.txPower} min={100} max={400} step={10} onChange={e => setSettings(s => ({ ...s, txPower: Number(e.target.value) }))} unit="px" />
             </div>
             <div className="flex flex-col sm:flex-row gap-6">
                 <ControlSlider label="Sim Speed" value={settings.speed} min={0.5} max={4} step={0.1} onChange={e => setSettings(s => ({ ...s, speed: Number(e.target.value) }))} unit="x" />
                <ControlSlider label="Noise" value={settings.noise} min={0} max={100} step={5} onChange={e => setSettings(s => ({ ...s, noise: Number(e.target.value) }))} unit="px" />
             </div>
        </div>

        <div className="flex items-center justify-center space-x-4 pt-2">
            <button
                onClick={resetSimulation}
                className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-full text-white transition-colors border border-neutral-700 hover:border-neutral-600 shadow-sm"
                aria-label="Reset Simulation"
            >
                <ResetIcon className="w-5 h-5" />
            </button>

            {simState !== 'running' ? (
                <button
                    onClick={simState === 'paused' ? () => setSimState('running') : startSimulation}
                    className="p-4 bg-white hover:bg-neutral-200 rounded-full text-black transition-all shadow-lg hover:scale-105 active:scale-95"
                    aria-label={simState === 'paused' ? 'Resume Simulation' : 'Start Simulation'}
                >
                    <PlayIcon className="w-6 h-6" />
                </button>
            ) : (
                <button
                    onClick={() => setSimState('paused')}
                    className="p-4 bg-amber-500 hover:bg-amber-400 rounded-full text-black transition-all shadow-lg hover:scale-105 active:scale-95"
                    aria-label="Pause Simulation"
                >
                    <PauseIcon className="w-6 h-6" />
                </button>
            )}
        </div>

        <div className="text-left font-sans text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 p-3 rounded-md flex items-start space-x-3">
            <InfoIcon className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
                <span className="font-bold text-neutral-200">Simulation Logic:</span> A node receiving a packet enters 'Listening' mode, calculating a backoff inversely proportional to signal strength (SNR). If it hears a rebroadcast during this wait, it suppresses transmission. Otherwise, it attempts CSMA/CA to grab the channel.
            </div>
        </div>

    </div>
  );
};

export default MeshVisualizer;