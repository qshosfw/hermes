import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PacketHeaderConfig, AddressingType, PacketType, AckedPacketInfo, TelemetryPacketInfo } from './types';
import PacketBuilder from './components/PacketBuilder';
import ProcessingStep from './components/ProcessingStep';
import HexDump from './components/HexDump';
import HeaderVisualizer from './components/HeaderVisualizer';
import WhiteningVisualizer from './components/WhiteningVisualizer';
import PhysicalFrameVisualizer from './components/PhysicalFrameVisualizer';
import PacketDetailView from './components/PacketDetailView';
import OverheadChart from './components/OverheadChart';
import AvalancheVisualizer from './components/AvalancheVisualizer';
import { DEFAULT_SYNC_WORD } from './constants';
import * as Hermes from './services/hermesProtocol';
import FecVisualizer from './components/FskWaveform';
import AckPayloadVisualizer from './components/AckPayloadVisualizer';
import PingPayloadVisualizer from './components/PingPayloadVisualizer';
import MeshVisualizer from './components/MeshVisualizer';
import TelemetryPayloadVisualizer from './components/TelemetryPayloadVisualizer';
import DownloadIcon from './components/icons/DownloadIcon';
import UploadIcon from './components/icons/UploadIcon';
import ImportModal from './components/ImportModal';

