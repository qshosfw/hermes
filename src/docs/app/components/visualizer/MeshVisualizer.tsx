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
type ViewMode = 'WAVES' | 'HEATMAP' | 'LINKS' | 'COVERAGE' | 'SNR_MAP';

interface MeshNode {
  id: number;
  x: number;
  y: number;
  altitude: number; // meters above ground
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

interface Obstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // degrees
  attenuationDb: number; // absorption loss per penetration
  reflectionDb: number; // reflected energy
  material: MaterialType;
  label: string;
}

type MaterialType = 'concrete' | 'brick' | 'wood' | 'glass' | 'metal' | 'vegetation' | 'drywall';

const MATERIALS: Record<MaterialType, { label: string; attenDb: number; reflDb: number; color: string; }> = {
  concrete: { label: 'Concrete', attenDb: 15, reflDb: 12, color: 'rgba(120,113,108' },
  brick: { label: 'Brick', attenDb: 12, reflDb: 10, color: 'rgba(180,83,60' },
  wood: { label: 'Wood', attenDb: 5, reflDb: 3, color: 'rgba(162,128,82' },
  glass: { label: 'Glass', attenDb: 4, reflDb: 8, color: 'rgba(56,189,248' },
  metal: { label: 'Metal', attenDb: 30, reflDb: 20, color: 'rgba(161,161,170' },
  vegetation: { label: 'Vegetation', attenDb: 8, reflDb: 1, color: 'rgba(74,222,128' },
  drywall: { label: 'Drywall', attenDb: 3, reflDb: 2, color: 'rgba(245,245,244' },
};

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
  avgLatencyMs: number;
  avgHops: number;
  idle: number;
  rxSync: number;
  backoff: number;
  tx: number;
  done: number;
  suppressedState: number;
}

// --- Constants (Scaled for 60fps Web Animation) ---
const WIDTH = 900;
const HEIGHT = 500;

