'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, RotateCcw, Router, Zap, ShieldAlert, Activity, Wifi, Layers, Settings2, BarChart3, Signal, Eye, ActivitySquare } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// --- Types & Interfaces ---
type NodeState = 'IDLE' | 'RX_SYNC' | 'CCA' | 'BACKOFF' | 'TX' | 'SUPPRESSED' | 'DONE';
type TopologyState = 'RANDOM' | 'DENSE' | 'LINE' | 'HIDDEN' | 'RURAL';
type ViewMode = 'WAVES' | 'HEATMAP' | 'LINKS' | 'COVERAGE';

interface MeshNode {
  id: number;
  x: number;
  y: number;
  state: NodeState;

  // Protocol State
  ttl: number;
  packetId: number | null;
  rxSnr: number;

  // Timers (Absolute timestamps in ms)
  stateEndsAt: number;

  // CSMA State
  csmaAttempts: number;
  backoffDuration: number;

  // Analytics
  receptionTime: number | null; // For latency tracking
}

interface Transmission {
  id: string;
  packetId: number;
  sourceId: number;
  x: number;
  y: number;
  radius: number;
  ttl: number;
  powerDbm: number;
  startTime: number;
}

interface SimAnalytics {
  time: number;
  delivered: number;
  suppressed: number;
  collisions: number;
  airtime: number;
}

// --- Constants (Scaled for 60fps Web Animation) ---
const WIDTH = 900;
const HEIGHT = 500;

// Timing Constants
const TX_DURATION_MS = 1000;
const CCA_DURATION_MS = 50;
const MIN_BACKOFF_MS = 50;
const MAX_SNR_PENALTY_MS = 800;
const JITTER_WINDOW_MS = 100;
const VISUAL_WAVE_SPEED = 800;

// Math Constants
const SIGMOID_KNEE_DB = 11;

// --- Helper Math ---
// Fast Integer Sigmoid curve from LQI RFC
const calculateLQI = (snr: number): number => {
  const M = 6;
  const K = 2;
  const P = 127 + ((snr - M) * 128) / (Math.abs(snr - M) + K);
  return Math.max(0, Math.min(255, P));
};

// Generic Gaussian 
const gaussianRandom = (mean = 0, stdev = 1) => {
  let u = 1 - Math.random(), v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
};

// Heatmap Color scale (Jet approximation) returning RGBA array for ImageData
const getHeatmapColorRGBA = (dbm: number, noiseFloor: number): [number, number, number, number] => {
  const min = noiseFloor;
  const max = -30; // Max visual hotness
  let ratio = (dbm - min) / (max - min);
  ratio = Math.max(0, Math.min(1, ratio));

  // SDR Waterfall Colormap: Deep Blue -> Cyan -> Green -> Yellow -> Red
  let r = 0, g = 0, b = 0;
  if (ratio < 0.25) {
    b = 255;
    g = ratio * 4 * 255;
  } else if (ratio < 0.5) {
    g = 255;
    b = (1 - (ratio - 0.25) * 4) * 255;
  } else if (ratio < 0.75) {
    g = 255;
    r = ((ratio - 0.5) * 4) * 255;
  } else {
    r = 255;
    g = (1 - (ratio - 0.75) * 4) * 255;
  }

  // Opacity: fade out hard near noise floor to reveal grid
  let a = dbm < (noiseFloor + 2) ? 0 : 180;
  if (dbm > max) a = 220;

  return [Math.round(r), Math.round(g), Math.round(b), a];
};