export default function App() {
  const [payloadText, setPayloadText] = useState<string>("Hello Hermes!");
  const [hopPath, setHopPath] = useState<Uint8Array[]>([]);
  const [syncWord, setSyncWord] = useState<Uint8Array>(DEFAULT_SYNC_WORD);
  const [config, setConfig] = useState<PacketHeaderConfig>({
    type: PacketType.MESSAGE,
    addressing: AddressingType.UNICAST,
    ttl: 7,
    wantAck: true,
    fragmentIndex: 0,
    lastFragment: true,
    nonce: Hermes.generateRandomBytes(12),
    destination: Hermes.hexToBytes("C0FFEE123456", 6),
    source: Hermes.hexToBytes("BEEF42654321", 6),
  });
  const [sharedSecret, setSharedSecret] = useState<Uint8Array>(Hermes.generateRandomBytes(32));
  const [ackedPacketInfo, setAckedPacketInfo] = useState<AckedPacketInfo | null>(null);
  const [telemetryPacketInfo, setTelemetryPacketInfo] = useState<TelemetryPacketInfo | null>(null);

  const [isDataExpanded, setIsDataExpanded] = useState(false);
  const [expandedPacketSection, setExpandedPacketSection] = useState<string | null>(null);
  const [hoveredByte, setHoveredByte] = useState<number | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const payloadVizRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to payload visualization when type changes
  useEffect(() => {
    if ([PacketType.PING, PacketType.ACK, PacketType.TELEMETRY].includes(config.type)) {
      // Small timeout to allow DOM update
      const timer = setTimeout(() => {
        payloadVizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [config.type]);

  const preambleBytes = useMemo(() => {
    const firstByte = syncWord.length > 0 ? syncWord[0] : 0;
    const preambleValue = (firstByte & 0x80) ? 0x55 : 0xAA;
    return new Uint8Array(16).fill(preambleValue);
  }, [syncWord]);

  const processingResult = useMemo(() => {
    let rawPacket;
    if (config.type === PacketType.ACK && ackedPacketInfo) {
      rawPacket = Hermes.buildAckPacket(config, ackedPacketInfo, sharedSecret);
    } else if (config.type === PacketType.TELEMETRY && telemetryPacketInfo) {
      const payload = Hermes.buildTelemetryPayload(telemetryPacketInfo);
      rawPacket = Hermes.buildRawPacket(config, payload, sharedSecret);
    } else {
      let payload: Uint8Array;
      if (config.type === PacketType.PING) {
        payload = Hermes.buildPayloadFromHopPath(hopPath);
      } else {
        payload = Hermes.textToBytes(payloadText, 54);
      }
      rawPacket = Hermes.buildRawPacket(config, payload, sharedSecret);
    }

    const pn15Sequence = Hermes.generatePn15Sequence(rawPacket.data.length);
    const whitened = Hermes.whiten(rawPacket.data, syncWord, pn15Sequence);
    const rsEncoded = Hermes.reedSolomonEncode(whitened);

    // Final physical data (128 bytes)
    const physicalData = new Uint8Array(128);
    physicalData.set(rsEncoded.data, 0);
    physicalData.set(rsEncoded.parity, 96);

    return { rawPacket, pn15Sequence, whitened, rsEncoded, physicalData };
  }, [config, payloadText, sharedSecret, syncWord, ackedPacketInfo, hopPath, telemetryPacketInfo]);

  // Highlighting config with vibrant, solid colors
  const rawPacketHighlights = useMemo(() => ([
    { index: 0, length: 26, color: 'bg-indigo-600 text-white shadow-sm ring-1 ring-white/10', label: 'Header' },
    { index: 26, length: 54, color: 'bg-emerald-600 text-white shadow-sm ring-1 ring-white/10', label: 'Payload' },
    { index: 80, length: 16, color: 'bg-purple-600 text-white shadow-sm ring-1 ring-white/10', label: 'Signature' },
  ]), []);

  const handleSectionClick = (label: string) => {
    setExpandedPacketSection(label === expandedPacketSection ? null : label);
  };

  const getDetailViewData = () => {
    switch (expandedPacketSection) {
      case 'Preamble': return preambleBytes;
      case 'Sync Word': return syncWord;
      case 'Header':
      case 'Payload':
      case 'Signature':
        return processingResult.rawPacket;
      default: return null;
    }
  };

  const handleDownloadBin = () => {
    const frame = new Uint8Array(preambleBytes.length + syncWord.length + processingResult.physicalData.length);
    frame.set(preambleBytes, 0);
    frame.set(syncWord, preambleBytes.length);
    frame.set(processingResult.physicalData, preambleBytes.length + syncWord.length);

    const blob = new Blob([frame], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hermes_frame.bin';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (data: {
    config: PacketHeaderConfig;
    payloadText: string;
    hopPath: Uint8Array[];
    ackedPacketInfo: AckedPacketInfo | null;
    telemetryPacketInfo: TelemetryPacketInfo | null;
    syncWord: Uint8Array;
    sharedSecret: Uint8Array;
  }) => {
    setConfig(data.config);
    setPayloadText(data.payloadText);
    setHopPath(data.hopPath);
    setAckedPacketInfo(data.ackedPacketInfo);
    setTelemetryPacketInfo(data.telemetryPacketInfo);
    setSyncWord(data.syncWord);
    setSharedSecret(data.sharedSecret);
  };

  return (
    <main className="min-h-screen font-sans bg-zinc-950 text-zinc-200 selection:bg-indigo-500/30 selection:text-white">
      <div className="fixed inset-0 pointer-events-none opacity-[0.05] bg-grid-pattern z-0"></div>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentSharedSecret={sharedSecret}
        onImport={handleImport}
      />

      <div className="relative z-10 container mx-auto p-4 md:p-6 max-w-[1800px]">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800/50 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.3)] ring-1 ring-indigo-400/50">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Hermes Link <span className="text-zinc-500 font-medium ml-2 border-l border-zinc-800 pl-2">Protocol Engine</span>
              </h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold mt-0.5">Physical & Link Layer Visualizer</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="text-xs font-semibold bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <UploadIcon className="w-3.5 h-3.5" />
              Import
            </button>
            <button
              onClick={handleDownloadBin}
              className="text-xs font-semibold bg-white text-black hover:bg-zinc-200 border border-transparent px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-xl active:scale-95"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              Export Binary
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">

          {/* Left Column: Configuration (Sticky & Independently Scrollable) */}
          <div className="lg:col-span-4 lg:sticky lg:top-4 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
            <div className="space-y-6 pb-20">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
                <PacketBuilder
                  config={config}
                  setConfig={setConfig}
                  payloadText={payloadText}
                  setPayloadText={setPayloadText}
                  sharedSecret={sharedSecret}
                  setSharedSecret={setSharedSecret}
                  signature={processingResult.rawPacket.signature}
                  syncWord={syncWord}
                  setSyncWord={setSyncWord}
                  hoveredByte={hoveredByte}
                  ackedPacketInfo={ackedPacketInfo}
                  setAckedPacketInfo={setAckedPacketInfo}
                  telemetryPacketInfo={telemetryPacketInfo}
                  setTelemetryPacketInfo={setTelemetryPacketInfo}
                  hopPath={hopPath}
                  setHopPath={setHopPath}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Visualization Steps */}
          <div className="lg:col-span-8 space-y-4 pb-20">

            {/* Intro Stats / Hero */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-zinc-900/40 border border-zinc-800/60 p-5 rounded-2xl flex flex-col group hover:border-zinc-700 transition-all hover:bg-zinc-900/60">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total Frame Size</span>
                <span className="text-2xl font-bold text-white mt-1 font-mono tracking-tighter">148 <span className="text-[10px] font-bold text-zinc-600 uppercase font-sans tracking-widest ml-1">bytes</span></span>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/60 p-5 rounded-2xl flex flex-col group hover:border-zinc-700 transition-all hover:bg-zinc-900/60">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Modulation Scheme</span>
                <span className="text-2xl font-bold text-white mt-1 font-mono tracking-tighter">AFSK <span className="text-[10px] font-bold text-zinc-600 uppercase font-sans tracking-widest ml-1">1200 baud</span></span>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/60 p-5 rounded-2xl flex flex-col group hover:border-zinc-700 transition-all hover:bg-zinc-900/60">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Security Layer</span>
                <span className="text-2xl font-bold text-white mt-1 font-mono tracking-tighter">Poly1305 <span className="text-[10px] font-bold text-zinc-600 uppercase font-sans tracking-widest ml-1">MAC</span></span>
              </div>
            </div>

            <ProcessingStep
              title="Physical Layer Frame"
              description="The complete 148-byte physical frame ready for radio transmission."
              startExpanded={true}
            >
              <PhysicalFrameVisualizer
                preamble={preambleBytes}
                syncWord={syncWord}
                data={processingResult.physicalData}
                isExpanded={isDataExpanded}
                onDataClick={() => setIsDataExpanded(!isDataExpanded)}
                onSectionClick={handleSectionClick}
                packetParts={processingResult.rawPacket}
              />
              {expandedPacketSection && ['Preamble', 'Sync Word'].includes(expandedPacketSection) && (
                <PacketDetailView
                  section={expandedPacketSection}
                  packetData={getDetailViewData()}
                  onClose={() => setExpandedPacketSection(null)}
                />
              )}
            </ProcessingStep>

            <ProcessingStep
              title="Transport Layer Header"
              description="The 26-byte header containing control flags, addressing, and routing data."
            >
              <HeaderVisualizer config={config} />
            </ProcessingStep>

            <ProcessingStep
              title="Raw Packet Assembly"
              description="The 96-byte transport layer packet (Header + Payload + Signature)."
            >
              <HexDump
                data={processingResult.rawPacket.data}
                highlights={rawPacketHighlights}
                onHighlightClick={handleSectionClick}
                activeHighlight={expandedPacketSection}
                onByteHover={setHoveredByte}
              />
              {expandedPacketSection && ['Header', 'Payload', 'Signature'].includes(expandedPacketSection) && (
                <PacketDetailView
                  section={expandedPacketSection}
                  packetData={getDetailViewData()}
                  onClose={() => setExpandedPacketSection(null)}
                />
              )}
            </ProcessingStep>

            {config.type === PacketType.PING && (
              <ProcessingStep
                ref={payloadVizRef}
                title="Ping Payload (Hop Path)"
                description="Dynamic mesh path tracing."
                startExpanded={true}
              >
                <PingPayloadVisualizer hopPath={hopPath} isPong={!config.wantAck} />
              </ProcessingStep>
            )}

            {config.type === PacketType.ACK && ackedPacketInfo && (
              <ProcessingStep
                ref={payloadVizRef}
                title="ACK Payload"
                description="Acknowledgement payload structure with embedded telemetry."
                startExpanded={true}
              >
                <AckPayloadVisualizer ackedInfo={ackedPacketInfo} />
              </ProcessingStep>
            )}

            {config.type === PacketType.TELEMETRY && telemetryPacketInfo && (
              <ProcessingStep
                ref={payloadVizRef}
                title="Telemetry Payload"
                description="Sensor data encoding."
                startExpanded={true}
              >
                <TelemetryPayloadVisualizer telemetryInfo={telemetryPacketInfo} payload={processingResult.rawPacket.payload} />
              </ProcessingStep>
            )}

            <ProcessingStep
              title="Data Whitening (PN15)"
              description="XOR with Sync Word and PN15 sequence to increase entropy before FEC."
            >
              <WhiteningVisualizer
                rawData={processingResult.rawPacket.data}
                whitenedData={processingResult.whitened}
                syncWord={syncWord}
                pn15Sequence={processingResult.pn15Sequence}
              />
            </ProcessingStep>

            <ProcessingStep
              title="Forward Error Correction"
              description="Reed-Solomon (128,96) encoding applied to whitened data."
            >
              <FecVisualizer
                data={processingResult.rsEncoded.data}
                parity={processingResult.rsEncoded.parity}
              />
            </ProcessingStep>

            <ProcessingStep
              title="Protocol Efficiency"
              description="Payload vs. Overhead analysis."
            >
              <OverheadChart
                lengths={{
                  preamble: preambleBytes.length,
                  syncWord: syncWord.length,
                  header: processingResult.rawPacket.header.length,
                  payload: processingResult.rawPacket.payload.length,
                  signature: processingResult.rawPacket.signature.length,
                  parity: 32, // RS(128,96) parity is 32 bytes
                }}
              />
            </ProcessingStep>

            <ProcessingStep
              title="Security Avalanche Effect"
              description="Demonstrating Poly1305 sensitivity to input changes."
            >
              <AvalancheVisualizer
                rawPacket={processingResult.rawPacket}
                sharedSecret={sharedSecret}
                calculatePoly1305={Hermes.calculatePoly1305}
              />
            </ProcessingStep>

            <ProcessingStep
              title="Mesh Simulation"
              description="Visualizing managed flooding and CSMA/CA behavior."
            >
              <MeshVisualizer />
            </ProcessingStep>

          </div>
        </div>
      </div>
    </main>
  );
}