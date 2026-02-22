'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Router, Zap, ShieldAlert, Cpu } from 'lucide-react';

// --- Types ---
type NodeStatus = 'IDLE' | 'RX_BACKOFF' | 'TX' | 'SUPPRESSED' | 'DONE';

interface MeshNode {
  id: number;
  x: number;
  y: number;
  status: NodeStatus;
  ttl: number;
  backoffTimer: number; // 0 to 100%
  snr: number; // For visualization
}

interface Edge {
  source: number;
  target: number;
  distance: number;
}

interface PacketFlying {
  id: string;
  sourceId: number;
  targetId: number;
  progress: number; // 0 to 1
  ttl: number;
}

const WIDTH = 900;
const HEIGHT = 500;
const CONST_RANGE = 180;

export default function AdvancedMeshSimulator() {
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [packets, setPackets] = useState<PacketFlying[]>([]);

  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState({ hops: 0, suppressed: 0, active: 0 });

  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Simulation state refs to avoid stale closures in RAF
  const stateRef = useRef({
    nodes: [] as MeshNode[],
    packets: [] as PacketFlying[],
    edges: [] as Edge[],
    metrics: { hops: 0, suppressed: 0, active: 0 }
  });

  const initializeNetwork = () => {
    setIsRunning(false);
    
    // 1. Generate random grid
    const newNodes: MeshNode[] = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: 50 + Math.random() * (WIDTH - 100),
      y: 50 + Math.random() * (HEIGHT - 100),
      status: 'IDLE',
      ttl: 0,
      backoffTimer: 0,
      snr: 0
    }));

    // Find a center node
    let centerNode = newNodes[0];
    let minD = Infinity;
    newNodes.forEach(n => {
      const d = Math.hypot(n.x - WIDTH/2, n.y - HEIGHT/2);
      if (d < minD) { minD = d; centerNode = n; }
    });
    
    // Select it as source
    centerNode.status = 'TX';
    centerNode.ttl = 7; // Max Hops

    // 2. Build explicit edges
    const newEdges: Edge[] = [];
    for (let i = 0; i < newNodes.length; i++) {
        for (let j = i + 1; j < newNodes.length; j++) {
            const dist = Math.hypot(newNodes[i].x - newNodes[j].x, newNodes[i].y - newNodes[j].y);
            if (dist < CONST_RANGE) {
                newEdges.push({ source: newNodes[i].id, target: newNodes[j].id, distance: dist });
                newEdges.push({ source: newNodes[j].id, target: newNodes[i].id, distance: dist }); // bidirectional logical
            }
        }
    }

    stateRef.current = {
      nodes: newNodes,
      edges: newEdges,
      packets: [],
      metrics: { hops: 1, suppressed: 0, active: 1 }
    };

    setNodes(newNodes);
    setEdges(newEdges);
    setPackets([]);
    setMetrics(stateRef.current.metrics);
  };

  useEffect(() => {
    initializeNetwork();
  }, []);

  const triggerLinkTraffic = (sourceNode: MeshNode) => {
      // Spawn flying packets on all outgoing edges
      const outgoingEdges = stateRef.current.edges.filter(e => e.source === sourceNode.id);
      
      const pks: PacketFlying[] = outgoingEdges.map(edge => ({
          id: `pk_${sourceNode.id}_${edge.target}_${Date.now()}_${Math.random()}`,
          sourceId: sourceNode.id,
          targetId: edge.target,
          progress: 0,
          ttl: sourceNode.ttl
      }));

      stateRef.current.packets.push(...pks);
  };

  const updateSimulation = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    if (!isRunning) {
        requestRef.current = requestAnimationFrame(updateSimulation);
        return;
    }

    let { nodes: currentNodes, packets: currentPackets, edges: currentEdges, metrics: currentMetrics } = stateRef.current;
    let anyActive = false;

    // 1. Process Flying Packets
    const remainingPackets: PacketFlying[] = [];
    currentPackets.forEach(p => {
        p.progress += (deltaTime * 0.001); // 1 second to cross link
        
        if (p.progress >= 1.0) {
            // Packet Reached Target
            const targetNode = currentNodes.find(n => n.id === p.targetId);
            if (targetNode) {
                if (targetNode.status === 'IDLE') {
                    // Start Backoff
                    targetNode.status = 'RX_BACKOFF';
                    targetNode.ttl = p.ttl - 1;
                    
                    // The closer the node (higher SNR), the shorter the delay. 
                    const edgeLength = currentEdges.find(e => e.source === p.sourceId && e.target === p.targetId)?.distance || CONST_RANGE;
                    const snrRank = 1 - (edgeLength / CONST_RANGE); // 1.0 = right next to it
                    targetNode.snr = snrRank;
                    // Timer starts higher if SNR is low (takes longer to reach 100)
                    targetNode.backoffTimer = snrRank * 80; // Starts closer to 100%
                } else if (targetNode.status === 'RX_BACKOFF') {
                    // Heard another broadcast while waiting -> Suppressed!
                    targetNode.status = 'SUPPRESSED';
                    currentMetrics.suppressed++;
                }
            }
        } else {
            remainingPackets.push(p);
            anyActive = true;
        }
    });

    currentPackets = remainingPackets;

    // 2. Process Node Backoff Timers
    currentNodes.forEach(node => {
        if (node.status === 'RX_BACKOFF') {
            anyActive = true;
            node.backoffTimer += (deltaTime * 0.05); // Advance timer
            
            if (node.backoffTimer >= 100) {
                node.backoffTimer = 100;
                
                if (node.ttl > 0) {
                    node.status = 'TX';
                    currentMetrics.hops++;
                    triggerLinkTraffic(node);
                } else {
                    node.status = 'DONE';
                }
            }
        } else if (node.status === 'TX') {
            anyActive = true;
            // Decay TX status rapidly
            node.backoffTimer -= (deltaTime * 0.1); 
            if (node.backoffTimer <= 0) {
                node.status = 'DONE';
            }
        }
    });

    if (!anyActive) setIsRunning(false);

    stateRef.current = { nodes: currentNodes, packets: currentPackets, edges: currentEdges, metrics: currentMetrics };
    
    // React state flush every few frames
    setNodes([...currentNodes]);
    setPackets([...currentPackets]);
    setMetrics({...currentMetrics});
    
    requestRef.current = requestAnimationFrame(updateSimulation);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateSimulation);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isRunning]);

  const handleStart = () => {
    if (!isRunning && stateRef.current.metrics.hops === 1) {
        // Initial blast
        const sourceNode = stateRef.current.nodes.find(n => n.status === 'TX');
        if (sourceNode) {
            sourceNode.backoffTimer = 100;
            triggerLinkTraffic(sourceNode);
        }
    }
    setIsRunning(true);
  };

  const getStatusColor = (status: NodeStatus) => {
      switch (status) {
          case 'IDLE': return 'text-neutral-500 bg-neutral-900 border-neutral-800';
          case 'RX_BACKOFF': return 'text-amber-500 bg-amber-950 border-amber-500';
          case 'TX': return 'text-sky-400 bg-sky-950 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)]';
          case 'SUPPRESSED': return 'text-purple-500 bg-purple-950/30 border-purple-900';
          case 'DONE': return 'text-emerald-500 bg-emerald-950/30 border-emerald-900';
      }
  };

  return (
    <div className="flex flex-col gap-6 w-full font-sans mb-8">
      {/* HUD Panel */}
      <div className="flex flex-col md:flex-row gap-4 bg-neutral-900/40 border border-neutral-800 p-4 rounded-xl shadow-lg">
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="bg-black/50 p-3 rounded-lg border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest flex items-center gap-1.5"><Zap className="w-3 h-3 text-sky-400"/> TX Hops</div>
                <div className="text-3xl font-mono text-white tracking-tighter mt-1">{metrics.hops}</div>
            </div>
            <div className="bg-black/50 p-3 rounded-lg border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest flex items-center gap-1.5"><ShieldAlert className="w-3 h-3 text-purple-400"/> Suppressed</div>
                <div className="text-3xl font-mono text-white tracking-tighter mt-1">{metrics.suppressed}</div>
            </div>
            <div className="bg-black/50 p-3 rounded-lg border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest flex items-center gap-1.5"><Cpu className="w-3 h-3 text-emerald-400"/> Mesh Cover</div>
                <div className="text-3xl font-mono text-white tracking-tighter mt-1">{Math.floor(((nodes.filter(n => n.status !== 'IDLE').length) / Math.max(1, nodes.length)) * 100)}%</div>
            </div>
          </div>
          
          <div className="flex gap-2 items-center justify-end">
              <button onClick={isRunning ? () => setIsRunning(false) : handleStart} className={`h-full px-8 flex items-center gap-2 font-bold uppercase tracking-widest rounded-lg transition-all ${isRunning ? 'bg-amber-500 text-amber-950 hover:bg-amber-400' : 'bg-white text-black hover:bg-neutral-200'}`}>
                  {isRunning ? <><Pause className="w-5 h-5"/> Pause</> : <><Play className="w-5 h-5"/> Boot</>}
              </button>
              <button onClick={initializeNetwork} className="h-full px-6 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-all flex items-center">
                  <RotateCcw className="w-5 h-5"/>
              </button>
          </div>
      </div>

      {/* Discrete Link Engine Canvas */}
      <div className="relative bg-black rounded-xl overflow-hidden border border-neutral-800 w-full aspect-[16/9] lg:aspect-[21/9]">
        
        {/* Abstract Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-full absolute inset-0 z-10" preserveAspectRatio="xMidYMid slice">
            
            {/* Edge Map (Drawn only once per render) */}
            <g opacity="0.15">
                {edges.map((e, idx) => {
                    const src = nodes.find(n => n.id === e.source)!;
                    const tgt = nodes.find(n => n.id === e.target)!;
                    // Only draw one direction for the static map
                    if (e.source > e.target) return null; 
                    return <line key={`l_${idx}`} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke="#64748b" strokeWidth="1" strokeDasharray="4 4"/>
                })}
            </g>

            {/* Flying Packets on Links */}
            {packets.map(p => {
                const src = nodes.find(n => n.id === p.sourceId)!;
                const tgt = nodes.find(n => n.id === p.targetId)!;
                const cx = src.x + (tgt.x - src.x) * p.progress;
                const cy = src.y + (tgt.y - src.y) * p.progress;
                return (
                    <circle key={p.id} cx={cx} cy={cy} r={3} fill="#38bdf8" className="drop-shadow-[0_0_8px_rgba(56,189,248,1)]" />
                );
            })}

        </svg>

        {/* DOM-based Nodes for complex UI (Progress bars) */}
        <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
            {nodes.map(node => (
                <div key={node.id} 
                     className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-md border flex items-center justify-center transition-colors duration-300 ${getStatusColor(node.status)}`}
                     style={{ left: `${(node.x / WIDTH) * 100}%`, top: `${(node.y / HEIGHT) * 100}%` }}>
                    
                    <Router className="w-4 h-4" />
                    
                    {/* Floating TTL Label */}
                    {(node.status === 'RX_BACKOFF' || node.status === 'TX' || node.status === 'DONE' || node.status === 'SUPPRESSED') && (
                        <div className="absolute -top-5 text-[9px] font-mono font-bold bg-black/80 px-1 rounded shadow text-neutral-300">
                            TTL:{node.ttl}
                        </div>
                    )}

                    {/* SNR Backoff Progress Bar */}
                    {node.status === 'RX_BACKOFF' && (
                        <div className="absolute -bottom-2.5 w-10 h-1 bg-black rounded-full overflow-hidden border border-neutral-800">
                            <div className="h-full bg-amber-400 transition-all ease-linear" style={{ width: `${node.backoffTimer}%` }}/>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

    </div>
  );
}