export default function MeshVisualizer() {
  // --- UI Config State ---
  const [topology, setTopology] = useState<TopologyState>('RANDOM');
  const [viewMode, setViewMode] = useState<ViewMode>('WAVES');

  const [numNodes, setNumNodes] = useState([25]);
  const [txPower, setTxPower] = useState([22]); // dBm
  const [ambientNoise, setAmbientNoise] = useState([-115]); // dBm absolute
  const [pathLossExp, setPathLossExp] = useState([2.7]); // Environmental path loss
  const [fadingVar, setFadingVar] = useState([2.0]); // Shadowing variance in dB
  const [rxSensitivity, setRxSensitivity] = useState([-105]); // dBm receiver failure point
  const [simSpeed, setSimSpeed] = useState([0.65]); // Default to a slightly slower analytical speed

  // --- Dynamic Engine State ---
  const [isRunning, setIsRunning] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<SimAnalytics[]>([]);

  // Engine State Refs (To avoid stale closures in RAF)
  const stateRef = useRef({
    nodes: [] as MeshNode[],
    waves: [] as Transmission[],
    nextPacketId: 1,
    lastTickTime: 0,
    startTime: 0,
    metrics: { txCount: 0, suppressedCount: 0, collisions: 0 },
    gridHeatmap: new Float32Array(Math.floor(WIDTH / 10) * Math.floor(HEIGHT / 10))
  });

  const [renderCounter, setRenderCounter] = useState(0);
  const rafRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Path Loss & Received Power Equation ---
  const calculateReceivedPower = useCallback((txPowerDbm: number, distancePx: number): number => {
    if (distancePx < 1) return txPowerDbm;
    // Log-distance path loss model: PL(d) = PL(d0) + 10 * y * log10(d/d0) + X_sigma
    // We scale pixels to abstract meters. 1 pixel = 4 meters. (900px canvas = 3.6 kilometers)
    const distMeters = distancePx * 4;

    // Reference Path Loss at 1 meter for ~433MHz is ~25dB. We use 40dB for a better visual gradient spread across the 900px canvas.
    const referenceLoss = 40;

    // Smooth interpolation for sub-1-meter distances to avoid negative log values
    const loss = distMeters >= 1 ? referenceLoss + 10 * pathLossExp[0] * Math.log10(distMeters) : referenceLoss * distMeters;

    const shadowing = gaussianRandom(0, fadingVar[0]);
    return txPowerDbm - loss - shadowing;
  }, [pathLossExp, fadingVar]);

  // --- Network Generation ---
  const initNetwork = useCallback(() => {
    setIsRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    let count = numNodes[0];
    let newNodes: MeshNode[] = [];

    const createNode = (id: number, x: number, y: number) => ({
      id, x, y,
      state: 'IDLE' as NodeState,
      ttl: 0, packetId: null, rxSnr: 0, stateEndsAt: 0,
      csmaAttempts: 0, backoffDuration: 0, receptionTime: null
    });

    if (topology === 'RANDOM' || topology === 'RURAL') {
      const margin = topology === 'RURAL' ? 100 : 40;
      count = topology === 'RURAL' ? Math.min(15, count) : count;
      for (let i = 0; i < count; i++) {
        newNodes.push(createNode(i, margin + Math.random() * (WIDTH - margin * 2), margin + Math.random() * (HEIGHT - margin * 2)));
      }
    } else if (topology === 'DENSE') {
      count = Math.max(30, count);
      for (let i = 0; i < count; i++) {
        newNodes.push(createNode(i, WIDTH / 2 + gaussianRandom(0, 80), HEIGHT / 2 + gaussianRandom(0, 80)));
      }
    } else if (topology === 'LINE') {
      count = Math.min(12, count);
      const stepX = (WIDTH - 100) / count;
      let y = HEIGHT / 2;
      for (let i = 0; i < count; i++) {
        newNodes.push(createNode(i, 50 + (i * stepX), y + gaussianRandom(0, 15)));
      }
    } else if (topology === 'HIDDEN') {
      count = Math.max(10, count);
      const half = Math.floor(count / 2);
      // Left cluster
      for (let i = 0; i < half; i++) newNodes.push(createNode(i, 150 + gaussianRandom(0, 30), HEIGHT / 2 + gaussianRandom(0, 30)));
      // Right cluster
      for (let i = half; i < count - 1; i++) newNodes.push(createNode(i, WIDTH - 150 + gaussianRandom(0, 30), HEIGHT / 2 + gaussianRandom(0, 30)));
      // Bridge node in exact middle
      newNodes.push(createNode(count - 1, WIDTH / 2, HEIGHT / 2));
    }

    stateRef.current = {
      nodes: newNodes,
      waves: [],
      nextPacketId: 1,
      lastTickTime: performance.now(),
      startTime: 0,
      metrics: { txCount: 0, suppressedCount: 0, collisions: 0 },
      gridHeatmap: new Float32Array(Math.floor(WIDTH / 10) * Math.floor(HEIGHT / 10))
    };

    setAnalyticsData([]);
    setRenderCounter(c => c + 1);
  }, [numNodes, topology]);

  useEffect(() => { initNetwork(); }, [topology, numNodes, initNetwork]);

  // --- Heatmap Computation ---
  // High quality heatmap using ImageData for pixel-perfect smooth gradients
  const HEATMAP_RES = 4; // Downscale factor for performance (render every 4th pixel, let canvas blur the rest)
  const updateHeatmap = () => {
    if (viewMode !== 'HEATMAP') return;
    const { waves, gridHeatmap } = stateRef.current;

    // Using a 1D Float32Array to store the dBm values of the downscaled grid
    const cols = Math.ceil(WIDTH / HEATMAP_RES);
    const rows = Math.ceil(HEIGHT / HEATMAP_RES);

    if (gridHeatmap.length !== cols * rows) {
      stateRef.current.gridHeatmap = new Float32Array(cols * rows);
    }

    stateRef.current.gridHeatmap.fill(ambientNoise[0]);
    if (waves.length === 0) return;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * HEATMAP_RES;
        const py = y * HEATMAP_RES;
        let sumWatts = Math.pow(10, ambientNoise[0] / 10);

        for (const w of waves) {
          const dist = Math.hypot(px - w.x, py - w.y);
          // Radio energy arrives instantly (Speed of Light). The visual ring radius is simply decorative.
          const pDbm = calculateReceivedPower(w.powerDbm, dist);
          sumWatts += Math.pow(10, pDbm / 10);
        }
        stateRef.current.gridHeatmap[y * cols + x] = 10 * Math.log10(sumWatts);
      }
    }
  };


  // --- Core Simulation Engine (Tick) ---
  const gameTick = useCallback((timestamp: number) => {
    if (!isRunning) return;

    const deltaMs = (timestamp - stateRef.current.lastTickTime) * simSpeed[0];
    stateRef.current.lastTickTime = timestamp;
    const t = timestamp;
    const runtime = timestamp - stateRef.current.startTime;

    const { nodes, waves, metrics } = stateRef.current;
    const noiseDbm = ambientNoise[0];
    const threshold = rxSensitivity[0];

    // 1. Expand waves
    stateRef.current.waves = waves.filter(w => {
      w.radius += (VISUAL_WAVE_SPEED * (deltaMs / 1000)) * simSpeed[0];
      return (t - w.startTime) * simSpeed[0] < TX_DURATION_MS;
    });

    // 2. MAC State Machine
    let activeNodeCount = 0;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      let strongestSignalDbm = noiseDbm;
      let activeIncomingWaves: { wave: Transmission, rxPower: number }[] = [];

      for (const w of stateRef.current.waves) {
        if (w.sourceId === n.id) continue;
        const dist = Math.hypot(n.x - w.x, n.y - w.y);

        // Physics: The moment a packet starts transmitting, its energy field exists everywhere instantly.
        // We completely ignore the visual w.radius for Carrier Sensing to prevent "Speed of Light vs Web Graphics" paradoxes.
        const rxPower = calculateReceivedPower(w.powerDbm, dist);
        if (rxPower >= threshold) {
          activeIncomingWaves.push({ wave: w, rxPower });
          if (rxPower > strongestSignalDbm) strongestSignalDbm = rxPower;
        }
      }

      const snr = strongestSignalDbm - noiseDbm;
      const isChannelBusy = snr > 5;

      // Collision!
      if (activeIncomingWaves.length > 1 && n.state === 'RX_SYNC') {
        activeIncomingWaves.sort((a, b) => b.rxPower - a.rxPower);
        const sir = activeIncomingWaves[0].rxPower - activeIncomingWaves[1].rxPower;
        if (sir < 10) {
          metrics.collisions++;
          n.state = 'IDLE';
        }
      }

      switch (n.state) {
        case 'IDLE':
          if (activeIncomingWaves.length > 0) {
            const dominant = activeIncomingWaves[0];
            if (snr >= SIGMOID_KNEE_DB && dominant.wave.packetId !== n.packetId && dominant.wave.ttl > 0) {
              n.state = 'RX_SYNC';
              n.rxSnr = snr;
              n.packetId = dominant.wave.packetId;
              n.ttl = dominant.wave.ttl - 1;
              n.stateEndsAt = dominant.wave.startTime + TX_DURATION_MS;
              n.receptionTime = runtime;
              activeNodeCount++;
            }
          }
          break;

        case 'RX_SYNC':
          activeNodeCount++;
          if (snr > n.rxSnr) n.rxSnr = snr;

          if (t >= n.stateEndsAt) {
            // Transport RFC 02-routing-flooding.mdx Section 2.2 SNR-Weighted Backoff Equation
            const base = 30; // Base delay floor
            let penalty = 0;
            if (n.rxSnr < 20) {
              penalty = (20 - n.rxSnr) * 10;
            }
            const ttlBonus = (n.ttl < 3) ? 20 : 0;
            const jitter = Math.random() * 30;

            n.backoffDuration = base + penalty - ttlBonus + jitter;
            n.stateEndsAt = t + n.backoffDuration;
            n.csmaAttempts = 0;
            n.state = 'BACKOFF';
          }
          break;

        case 'BACKOFF':
          activeNodeCount++;
          // CSMA/CA Carrier Sense: If channel is busy, we must evaluate suppression and pause the timer!
          if (isChannelBusy) {
            // 1. Rebroadcast Suppression Check
            // We must find a wave transmitting our packet whose startTime is AFTER we began our backoff.
            // Because the timer pauses (stretching stateEndsAt), our original start time is ALWAYS (stateEndsAt - backoffDuration).
            const newRetransmission = activeIncomingWaves.find(w => {
              return w.wave.packetId === n.packetId && w.wave.startTime >= (n.stateEndsAt - n.backoffDuration);
            });

            if (newRetransmission) {
              n.state = 'SUPPRESSED';
              n.stateEndsAt = t + 2000;
              metrics.suppressedCount++;
              break;
            }

            // 2. CSMA Pausing
            // If the channel is busy with something else, standard CSMA/CA dictates we PAUSE the backoff countdown
            // until the medium is idle again. We achieve this by pushing the end time out by exactly the delta.
            n.stateEndsAt += deltaMs;
          }

          if (t >= n.stateEndsAt) {
            n.state = 'CCA';
            n.stateEndsAt = t + CCA_DURATION_MS;
          }
          break;

        case 'CCA':
          activeNodeCount++;
          if (isChannelBusy) {
            n.csmaAttempts++;

            // Transport RFC 03-flow-control.mdx CSMA Exponential Backoff
            let cwMin = 50 * Math.pow(2, n.csmaAttempts);
            let cwMax = 200 * Math.pow(2, n.csmaAttempts);

            // Clamp to maximum contention window
            if (cwMin > 1000) cwMin = 1000;
            if (cwMax > 5000) cwMax = 5000;

            const backoff = cwMin + Math.random() * (cwMax - cwMin);
            const jitter = Math.random() * 100;
            const totalDelay = backoff + jitter;

            n.state = 'BACKOFF';
            n.backoffDuration = totalDelay;
            n.stateEndsAt = t + totalDelay;
          } else if (t >= n.stateEndsAt) {
            n.state = 'TX';
            n.stateEndsAt = t + TX_DURATION_MS;
            metrics.txCount++;
            stateRef.current.waves.push({
              id: `wave_${n.id}_${t}`,
              packetId: n.packetId!,
              sourceId: n.id,
              x: n.x, y: n.y,
              radius: 0,
              ttl: n.ttl,
              powerDbm: txPower[0],
              startTime: t
            });
          }
          break;

        case 'TX':
          activeNodeCount++;
          if (t >= n.stateEndsAt) n.state = 'DONE';
          break;

        case 'SUPPRESSED':
        case 'DONE':
          if (t >= n.stateEndsAt) { /* Soft reset */ }
          break;
      }
    }

    updateHeatmap();

    // End Condition & Analytics tracking 
    if (Math.floor(runtime) % 100 < 20) {
      // Sample every ~100ms
      const delivered = nodes.filter(n => n.packetId !== null).length;
      setAnalyticsData(prev => {
        if (prev.length > 0 && Math.abs(prev[prev.length - 1].time - runtime) < 50) return prev;
        return [...prev, {
          time: Math.floor(runtime),
          delivered,
          suppressed: metrics.suppressedCount,
          collisions: metrics.collisions,
          airtime: Math.floor((metrics.txCount * TX_DURATION_MS) / (runtime || 1) * 100)
        }];
      });
    }

    if (activeNodeCount === 0 && stateRef.current.waves.length === 0) {
      setIsRunning(false);
    }

    setRenderCounter(c => c + 1);
    rafRef.current = requestAnimationFrame(gameTick);
  }, [isRunning, simSpeed, txPower, ambientNoise, pathLossExp, fadingVar, rxSensitivity, calculateReceivedPower]);

  useEffect(() => {
    if (isRunning) {
      stateRef.current.lastTickTime = performance.now();
      if (stateRef.current.startTime === 0) stateRef.current.startTime = performance.now();
      rafRef.current = requestAnimationFrame(gameTick);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isRunning, gameTick]);

  // --- HTML Canvas Rendering for Heatmap ---
  useEffect(() => {
    if (viewMode !== 'HEATMAP' || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { gridHeatmap } = stateRef.current;
    const cols = Math.ceil(WIDTH / 4); // Matched to HEATMAP_RES
    const rows = Math.ceil(HEIGHT / 4);

    if (gridHeatmap.length === 0 || gridHeatmap.length !== cols * rows) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Create an image data buffer for smooth rendering without blocky borders
    const idata = ctx.createImageData(cols, rows);
    const data = idata.data;

    for (let i = 0; i < gridHeatmap.length; i++) {
      const valDbm = gridHeatmap[i];
      const [r, g, b, a] = getHeatmapColorRGBA(valDbm, ambientNoise[0]);
      const idx = i * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }

    // Draw the downscaled heatmap buffer onto an offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = cols;
    offscreen.height = rows;
    offscreen.getContext('2d')?.putImageData(idata, 0, 0);

    // Scale it up with smoothing enabled for high-quality gradient interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, WIDTH, HEIGHT);

  }, [viewMode, renderCounter, ambientNoise]);

  // --- Handlers ---
  const handleStart = () => {
    if (isRunning) return;

    if (stateRef.current.waves.length === 0 && stateRef.current.nodes.every(n => n.state === 'DONE' || n.state === 'SUPPRESSED' || n.state === 'IDLE')) {
      const { nodes } = stateRef.current;
      nodes.forEach(n => { n.state = 'IDLE'; n.packetId = null; n.receptionTime = null; });
      stateRef.current.nextPacketId++;
      stateRef.current.metrics = { txCount: 0, suppressedCount: 0, collisions: 0 };
      setAnalyticsData([]);
      stateRef.current.startTime = performance.now();
    }

    // Trigger Node 0
    const { nodes, nextPacketId } = stateRef.current;
    let source = nodes[0];
    if (topology === 'LINE' || topology === 'RURAL') {
      source = nodes.reduce((acc, curr) => (curr.x < acc.x ? curr : acc), nodes[0]);
    }

    source.state = 'TX';
    source.packetId = nextPacketId;
    source.ttl = 7;
    source.rxSnr = 99;
    source.receptionTime = 0;
    source.stateEndsAt = performance.now() + TX_DURATION_MS;

    stateRef.current.metrics.txCount++;
    stateRef.current.waves.push({
      id: `init_${source.id}`,
      packetId: nextPacketId,
      sourceId: source.id,
      x: source.x, y: source.y,
      radius: 0,
      ttl: source.ttl,
      powerDbm: txPower[0],
      startTime: performance.now()
    });

    setIsRunning(true);
    setRenderCounter(c => c + 1);
  };

  const { nodes, waves, metrics } = stateRef.current;
  const deliveryRatio = nodes.length > 1 ? (nodes.filter(n => n.packetId !== null).length / nodes.length) * 100 : 0;

  const getNodeColor = (state: NodeState) => {
    switch (state) {
      case 'IDLE': return 'bg-neutral-800 text-neutral-400 border-neutral-700';
      case 'RX_SYNC': return 'bg-cyan-500 text-cyan-50 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)]';
      case 'BACKOFF': return 'bg-amber-600 text-amber-50 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]';
      case 'CCA': return 'bg-yellow-400 text-yellow-900 border-yellow-300';
      case 'TX': return 'bg-emerald-500 text-emerald-50 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.8)]';
      case 'SUPPRESSED': return 'bg-purple-900 text-purple-300 border-purple-800 shadow-[0_0_10px_rgba(147,51,234,0.4)]';
      case 'DONE': return 'bg-emerald-950 text-emerald-500 border-emerald-900';
      default: return 'bg-neutral-800 border-neutral-700';
    }
  };

  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-background shadow-xl font-sans text-sm">
      {/* Simulation Toolbar */}
      <div className="bg-muted p-4 border-b border-border flex gap-4 items-center flex-wrap">
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={isRunning ? () => setIsRunning(false) : handleStart}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${isRunning ? 'bg-amber-500 text-amber-950 hover:bg-amber-400' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
          >
            {isRunning ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Flood</>}
          </button>
          <button onClick={initNetwork} className="px-4 py-2.5 rounded-lg font-medium text-xs flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>

        <div className="h-8 w-px bg-border hidden md:block mx-2"></div>

        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2 min-w-32">
            <Layers className="w-4 h-4 text-muted-foreground mr-1" />
            <Select value={topology} onValueChange={(v: TopologyState) => setTopology(v)}>
              <SelectTrigger className="h-9 w-[140px] text-xs font-medium bg-background">
                <SelectValue placeholder="Topology" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RANDOM">Rand Scatter</SelectItem>
                <SelectItem value="DENSE">Dense Urban</SelectItem>
                <SelectItem value="LINE">Line String</SelectItem>
                <SelectItem value="HIDDEN">Hidden Node</SelectItem>
                <SelectItem value="RURAL">Sparse Rural</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 min-w-32">
            <Eye className="w-4 h-4 text-muted-foreground mr-1" />
            <Select value={viewMode} onValueChange={(v: ViewMode) => setViewMode(v)}>
              <SelectTrigger className="h-9 w-[130px] text-xs font-medium bg-background">
                <SelectValue placeholder="View Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WAVES">Physical Waves</SelectItem>
                <SelectItem value="HEATMAP">RSSI Heatmap</SelectItem>
                <SelectItem value="LINKS">Logical Links (SNR &gt; 5dB)</SelectItem>
                <SelectItem value="COVERAGE">Theoretical Coverage</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-[500px] lg:h-[600px] overflow-hidden">

        {/* Left: Physics Engine Viewport */}
        <div className="flex-1 relative bg-[#09090b] overflow-hidden border-b lg:border-b-0 lg:border-r border-border h-[400px] lg:h-full shrink-0 lg:shrink">
          {/* Grid Map Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px]" />

          {/* Heatmap Canvas */}
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300 ${viewMode === 'HEATMAP' ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Logical Links Canvas (Approximated LoS) */}
          {viewMode === 'LINKS' && (
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40">
              {nodes.map(n1 => nodes.map(n2 => {
                if (n1.id >= n2.id) return null;
                const d = Math.hypot(n1.x - n2.x, n1.y - n2.y);
                const snr = calculateReceivedPower(txPower[0], d) - ambientNoise[0];
                if (snr < 5) return null;
                return <line key={`${n1.id}-${n2.id}`} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              }))}
            </svg>
          )}

          {/* Theoretical Coverage Canvas (Max Range Rings) */}
          {viewMode === 'COVERAGE' && (
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-20">
              {nodes.map(n => {
                // Calculate theoretical max range where SNR = 0 (Ignoring fading variance for clean circles)
                // log10(d) = (txPower - rxSensitivity - referenceLoss) / (10 * pathLossExp)
                const maxRangeMeters = Math.pow(10, (txPower[0] - rxSensitivity[0] - 40) / (10 * pathLossExp[0]));
                const maxRangePx = maxRangeMeters / 4;
                return (
                  <circle
                    key={`cov-${n.id}`} cx={n.x} cy={n.y} r={maxRangePx}
                    fill="rgba(16, 185, 129, 0.02)" stroke="rgb(16, 185, 129)" strokeWidth="1" strokeDasharray="4 4"
                  />
                );
              })}
            </svg>
          )}

          {/* RF Waves Canvas */}
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={`absolute inset-0 w-full h-full pointer-events-none z-10 transition-opacity ${viewMode === 'WAVES' ? 'opacity-100' : 'opacity-20'}`}>
            <defs>
              <radialGradient id="txWave" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                <stop offset="85%" stopColor="#10b981" stopOpacity="0.05" />
                <stop offset="98%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
              </radialGradient>
            </defs>
            {waves.map((w) => (
              <circle
                key={w.id} cx={w.x} cy={w.y} r={w.radius}
                fill="url(#txWave)" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1"
              />
            ))}

            {/* Physical Distance Legend (1 Kilometer = 1000 meters = 250 pixels) */}
            <g className="opacity-50 text-[10px] font-mono fill-white" transform={`translate(20, ${HEIGHT - 20})`}>
              <line x1="0" y1="0" x2="250" y2="0" stroke="white" strokeWidth="1" />
              <line x1="0" y1="-4" x2="0" y2="4" stroke="white" strokeWidth="1" />
              <line x1="125" y1="-3" x2="125" y2="3" stroke="white" strokeWidth="1" opacity="0.5" />
              <line x1="250" y1="-4" x2="250" y2="4" stroke="white" strokeWidth="1" />
              <text x="125" y="-8" textAnchor="middle" className="tracking-widest font-semibold uppercase opacity-90 drop-shadow-md">1 Kilometer</text>
            </g>
          </svg>

          {/* Nodes DOM Layer for crisp rendering */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {nodes.map(n => {
              const T = performance.now();
              let progress = 0;
              if (n.state === 'BACKOFF') {
                const remaining = n.stateEndsAt - T;
                progress = Math.max(0, Math.min(100, (remaining / n.backoffDuration) * 100));
              }
              return (
                <div
                  key={n.id}
                  className={`absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border transition-all duration-75 flex items-center justify-center ${getNodeColor(n.state)}`}
                  style={{ left: `${(n.x / WIDTH) * 100}%`, top: `${(n.y / HEIGHT) * 100}%` }}
                >
                  {/* SNR Mini Label (Only on high SNR links for clarity) */}
                  {n.state === 'RX_SYNC' && n.rxSnr > 10 && (
                    <div className="absolute -top-5 text-[9px] font-mono text-cyan-300 font-bold tracking-tight bg-black/50 px-1 rounded whitespace-nowrap">
                      {Math.round(n.rxSnr)}dB
                    </div>
                  )}

                  {/* Backoff Progress Bar */}
                  {n.state === 'BACKOFF' && (
                    <div className="absolute -bottom-3 w-6 h-1 bg-black rounded-full overflow-hidden border border-neutral-800">
                      <div className="h-full bg-amber-400" style={{ width: `${100 - progress}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Lab Controls & Real-Time Analytics */}
        <div className="w-full lg:w-80 bg-muted/30 flex flex-col h-full overflow-y-auto shrink-0 select-none">

          <Tabs defaultValue="stats" className="flex-1 flex flex-col h-full">
            <div className="px-4 pt-3 border-b border-border bg-muted/50">
              <TabsList className="grid w-full grid-cols-2 bg-background border border-border">
                <TabsTrigger value="stats" className="text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><ActivitySquare className="w-3 h-3 mr-2" /> Analytics</TabsTrigger>
                <TabsTrigger value="physics" className="text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Settings2 className="w-3 h-3 mr-2" /> Physics</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="physics" className="flex-1 p-0 m-0 overflow-y-auto">
              <div className="p-5 space-y-6">
                {/* Controls */}
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Node Density</span>
                    <span className="text-foreground">{numNodes[0]} Nodes</span>
                  </div>
                  <Slider value={numNodes} onValueChange={setNumNodes} max={80} min={5} step={1} className="py-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-emerald-500" /> Base TX Power</span>
                    <span className="text-foreground">{txPower[0]} dBm</span>
                  </div>
                  <Slider value={txPower} onValueChange={setTxPower} max={30} min={10} step={1} className="py-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider tooltip" title="Standard Free Space is 2.0. Urban environments approach 3.5 - 4.5.">
                    <span>Path Loss Exponent (γ)</span>
                    <span className="text-foreground">{pathLossExp[0].toFixed(1)}</span>
                  </div>
                  <Slider value={pathLossExp} onValueChange={setPathLossExp} max={5.0} min={2.0} step={0.1} className="py-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Log-normal Fading (σ)</span>
                    <span className="text-foreground">±{fadingVar[0].toFixed(1)} dB</span>
                  </div>
                  <Slider value={fadingVar} onValueChange={setFadingVar} max={10.0} min={0.0} step={0.5} className="py-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Hardware Rx Sens</span>
                    <span className="text-foreground">{rxSensitivity[0]} dBm</span>
                  </div>
                  <Slider value={rxSensitivity} onValueChange={setRxSensitivity} max={-80} min={-130} step={1} className="py-2 [&>span:first-child]:bg-emerald-500/20 [&_[role=slider]]:border-emerald-500" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Ambient Noise Floor</span>
                    <span className="text-foreground">{ambientNoise[0]} dBm</span>
                  </div>
                  <Slider value={ambientNoise} onValueChange={setAmbientNoise} max={-70} min={-130} step={1} className="py-2 [&>span:first-child]:bg-rose-500/20 [&_[role=slider]]:border-rose-500" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="flex-1 p-0 m-0 overflow-y-auto flex flex-col">
              {/* HUD Counters */}
              <div className="grid grid-cols-2 gap-[1px] bg-border border-b border-border">
                <div className="bg-background/80 backdrop-blur p-4">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Packet Delivery Ratio</div>
                  <div className="text-2xl font-black text-foreground flex items-baseline gap-1">
                    {deliveryRatio.toFixed(0)}<span className="text-sm font-semibold text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="bg-background/80 backdrop-blur p-4">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Suppression Eff.</div>
                  <div className="text-2xl font-black text-purple-500 flex items-baseline gap-1">
                    {metrics.txCount > 0 ? ((metrics.suppressedCount / (metrics.txCount + metrics.suppressedCount)) * 100).toFixed(0) : 0}<span className="text-sm font-semibold opacity-70">%</span>
                  </div>
                </div>
                <div className="bg-background/80 backdrop-blur p-4">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Total TX Commits</div>
                  <div className="text-2xl font-black text-emerald-500">{metrics.txCount}</div>
                </div>
                <div className="bg-background/80 backdrop-blur p-4">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1 flex items-center gap-1 text-rose-500/80"><ShieldAlert className="w-3 h-3" /> Collisions</div>
                  <div className="text-2xl font-black text-rose-500">{metrics.collisions}</div>
                </div>
              </div>

              {/* Real-time Charts */}
              <div className="p-4 flex-1 min-h-[220px] flex flex-col">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Delivery Time-Series</div>
                <div className="flex-1 w-[110%] -ml-6 border-l border-b border-border mr-4 mt-2 mb-2 relative">
                  {analyticsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorDeliv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis dataKey="time" type="number" scale="linear" domain={['dataMin', 'dataMax']} tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(1)}s`} />
                        <YAxis domain={[0, numNodes[0]]} tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }}
                          labelFormatter={(lbl) => `Time: ${(Number(lbl) / 1000).toFixed(2)}s`}
                          itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDeliv)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-xs font-medium uppercase tracking-widest">Awaiting Simulation</div>
                  )}
                </div>
              </div>

            </TabsContent>
          </Tabs>

        </div>
      </div>
    </div>
  );
}