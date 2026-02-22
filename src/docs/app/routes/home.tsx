import type { Route } from './+types/home';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Link } from 'react-router';
import { baseOptions } from '@/lib/layout.shared';
import { TerminalSquare, Radio, ShieldCheck, Zap, Network, Lock, Layers } from 'lucide-react';

export function meta({ }: Route.MetaArgs) {
  return [
    { title: 'Hermes Protocol - Resilient LPRN' },
    { name: 'description', content: 'A rugged 1.2kbps FSK Mesh Protocol designed for high-noise RF environments.' },
  ];
}

export default function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="relative w-full flex-1 flex flex-col items-center bg-[#0a0a0a] overflow-hidden font-sans text-neutral-200">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Subtle Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] block"></div>
          {/* Animated Glow Orbs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]"></div>
          <div className="absolute top-1/4 right-0 w-[500px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] mix-blend-screen"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-sky-500/10 rounded-full blur-[120px] mix-blend-screen"></div>
        </div>

        {/* Hero Section */}
        <section className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-32 pb-24 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-sky-500/20 rounded-full bg-sky-500/5 backdrop-blur-md mb-8 hover:bg-sky-500/10 transition-all shadow-xl cursor-default group">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
            </span>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">v1.0 Protocol Specifications Live</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-neutral-200 to-neutral-600 drop-shadow-2xl">
            Hermes Protocol
          </h1>

          <p className="text-neutral-400 max-w-3xl text-lg md:text-2xl leading-relaxed tracking-wide font-medium mb-12">
            A highly-resilient <span className="text-white font-bold drop-shadow-md">1.2kbps FSK</span> Radio Mesh Protocol architecture engineered for severe noise-floor deterioration and decentralized communication.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6 w-full justify-center">
            <Link
              to="/docs/rfc/01-introduction"
              className="relative px-8 py-4 bg-white text-black text-sm uppercase tracking-widest font-black rounded-xl shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] hover:-translate-y-1 transition-all overflow-hidden group flex items-center justify-center w-full sm:w-auto min-w-[280px]"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>
              <TerminalSquare className="w-5 h-5 mr-3 opacity-70 group-hover:scale-110 transition-transform" /> Read The Documentation
            </Link>
            <Link
              to="/simulator"
              className="relative px-8 py-4 bg-neutral-900/50 backdrop-blur-xl border border-neutral-700/50 hover:border-sky-500/50 text-neutral-200 text-sm uppercase tracking-widest font-black rounded-xl hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(14,165,233,0.15)] transition-all group flex items-center justify-center w-full sm:w-auto min-w-[280px]"
            >
              <Radio className="w-5 h-5 mr-3 text-sky-400/80 group-hover:text-sky-400 group-hover:scale-110 transition-all" /> Advanced Mesh Simulator
            </Link>
          </div>
        </section>

        {/* Quick Specs Strip */}
        <section className="relative z-10 w-full border-y border-white/5 bg-black/40 backdrop-blur-md py-12">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/5">
            {[
              { metric: "128 Bytes", label: "Fixed Packet Payload", color: "text-emerald-400" },
              { metric: "1.2 kbps", label: "Optimized FSK Rate", color: "text-sky-400" },
              { metric: "RS(128,96)", label: "Forward Error Correction", color: "text-indigo-400" },
              { metric: "Poly1305", label: "Cryptographic AEAD", color: "text-rose-400" }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center group">
                <span className={`text-3xl md:text-4xl font-black tracking-tighter mb-2 ${stat.color} drop-shadow-lg group-hover:scale-105 transition-transform`}>{stat.metric}</span>
                <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Core Architecture Features */}
        <section className="relative z-10 w-full max-w-7xl mx-auto px-6 py-32">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight text-white">Engineered for Extremes</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto text-lg leading-relaxed font-medium">Every byte is accounted for. The Hermes protocol is built from the ground up to guarantee delivery when standard line-of-sight fails.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Chaotic Flooding",
                desc: "Decentralized, self-healing path routing algorithms that autonomously avoid massive transmission loops and congestion using SNR-based dynamic backoffs.",
                icon: <Network className="w-8 h-8 text-sky-400" />,
                bg: "from-sky-500/5 to-transparent",
                border: "hover:border-sky-500/30"
              },
              {
                title: "Cryptographic Integrity",
                desc: "Military-grade ChaCha20-Poly1305 AEAD cipher securing small packets natively across public frequencies. Complete defense against replay and spoofing attacks.",
                icon: <Lock className="w-8 h-8 text-rose-400" />,
                bg: "from-rose-500/5 to-transparent",
                border: "hover:border-rose-500/30"
              },
              {
                title: "Data Link Resilience",
                desc: "Deep physical layer definitions specific to raw FSK operation. Employs 3:1 Interleaving, Whitening, and Reed-Solomon FEC to crush burst interference.",
                icon: <Layers className="w-8 h-8 text-emerald-400" />,
                bg: "from-emerald-500/5 to-transparent",
                border: "hover:border-emerald-500/30"
              }
            ].map((ft, i) => (
              <div key={i} className={`relative p-8 rounded-3xl bg-gradient-to-b ${ft.bg} bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 transition-all duration-300 ${ft.border} hover:-translate-y-2 group overflow-hidden`}>
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                  {ft.icon}
                </div>
                <div className="w-16 h-16 rounded-2xl bg-black/50 border border-white/5 flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all">
                  {ft.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">{ft.title}</h3>
                <p className="text-neutral-400 leading-relaxed font-medium">{ft.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="relative z-10 w-full border-t border-white/5 bg-gradient-to-t from-sky-900/10 to-transparent py-24 mb-12">
          <div className="max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
            <Zap className="w-12 h-12 text-sky-400 mb-6 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-white tracking-tight">Ready to build the Mesh?</h2>
            <p className="text-neutral-400 text-lg mb-10 max-w-2xl font-medium">Dive straight into the Request for Comments (RFC) specifications or interactively simulate packet lifecycles using our visualizer tool.</p>
            <Link
              to="/docs/rfc/01-introduction"
              className="px-8 py-4 bg-sky-500 hover:bg-sky-400 text-sky-950 font-black tracking-widest uppercase text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_40px_rgba(56,189,248,0.5)] hover:-translate-y-1"
            >
              Start Reading v1.0
            </Link>
          </div>
        </section>

      </div>
    </HomeLayout>
  );
}