// Defaults
const CCA_DURATION_MS = 50;
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
  const [simSpeed, setSimSpeed] = useState([0.65]);

  // --- NEW: Advanced Physics Controls ---
  const [carrierSenseDb, setCarrierSenseDb] = useState([5]); // SNR threshold to consider channel busy
  const [maxTtl, setMaxTtl] = useState([15]); // Initial flood TTL
  const [packetDurationMs, setPacketDurationMs] = useState([1000]); // TX duration
  const [csmaMaxRetries, setCsmaMaxRetries] = useState([5]); // Max CSMA backoff retries
  const [nodeAltitude, setNodeAltitude] = useState([0]); // Default altitude in meters

  // --- Environment: Obstacles ---
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [placingObstacle, setPlacingObstacle] = useState(false);

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
  const viewportRef = useRef<HTMLDivElement>(null);

  // --- Drag State ---
  const dragRef = useRef<{ type: 'node' | 'obstacle' | 'resize' | 'rotate'; id: number | string; offsetX: number; offsetY: number; startAngle?: number; startRotation?: number; corner?: string } | null>(null);
  const [selectedObstacle, setSelectedObstacle] = useState<string | null>(null);

  // --- Path Loss & Received Power Equation ---
  const calculateReceivedPower = useCallback((txPowerDbm: number, distancePx: number): number => {
    if (distancePx < 1) return txPowerDbm;
    const distMeters = distancePx * 4;
    const referenceLoss = 40;
    const loss = distMeters >= 1 ? referenceLoss + 10 * pathLossExp[0] * Math.log10(distMeters) : referenceLoss * distMeters;
    const shadowing = gaussianRandom(0, fadingVar[0]);
    return txPowerDbm - loss - shadowing;
  }, [pathLossExp, fadingVar]);

  // --- Obstacle Intersection Physics ---
  // Test if line segment (x1,y1)→(x2,y2) intersects an axis-aligned rect
  const lineIntersectsRect = (x1: number, y1: number, x2: number, y2: number, rx: number, ry: number, rw: number, rh: number): boolean => {
    // Cohen-Sutherland-style: test line segment against rect edges
    const dx = x2 - x1;
    const dy = y2 - y1;
    let tMin = 0, tMax = 1;
    // Check each slab (left/right, top/bottom)
    for (const [p, q] of [[-dx, x1 - rx], [dx, rx + rw - x1], [-dy, y1 - ry], [dy, ry + rh - y1]]) {
      if (Math.abs(p) < 1e-8) { if (q < 0) return false; continue; }
      const t = q / p;
      if (p < 0) { if (t > tMax) return false; if (t > tMin) tMin = t; }
      else { if (t < tMin) return false; if (t < tMax) tMax = t; }
    }
    return tMin <= tMax;
  };

  // Calculate total obstacle attenuation between two points
  const getObstacleLoss = useCallback((x1: number, y1: number, x2: number, y2: number): number => {
    let totalLoss = 0;
    for (const obs of obstacles) {
      if (obs.rotation === 0) {
        // Fast path: axis-aligned
        if (lineIntersectsRect(x1, y1, x2, y2, obs.x, obs.y, obs.w, obs.h)) {
          totalLoss += obs.attenuationDb;
        }
      } else {
        // Rotate the line endpoints into the obstacle's local coordinate system
        const cx = obs.x + obs.w / 2;
        const cy = obs.y + obs.h / 2;
        const rad = -obs.rotation * (Math.PI / 180);
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const lx1 = cos * (x1 - cx) - sin * (y1 - cy) + cx;
        const ly1 = sin * (x1 - cx) + cos * (y1 - cy) + cy;
        const lx2 = cos * (x2 - cx) - sin * (y2 - cy) + cx;
        const ly2 = sin * (x2 - cx) + cos * (y2 - cy) + cy;
        if (lineIntersectsRect(lx1, ly1, lx2, ly2, obs.x, obs.y, obs.w, obs.h)) {
          totalLoss += obs.attenuationDb;
        }
      }
    }
    return totalLoss;
  }, [obstacles]);

  // --- Network Generation ---
  const initNetwork = useCallback(() => {
    setIsRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    let count = numNodes[0];
    let newNodes: MeshNode[] = [];

    const createNode = (id: number, x: number, y: number) => ({
      id, x, y,
      altitude: nodeAltitude[0] + gaussianRandom(0, Math.max(1, nodeAltitude[0] * 0.2)),
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
          const pDbm = calculateReceivedPower(w.powerDbm, dist) - getObstacleLoss(w.x, w.y, px, py);
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
      return (t - w.startTime) * simSpeed[0] < packetDurationMs[0];
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
        const rxPower = calculateReceivedPower(w.powerDbm, dist) - getObstacleLoss(w.x, w.y, n.x, n.y);
        if (rxPower >= threshold) {
          activeIncomingWaves.push({ wave: w, rxPower });
          if (rxPower > strongestSignalDbm) strongestSignalDbm = rxPower;
        }
      }

      const snr = strongestSignalDbm - noiseDbm;
      const isChannelBusy = snr > carrierSenseDb[0];

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
              n.stateEndsAt = dominant.wave.startTime + packetDurationMs[0];
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
            n.stateEndsAt = t + packetDurationMs[0];
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

        // Compute avg latency for nodes that received the packet
        const receivedNodes = nodes.filter(n => n.receptionTime !== null && n.receptionTime > 0);
        const avgLatency = receivedNodes.length > 0 ? receivedNodes.reduce((s, n) => s + (n.receptionTime || 0), 0) / receivedNodes.length : 0;
        const maxTtlVal = maxTtl[0];
        const avgHops = receivedNodes.length > 0 ? receivedNodes.reduce((s, n) => s + (maxTtlVal - n.ttl), 0) / receivedNodes.length : 0;

        return [...prev, {
          time: Math.floor(runtime),
          delivered,
          suppressed: metrics.suppressedCount,
          collisions: metrics.collisions,
          airtime: Math.floor((metrics.txCount * packetDurationMs[0]) / (runtime || 1) * 100),
          avgLatencyMs: Math.round(avgLatency),
          avgHops: Math.round(avgHops * 10) / 10,
          idle: nodes.filter(n => n.state === 'IDLE').length,
          rxSync: nodes.filter(n => n.state === 'RX_SYNC').length,
          backoff: nodes.filter(n => n.state === 'BACKOFF' || n.state === 'CCA').length,
          tx: nodes.filter(n => n.state === 'TX').length,
          done: nodes.filter(n => n.state === 'DONE').length,
          suppressedState: nodes.filter(n => n.state === 'SUPPRESSED').length,
        }];
      });
    }

    if (activeNodeCount === 0 && stateRef.current.waves.length === 0) {
      setIsRunning(false);
    }

    setRenderCounter(c => c + 1);
    rafRef.current = requestAnimationFrame(gameTick);
  }, [isRunning, simSpeed, txPower, ambientNoise, pathLossExp, fadingVar, rxSensitivity, calculateReceivedPower, getObstacleLoss]);

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
    source.ttl = maxTtl[0];
    source.rxSnr = 99;
    source.receptionTime = 0;
    source.stateEndsAt = performance.now() + packetDurationMs[0];

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

  // --- Drag Handlers ---
  const getCanvasCoords = (e: React.MouseEvent): { cx: number; cy: number } | null => {
    if (!viewportRef.current) return null;
    const rect = viewportRef.current.getBoundingClientRect();
    return {
      cx: ((e.clientX - rect.left) / rect.width) * WIDTH,
      cy: ((e.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const node = stateRef.current.nodes.find(n => n.id === nodeId);
    if (!node) return;
    dragRef.current = { type: 'node', id: nodeId, offsetX: coords.cx - node.x, offsetY: coords.cy - node.y };
  };

  const handleObstacleMouseDown = (e: React.MouseEvent, obsId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedObstacle(obsId);
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const obs = obstacles.find(o => o.id === obsId);
    if (!obs) return;
    dragRef.current = { type: 'obstacle', id: obsId, offsetX: coords.cx - obs.x, offsetY: coords.cy - obs.y };
  };

  const handleResizeMouseDown = (e: React.MouseEvent, obsId: string, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    const coords = getCanvasCoords(e);
    if (!coords) return;
    dragRef.current = { type: 'resize', id: obsId, offsetX: coords.cx, offsetY: coords.cy, corner };
  };

  const handleRotateMouseDown = (e: React.MouseEvent, obsId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const obs = obstacles.find(o => o.id === obsId);
    if (!obs) return;
    const cx = obs.x + obs.w / 2;
    const cy = obs.y + obs.h / 2;
    const startAngle = Math.atan2(coords.cy - cy, coords.cx - cx) * (180 / Math.PI);
    dragRef.current = { type: 'rotate', id: obsId, offsetX: 0, offsetY: 0, startAngle, startRotation: obs.rotation };
  };

  const handleViewportMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (dragRef.current.type === 'node') {
      const node = stateRef.current.nodes.find(n => n.id === dragRef.current!.id);
      if (node) {
        node.x = Math.max(10, Math.min(WIDTH - 10, coords.cx - dragRef.current.offsetX));
        node.y = Math.max(10, Math.min(HEIGHT - 10, coords.cy - dragRef.current.offsetY));
        setRenderCounter(c => c + 1);
      }
    } else if (dragRef.current.type === 'obstacle') {
      setObstacles(prev => prev.map(obs => {
        if (obs.id !== dragRef.current!.id) return obs;
        return { ...obs, x: coords.cx - dragRef.current!.offsetX, y: coords.cy - dragRef.current!.offsetY };
      }));
    } else if (dragRef.current.type === 'resize') {
      setObstacles(prev => prev.map(obs => {
        if (obs.id !== dragRef.current!.id) return obs;
        const dx = coords.cx - dragRef.current!.offsetX;
        const dy = coords.cy - dragRef.current!.offsetY;
        dragRef.current!.offsetX = coords.cx;
        dragRef.current!.offsetY = coords.cy;
        const corner = dragRef.current!.corner || 'se';
        let { x, y, w, h } = obs;
        if (corner.includes('e')) w = Math.max(15, w + dx);
        if (corner.includes('w')) { x += dx; w = Math.max(15, w - dx); }
        if (corner.includes('s')) h = Math.max(8, h + dy);
        if (corner.includes('n')) { y += dy; h = Math.max(8, h - dy); }
        return { ...obs, x, y, w, h };
      }));
    } else if (dragRef.current.type === 'rotate') {
      const obs = obstacles.find(o => o.id === dragRef.current!.id);
      if (obs) {
        const cx = obs.x + obs.w / 2;
        const cy = obs.y + obs.h / 2;
        const currentAngle = Math.atan2(coords.cy - cy, coords.cx - cx) * (180 / Math.PI);
        const delta = currentAngle - (dragRef.current.startAngle || 0);
        const newRotation = ((dragRef.current.startRotation || 0) + delta + 360) % 360;
        setObstacles(prev => prev.map(o => o.id !== obs.id ? o : { ...o, rotation: Math.round(newRotation) }));
      }
    }
  };

  const handleViewportMouseUp = () => {
    dragRef.current = null;
  };

  const handleViewportClick = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('[data-obstacle]')) {
      setSelectedObstacle(null);
    }
  };

  // --- Topology Import/Export ---
  const handleExportTopology = () => {
    const exportData = {
      version: 1,
      nodes: stateRef.current.nodes.map(n => ({ id: n.id, x: Math.round(n.x), y: Math.round(n.y), altitude: n.altitude })),
      obstacles,
      physics: {
        txPower: txPower[0], ambientNoise: ambientNoise[0], pathLossExp: pathLossExp[0],
        fadingVar: fadingVar[0], rxSensitivity: rxSensitivity[0], simSpeed: simSpeed[0],
        carrierSenseDb: carrierSenseDb[0], maxTtl: maxTtl[0],
        packetDurationMs: packetDurationMs[0], csmaMaxRetries: csmaMaxRetries[0],
        nodeAltitude: nodeAltitude[0],
      },
      topology,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hermes-mesh-topology-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImportTopology = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.nodes && Array.isArray(data.nodes)) {
            setIsRunning(false);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            const newNodes: MeshNode[] = data.nodes.map((n: any) => ({
              id: n.id, x: n.x, y: n.y, altitude: n.altitude || 0,
              state: 'IDLE' as NodeState, ttl: 0, packetId: null, rxSnr: 0,
              stateEndsAt: 0, csmaAttempts: 0, backoffDuration: 0, receptionTime: null,
            }));
            stateRef.current = {
              nodes: newNodes, waves: [], nextPacketId: 1,
              lastTickTime: performance.now(), startTime: 0,
              metrics: { txCount: 0, suppressedCount: 0, collisions: 0 },
              gridHeatmap: new Float32Array(Math.floor(WIDTH / 10) * Math.floor(HEIGHT / 10)),
            };
            setAnalyticsData([]);
            if (data.obstacles) setObstacles(data.obstacles);
            if (data.physics) {
              const p = data.physics;
              if (p.txPower != null) setTxPower([p.txPower]);
              if (p.ambientNoise != null) setAmbientNoise([p.ambientNoise]);
              if (p.pathLossExp != null) setPathLossExp([p.pathLossExp]);
              if (p.fadingVar != null) setFadingVar([p.fadingVar]);
              if (p.rxSensitivity != null) setRxSensitivity([p.rxSensitivity]);
              if (p.simSpeed != null) setSimSpeed([p.simSpeed]);
              if (p.carrierSenseDb != null) setCarrierSenseDb([p.carrierSenseDb]);
              if (p.maxTtl != null) setMaxTtl([p.maxTtl]);
              if (p.packetDurationMs != null) setPacketDurationMs([p.packetDurationMs]);
              if (p.csmaMaxRetries != null) setCsmaMaxRetries([p.csmaMaxRetries]);
              if (p.nodeAltitude != null) setNodeAltitude([p.nodeAltitude]);
            }
            setNumNodes([newNodes.length]);
            setRenderCounter(c => c + 1);
          }
        } catch { /* ignore parse errors */ }
      };
      reader.readAsText(file);
    };
    input.click();
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
          <button onClick={handleExportTopology} className="px-3 py-2.5 rounded-lg font-medium text-xs flex items-center gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors" title="Export topology as JSON">
            ↓ Export
          </button>
          <button onClick={handleImportTopology} className="px-3 py-2.5 rounded-lg font-medium text-xs flex items-center gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors" title="Import topology from JSON">
            ↑ Import
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
                <SelectItem value="SNR_MAP">SNR Gradient Map</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-[500px] lg:h-[600px] overflow-hidden">

        {/* Left: Physics Engine Viewport */}
        <div ref={viewportRef} className="flex-1 relative bg-[#09090b] overflow-hidden border-b lg:border-b-0 lg:border-r border-border h-[400px] lg:h-full shrink-0 lg:shrink cursor-crosshair" onMouseMove={handleViewportMouseMove} onMouseUp={handleViewportMouseUp} onMouseLeave={handleViewportMouseUp} onClick={handleViewportClick}>
          {/* Grid Map Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px]" />

          {/* Obstacles Rendering (Draggable + Rotatable + Resizable) */}
          {obstacles.length > 0 && (
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 w-full h-full z-[15]" style={{ pointerEvents: 'none' }}>
              <defs>
                {obstacles.map(obs => (
                  <pattern key={`hatch-${obs.id}`} id={`hatch-${obs.id}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform={`rotate(45)`}>
                    <line x1="0" y1="0" x2="0" y2="6" stroke={`${MATERIALS[obs.material].color},0.25)`} strokeWidth="1.5" />
                  </pattern>
                ))}
              </defs>
              {obstacles.map(obs => {
                const mat = MATERIALS[obs.material];
                const isSelected = selectedObstacle === obs.id;
                const cx = obs.x + obs.w / 2;
                const cy = obs.y + obs.h / 2;
                return (
                  <g key={obs.id} transform={`rotate(${obs.rotation} ${cx} ${cy})`} data-obstacle="true">
                    {/* Main body */}
                    <rect x={obs.x} y={obs.y} width={obs.w} height={obs.h}
                      fill={`${mat.color},0.20)`} stroke={`${mat.color},${isSelected ? '0.9' : '0.5'})`} strokeWidth={isSelected ? 2 : 1} rx="2"
                      style={{ pointerEvents: 'all', cursor: 'grab' }}
                      onMouseDown={(e) => handleObstacleMouseDown(e as any, obs.id)} />
                    {/* Hatching fill */}
                    <rect x={obs.x} y={obs.y} width={obs.w} height={obs.h} fill={`url(#hatch-${obs.id})`} rx="2" style={{ pointerEvents: 'none' }} />
                    {/* Label */}
                    <text x={cx} y={obs.y - 5} textAnchor="middle" fill={`${mat.color},0.8)`} fontSize="7" fontFamily="monospace" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                      {obs.label} • {mat.label} • -{obs.attenuationDb}dB {obs.reflectionDb > 0 ? `⇉${obs.reflectionDb}dB` : ''} {obs.rotation !== 0 ? `∠${obs.rotation}°` : ''}
                    </text>
                    {/* Selection handles */}
                    {isSelected && (<>
                      {/* Resize handles (corners) */}
                      {[['nw', obs.x, obs.y], ['ne', obs.x + obs.w, obs.y], ['sw', obs.x, obs.y + obs.h], ['se', obs.x + obs.w, obs.y + obs.h]].map(([corner, hx, hy]) => (
                        <rect key={`h-${corner}`} x={Number(hx) - 3} y={Number(hy) - 3} width={6} height={6}
                          fill="white" stroke={`${mat.color},0.8)`} strokeWidth={1} rx={1}
                          style={{ pointerEvents: 'all', cursor: `${corner}-resize` }}
                          onMouseDown={(e) => handleResizeMouseDown(e as any, obs.id, corner as string)} />
                      ))}
                      {/* Rotation handle (top center) */}
                      <line x1={cx} y1={obs.y} x2={cx} y2={obs.y - 18} stroke="white" strokeWidth={1} opacity={0.5} style={{ pointerEvents: 'none' }} />
                      <circle cx={cx} cy={obs.y - 18} r={4}
                        fill={`${mat.color},0.6)`} stroke="white" strokeWidth={1}
                        style={{ pointerEvents: 'all', cursor: 'crosshair' }}
                        onMouseDown={(e) => handleRotateMouseDown(e as any, obs.id)} />
                    </>)}
                  </g>
                );
              })}
            </svg>
          )}

          {/* State Legend Overlay */}
          <div className="absolute top-3 left-3 z-30 flex flex-col gap-1 bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-2 border border-white/10">
            {[
              { label: 'Idle', color: 'bg-neutral-600' },
              { label: 'RX Sync', color: 'bg-cyan-500' },
              { label: 'Backoff', color: 'bg-amber-500' },
              { label: 'CCA', color: 'bg-yellow-400' },
              { label: 'TX', color: 'bg-emerald-500' },
              { label: 'Suppressed', color: 'bg-purple-600' },
              { label: 'Done', color: 'bg-emerald-900' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${s.color}`} />
                <span className="text-[8px] font-mono text-white/60 uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Sim Speed Badge */}
          <div className="absolute top-3 right-3 z-30 bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-white/10 flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'}`} />
            <span className="text-[9px] font-mono text-white/60 uppercase tracking-wider">{simSpeed[0].toFixed(2)}× {isRunning ? 'RUNNING' : 'PAUSED'}</span>
          </div>

          {/* Heatmap Canvas */}
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300 ${viewMode === 'HEATMAP' ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Logical Links Canvas (Approximated LoS) */}
          {viewMode === 'LINKS' && (
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {nodes.map(n1 => nodes.map(n2 => {
                if (n1.id >= n2.id) return null;
                const d = Math.hypot(n1.x - n2.x, n1.y - n2.y);
                const snr = calculateReceivedPower(txPower[0], d) - getObstacleLoss(n1.x, n1.y, n2.x, n2.y) - ambientNoise[0];
                if (snr < 5) return null;
                const quality = Math.min(1, snr / 30);
                return <line key={`${n1.id}-${n2.id}`} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke={`rgba(59, 130, 246, ${0.1 + quality * 0.5})`} strokeWidth={0.5 + quality * 1.5} />
              }))}
            </svg>
          )}

          {/* Active Routing Lines (Visible during flooding in WAVES mode) */}
          {viewMode === 'WAVES' && (
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 w-full h-full pointer-events-none z-5 opacity-60">
              <defs>
                <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {nodes.filter(n => n.state === 'TX' || n.state === 'RX_SYNC').map(txNode => {
                return nodes.filter(rxNode => rxNode.state === 'RX_SYNC' && rxNode.packetId === txNode.packetId && rxNode.id !== txNode.id).map(rxNode => {
                  const d = Math.hypot(txNode.x - rxNode.x, txNode.y - rxNode.y);
                  if (d > 400) return null;
                  return <line key={`r-${txNode.id}-${rxNode.id}`} x1={txNode.x} y1={txNode.y} x2={rxNode.x} y2={rxNode.y} stroke="url(#routeGrad)" strokeWidth="1" strokeDasharray="4 6" />
                });
              })}
            </svg>
          )}

          {/* Theoretical Coverage Canvas (Max Range Rings) */}
          {viewMode === 'COVERAGE' && (
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <radialGradient id="covGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
                  <stop offset="70%" stopColor="#10b981" stopOpacity="0.03" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
              </defs>
              {nodes.map(n => {
                const maxRangeMeters = Math.pow(10, (txPower[0] - rxSensitivity[0] - 40) / (10 * pathLossExp[0]));
                const maxRangePx = maxRangeMeters / 4;
                const usableRange = maxRangePx * 0.7;
                return (
                  <g key={`cov-${n.id}`}>
                    <circle cx={n.x} cy={n.y} r={maxRangePx} fill="url(#covGrad)" stroke="rgba(16,185,129,0.25)" strokeWidth="1" strokeDasharray="6 4" />
                    <circle cx={n.x} cy={n.y} r={usableRange} fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="0.5" strokeDasharray="2 4" />
                  </g>
                );
              })}
            </svg>
          )}

          {/* RF Waves Canvas */}
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={`absolute inset-0 w-full h-full pointer-events-none z-10 transition-opacity ${viewMode === 'WAVES' ? 'opacity-100' : 'opacity-20'}`}>
            <defs>
              <radialGradient id="txWave" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                <stop offset="70%" stopColor="#10b981" stopOpacity="0.02" />
                <stop offset="90%" stopColor="#10b981" stopOpacity="0.1" />
                <stop offset="97%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
              </radialGradient>
              <radialGradient id="txWaveInner" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
                <stop offset="90%" stopColor="#34d399" stopOpacity="0" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.15" />
              </radialGradient>
              <filter id="waveGlow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {waves.map((w) => {
              const age = (performance.now() - w.startTime) * simSpeed[0];
              const opacity = Math.max(0, 1 - (age / packetDurationMs[0]));
              return (
                <g key={w.id} opacity={opacity}>
                  {/* Main wavefront */}
                  <circle cx={w.x} cy={w.y} r={w.radius} fill="url(#txWave)" stroke="rgba(16, 185, 129, 0.5)" strokeWidth="1.5" filter="url(#waveGlow)" />
                  {/* Secondary inner ring for depth */}
                  <circle cx={w.x} cy={w.y} r={w.radius * 0.6} fill="none" stroke="rgba(52, 211, 153, 0.08)" strokeWidth="0.5" />
                  {/* TTL indicator text */}
                  {w.radius > 30 && w.radius < 200 && (
                    <text x={w.x + w.radius * 0.7} y={w.y - 6} fill="rgba(16,185,129,0.5)" fontSize="8" fontFamily="monospace" fontWeight="bold">TTL:{w.ttl}</text>
                  )}
                </g>
              );
            })}

            {/* Physical Distance Legend */}
            <g className="opacity-60 text-[10px] font-mono fill-white" transform={`translate(20, ${HEIGHT - 20})`}>
              <line x1="0" y1="0" x2="250" y2="0" stroke="white" strokeWidth="1" />
              <line x1="0" y1="-4" x2="0" y2="4" stroke="white" strokeWidth="1" />
              <line x1="62.5" y1="-2" x2="62.5" y2="2" stroke="white" strokeWidth="0.5" opacity="0.3" />
              <line x1="125" y1="-3" x2="125" y2="3" stroke="white" strokeWidth="1" opacity="0.5" />
              <line x1="187.5" y1="-2" x2="187.5" y2="2" stroke="white" strokeWidth="0.5" opacity="0.3" />
              <line x1="250" y1="-4" x2="250" y2="4" stroke="white" strokeWidth="1" />
              <text x="0" y="12" textAnchor="start" fontSize="7" className="tracking-widest opacity-50">0</text>
              <text x="125" y="12" textAnchor="middle" fontSize="7" className="tracking-widest opacity-50">500m</text>
              <text x="250" y="12" textAnchor="end" fontSize="7" className="tracking-widest opacity-50">1km</text>
              <text x="125" y="-8" textAnchor="middle" className="tracking-widest font-semibold uppercase opacity-90 drop-shadow-md">Scale</text>
            </g>
          </svg>

          {/* SNR Gradient Map View */}
          {viewMode === 'SNR_MAP' && (
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {nodes.map(n1 => nodes.map(n2 => {
                if (n1.id >= n2.id) return null;
                const d = Math.hypot(n1.x - n2.x, n1.y - n2.y);
                const snr = calculateReceivedPower(txPower[0], d) - getObstacleLoss(n1.x, n1.y, n2.x, n2.y) - ambientNoise[0];
                if (snr < 0) return null;
                const quality = Math.min(1, snr / 25);
                // Color: red (poor) → yellow → green (excellent)
                const r = Math.round(255 * (1 - quality));
                const g = Math.round(255 * quality);
                return (
                  <g key={`snr-${n1.id}-${n2.id}`}>
                    <line x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke={`rgba(${r},${g},80,${0.15 + quality * 0.4})`} strokeWidth={0.5 + quality * 2} />
                    {quality > 0.2 && (
                      <text x={(n1.x + n2.x) / 2} y={(n1.y + n2.y) / 2 - 3} textAnchor="middle" fill={`rgba(${r},${g},80,0.7)`} fontSize="7" fontFamily="monospace" fontWeight="bold">{snr.toFixed(0)}dB</text>
                    )}
                  </g>
                );
              }))}
            </svg>
          )}

          {/* Nodes DOM Layer (Interactive — drag to reposition) */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {nodes.map(n => {
              const T = performance.now();
              let progress = 0;
              if (n.state === 'BACKOFF') {
                const remaining = n.stateEndsAt - T;
                progress = Math.max(0, Math.min(100, (remaining / n.backoffDuration) * 100));
              }
              const isTx = n.state === 'TX';
              const isRx = n.state === 'RX_SYNC';
              return (
                <div
                  key={n.id}
                  className={`absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-[1.5px] transition-all duration-75 flex items-center justify-center cursor-grab active:cursor-grabbing ${getNodeColor(n.state)}`}
                  style={{ left: `${(n.x / WIDTH) * 100}%`, top: `${(n.y / HEIGHT) * 100}%`, pointerEvents: 'all' }}
                  onMouseDown={(e) => handleNodeMouseDown(e, n.id)}
                >
                  {/* Node ID Label */}
                  <div className={`absolute -top-4 text-[7px] font-mono font-bold tracking-tight px-1 rounded-sm whitespace-nowrap select-none ${isTx ? 'text-emerald-300 bg-black/70' :
                    isRx ? 'text-cyan-300 bg-black/70' :
                      n.state === 'SUPPRESSED' ? 'text-purple-300 bg-black/70' :
                        'text-white/30'
                    }`}>
                    {n.id}{isRx ? ` ${Math.round(n.rxSnr)}dB` : ''}
                  </div>

                  {/* TX Pulse Ring */}
                  {isTx && (
                    <div className="absolute inset-[-4px] rounded-full border border-emerald-400/50 animate-ping" style={{ animationDuration: '1s' }} />
                  )}

                  {/* Backoff Progress Bar */}
                  {n.state === 'BACKOFF' && (
                    <div className="absolute -bottom-3.5 w-8 h-1 bg-black/80 rounded-full overflow-hidden border border-neutral-700">
                      <div className="h-full bg-amber-400 transition-all" style={{ width: `${100 - progress}%` }} />
                    </div>
                  )}

                  {/* Suppression X marker */}
                  {n.state === 'SUPPRESSED' && (
                    <div className="absolute text-[8px] font-bold text-purple-400">✕</div>
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
              <TabsList className="grid w-full grid-cols-3 bg-background border border-border">
                <TabsTrigger value="stats" className="text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><ActivitySquare className="w-3 h-3 mr-1" /> Stats</TabsTrigger>
                <TabsTrigger value="physics" className="text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Settings2 className="w-3 h-3 mr-1" /> Physics</TabsTrigger>
                <TabsTrigger value="env" className="text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Layers className="w-3 h-3 mr-1" /> Env</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="physics" className="flex-1 p-0 m-0 overflow-y-auto">
              <div className="p-5 space-y-5">
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Node Density</span>
                    <span className="text-foreground">{numNodes[0]} Nodes</span>
                  </div>
                  <Slider value={numNodes} onValueChange={setNumNodes} max={80} min={5} step={1} className="py-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-emerald-500" /> TX Power</span>
                    <span className="text-foreground">{txPower[0]} dBm</span>
                  </div>
                  <Slider value={txPower} onValueChange={setTxPower} max={30} min={10} step={1} className="py-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Path Loss (γ)</span>
                    <span className="text-foreground">{pathLossExp[0].toFixed(1)}</span>
                  </div>
                  <Slider value={pathLossExp} onValueChange={setPathLossExp} max={5.0} min={2.0} step={0.1} className="py-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Fading Variance (σ)</span>
                    <span className="text-foreground">±{fadingVar[0].toFixed(1)} dB</span>
                  </div>
                  <Slider value={fadingVar} onValueChange={setFadingVar} max={10.0} min={0.0} step={0.5} className="py-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Rx Sensitivity</span>
                    <span className="text-foreground">{rxSensitivity[0]} dBm</span>
                  </div>
                  <Slider value={rxSensitivity} onValueChange={setRxSensitivity} max={-80} min={-130} step={1} className="py-2 [&>span:first-child]:bg-emerald-500/20 [&_[role=slider]]:border-emerald-500" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Noise Floor</span>
                    <span className="text-foreground">{ambientNoise[0]} dBm</span>
                  </div>
                  <Slider value={ambientNoise} onValueChange={setAmbientNoise} max={-70} min={-130} step={1} className="py-2 [&>span:first-child]:bg-rose-500/20 [&_[role=slider]]:border-rose-500" />
                </div>

                <div className="h-px bg-border my-2" />
                <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Protocol Parameters</div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Sim Speed</span>
                    <span className="text-foreground">{simSpeed[0].toFixed(2)}×</span>
                  </div>
                  <Slider value={simSpeed} onValueChange={setSimSpeed} max={3.0} min={0.1} step={0.05} className="py-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Carrier Sense</span>
                    <span className="text-foreground">{carrierSenseDb[0]} dB SNR</span>
                  </div>
                  <Slider value={carrierSenseDb} onValueChange={setCarrierSenseDb} max={20} min={1} step={1} className="py-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Max TTL</span>
                    <span className="text-foreground">{maxTtl[0]} hops</span>
                  </div>
                  <Slider value={maxTtl} onValueChange={setMaxTtl} max={31} min={1} step={1} className="py-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Packet Duration</span>
                    <span className="text-foreground">{packetDurationMs[0]} ms</span>
                  </div>
                  <Slider value={packetDurationMs} onValueChange={setPacketDurationMs} max={3000} min={200} step={50} className="py-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>CSMA Max Retries</span>
                    <span className="text-foreground">{csmaMaxRetries[0]}</span>
                  </div>
                  <Slider value={csmaMaxRetries} onValueChange={setCsmaMaxRetries} max={10} min={1} step={1} className="py-2" />
                </div>
              </div>
            </TabsContent>

            {/* Environment Tab */}
            <TabsContent value="env" className="flex-1 p-0 m-0 overflow-y-auto">
              <div className="p-5 space-y-5">
                <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Terrain</div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Base Altitude</span>
                    <span className="text-foreground">{nodeAltitude[0]}m</span>
                  </div>
                  <Slider value={nodeAltitude} onValueChange={setNodeAltitude} max={500} min={0} step={5} className="py-2" />
                </div>

                <div className="h-px bg-border my-2" />
                <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Obstacles ({obstacles.length})</div>

                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.entries(MATERIALS) as [MaterialType, typeof MATERIALS[MaterialType]][]).map(([key, mat]) => (
                    <button
                      key={key}
                      onClick={() => {
                        const id = `obs_${Date.now()}`;
                        const ox = 200 + Math.random() * (WIDTH - 400);
                        const oy = 100 + Math.random() * (HEIGHT - 200);
                        const isWall = key !== 'vegetation';
                        setObstacles(prev => [...prev, {
                          id, x: ox, y: oy,
                          w: isWall ? 60 + Math.random() * 40 : 30,
                          h: isWall ? 8 + Math.random() * 8 : 30,
                          rotation: 0,
                          attenuationDb: mat.attenDb,
                          reflectionDb: mat.reflDb,
                          material: key,
                          label: `${mat.label} ${prev.length + 1}`,
                        }]);
                      }}
                      className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-secondary/50 text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: `${mat.color},0.6)` }} />
                        {mat.label}
                      </div>
                      <div className="text-[8px] text-muted-foreground font-normal normal-case mt-0.5">
                        -{mat.attenDb}dB • ⇉{mat.reflDb}dB
                      </div>
                    </button>
                  ))}
                </div>

                {obstacles.length > 0 && (
                  <button
                    onClick={() => setObstacles([])}
                    className="w-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors mt-2"
                  >
                    Clear All Obstacles
                  </button>
                )}

                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {obstacles.map(obs => {
                    const mat = MATERIALS[obs.material];
                    return (
                      <div key={obs.id}
                        className={`flex items-center justify-between text-[10px] font-mono text-muted-foreground px-2.5 py-1.5 rounded border cursor-pointer transition-colors ${selectedObstacle === obs.id ? 'bg-primary/10 border-primary/30' : 'bg-muted/30 border-border hover:bg-muted/50'}`}
                        onClick={() => setSelectedObstacle(selectedObstacle === obs.id ? null : obs.id)}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: `${mat.color},0.6)` }} />
                          <span>{obs.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span style={{ color: `${mat.color},0.8)` }}>-{obs.attenuationDb}dB</span>
                          {obs.rotation !== 0 && <span className="text-muted-foreground/50">{obs.rotation}°</span>}
                          <button onClick={(e) => { e.stopPropagation(); setObstacles(prev => prev.filter(o => o.id !== obs.id)); }} className="text-muted-foreground hover:text-destructive">
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="flex-1 p-0 m-0 overflow-y-auto flex flex-col">
              {/* HUD Counters */}
              <div className="grid grid-cols-3 gap-[1px] bg-border border-b border-border">
                <div className="bg-background/80 backdrop-blur p-3">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-0.5">PDR</div>
                  <div className="text-xl font-black text-foreground flex items-baseline gap-0.5">
                    {deliveryRatio.toFixed(0)}<span className="text-[10px] font-semibold text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="bg-background/80 backdrop-blur p-3">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-0.5">Suppression</div>
                  <div className="text-xl font-black text-purple-500 flex items-baseline gap-0.5">
                    {metrics.txCount > 0 ? ((metrics.suppressedCount / (metrics.txCount + metrics.suppressedCount)) * 100).toFixed(0) : 0}<span className="text-[10px] font-semibold opacity-70">%</span>
                  </div>
                </div>
                <div className="bg-background/80 backdrop-blur p-3">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-0.5">Channel Load</div>
                  <div className="text-xl font-black text-sky-500 flex items-baseline gap-0.5">
                    {analyticsData.length > 0 ? analyticsData[analyticsData.length - 1].airtime : 0}<span className="text-[10px] font-semibold opacity-70">%</span>
                  </div>
                </div>
                <div className="bg-background/80 backdrop-blur p-3">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-emerald-500/80 mb-0.5">TX Commits</div>
                  <div className="text-xl font-black text-emerald-500">{metrics.txCount}</div>
                </div>
                <div className="bg-background/80 backdrop-blur p-3">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-0.5 flex items-center gap-1 text-rose-500/80"><ShieldAlert className="w-2.5 h-2.5" /> Collisions</div>
                  <div className="text-xl font-black text-rose-500">{metrics.collisions}</div>
                </div>
                <div className="bg-background/80 backdrop-blur p-3">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-amber-500/80 mb-0.5">Suppressed</div>
                  <div className="text-xl font-black text-amber-500">{metrics.suppressedCount}</div>
                </div>
                <div className="bg-background/80 backdrop-blur p-3">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-cyan-500/80 mb-0.5">Avg Latency</div>
                  <div className="text-lg font-black text-cyan-500">{analyticsData.length > 0 ? analyticsData[analyticsData.length - 1].avgLatencyMs : 0}<span className="text-[9px] font-semibold opacity-70">ms</span></div>
                </div>
                <div className="bg-background/80 backdrop-blur p-3">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-indigo-500/80 mb-0.5">Avg Hops</div>
                  <div className="text-lg font-black text-indigo-500">{analyticsData.length > 0 ? analyticsData[analyticsData.length - 1].avgHops : 0}</div>
                </div>
                <div className="bg-background/80 backdrop-blur p-3">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-teal-500/80 mb-0.5">Efficiency</div>
                  <div className="text-lg font-black text-teal-500">{metrics.txCount > 0 ? (((nodes.filter(n => n.packetId !== null).length) / metrics.txCount) * 100).toFixed(0) : 0}<span className="text-[9px] font-semibold opacity-70">%</span></div>
                </div>
              </div>

              {/* Real-time Charts */}
              <div className="p-4 flex-1 min-h-[160px] flex flex-col">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Packet Delivery</div>
                <div className="flex-1 w-[110%] -ml-6 border-l border-b border-border mr-4 relative">
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
                        <XAxis dataKey="time" type="number" scale="linear" domain={['dataMin', 'dataMax']} tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(1)}s`} />
                        <YAxis domain={[0, numNodes[0]]} tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '11px' }}
                          labelFormatter={(lbl) => `Time: ${(Number(lbl) / 1000).toFixed(2)}s`}
                        />
                        <Area type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDeliv)" isAnimationActive={false} name="Delivered" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-[10px] font-medium uppercase tracking-widest">Awaiting Simulation</div>
                  )}
                </div>
              </div>

              {/* Suppression vs Collisions Chart */}
              <div className="px-4 pb-4 min-h-[140px] flex flex-col">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Suppression & Collisions</div>
                <div className="flex-1 w-[110%] -ml-6 border-l border-b border-border mr-4 relative">
                  {analyticsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSupp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorColl" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis dataKey="time" type="number" scale="linear" domain={['dataMin', 'dataMax']} tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(1)}s`} />
                        <YAxis tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '11px' }}
                          labelFormatter={(lbl) => `Time: ${(Number(lbl) / 1000).toFixed(2)}s`}
                        />
                        <Area type="monotone" dataKey="suppressed" stroke="#a855f7" strokeWidth={1.5} fillOpacity={1} fill="url(#colorSupp)" isAnimationActive={false} name="Suppressed" />
                        <Area type="monotone" dataKey="collisions" stroke="#ef4444" strokeWidth={1.5} fillOpacity={1} fill="url(#colorColl)" isAnimationActive={false} name="Collisions" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-[10px] font-medium uppercase tracking-widest">—</div>
                  )}
                </div>
              </div>

              {/* Node State Distribution Chart */}
              <div className="px-4 pb-4 min-h-[140px] flex flex-col">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Node State Distribution</div>
                <div className="flex-1 w-[110%] -ml-6 border-l border-b border-border mr-4 relative">
                  {analyticsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }} stackOffset="expand">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis dataKey="time" type="number" scale="linear" domain={['dataMin', 'dataMax']} tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(1)}s`} />
                        <YAxis tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '11px' }}
                          labelFormatter={(lbl) => `Time: ${(Number(lbl) / 1000).toFixed(2)}s`}
                        />
                        <Area type="monotone" dataKey="done" stackId="1" stroke="#065f46" fill="#065f46" fillOpacity={0.6} isAnimationActive={false} name="Done" />
                        <Area type="monotone" dataKey="suppressedState" stackId="1" stroke="#7e22ce" fill="#7e22ce" fillOpacity={0.5} isAnimationActive={false} name="Suppressed" />
                        <Area type="monotone" dataKey="tx" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} isAnimationActive={false} name="TX" />
                        <Area type="monotone" dataKey="backoff" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} isAnimationActive={false} name="Backoff/CCA" />
                        <Area type="monotone" dataKey="rxSync" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.5} isAnimationActive={false} name="RX Sync" />
                        <Area type="monotone" dataKey="idle" stackId="1" stroke="#525252" fill="#525252" fillOpacity={0.3} isAnimationActive={false} name="Idle" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-[10px] font-medium uppercase tracking-widest">—</div>
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