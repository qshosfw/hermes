import type { Route } from './+types/home';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Link } from 'react-router';
import { baseOptions } from '@/lib/layout.shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProtocolStackHero, PacketStructureVisual } from '@/components/ProtocolBranding';
import { ShieldCheck, Zap, Network, Lock, Layers, BookOpen, Terminal, Activity, ArrowRight } from 'lucide-react';

export function meta({ }: Route.MetaArgs) {
  return [
    { title: 'Hermes Protocol | Resilient Radio Mesh' },
    { name: 'description', content: 'A sober, engineering-first FSK mesh protocol for critical digital communication over analog radio.' },
  ];
}

export default function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="relative w-full flex-1 flex flex-col bg-background text-foreground selection:bg-primary/20">

        {/* Subtle Background Surface */}
        <div className="absolute inset-x-0 top-0 h-[600px] bg-gradient-to-b from-muted/50 to-transparent pointer-events-none border-b border-border/5" />

        <main className="relative z-10 container mx-auto px-4 pt-24 pb-32 max-w-6xl">

          {/* Main Hero */}
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 text-center lg:text-left space-y-8">
              <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full border bg-muted/40 transition-colors hover:bg-muted/60">
                <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 py-0 rounded-full">v1.0.0</Badge>
                <span className="text-[11px] font-medium text-muted-foreground mr-1">Read the public RFC specifications</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground opacity-50" />
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-foreground leading-[1.1]">
                  A Resilient <br />
                  <span className="text-muted-foreground">Radio Mesh Protocol.</span>
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl max-w-2xl leading-relaxed">
                  Hermes Link is a modernized 1.2kbps FSK protocol designed for
                  embedded RF hardware. Engineered for high-noise floor environments
                  with decentralized mesh flooding.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Button asChild size="lg" className="h-10 px-8 font-semibold text-xs tracking-tight uppercase rounded-md shadow-sm">
                  <Link to="/docs/rfc/01-introduction"> Documentation </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-10 px-8 font-semibold text-xs tracking-tight uppercase rounded-md border-border/60">
                  <Link to="/simulator"> Launch Simulator </Link>
                </Button>
              </div>
            </div>

            <div className="flex-1 w-full max-w-sm hidden lg:block">
              <ProtocolStackHero />
            </div>
          </div>

          {/* Core Technical Specifications */}
          <div className="mt-40 grid grid-cols-1 md:grid-cols-2 gap-16 items-center border-t pt-24 border-border/40">
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="p-2 w-fit rounded-lg bg-primary/5 text-primary">
                  <Terminal className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Technical Design Goals</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Developed specifically for the Beken BK4819 transceivers, Hermes prioritizes
                  mathematical reliability over throughput. Every packet is designed to survive
                  intense burst interference.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Spectral Integrity</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Integrated PN15 scrambling ensures DC neutrality across long packet strings, drastically reducing bit-slip in high house-floor scenarios.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Forward Correction</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Utilizing Reed-Solomon(128,96) symbols to autonomously recover up to 12% frame corruption without expensive re-transmissions.
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full">
              <PacketStructureVisual />
            </div>
          </div>

          {/* Functional Philosophy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-40">
            {[
              {
                title: "Controlled Flooding",
                desc: "Autonomous mesh routing using SNR-weighted dynamic backoffs for reliable propagation without master coordinators.",
                icon: <Network className="w-5 h-5" />
              },
              {
                title: "AEAD Security",
                desc: "Integrated ChaCha20-Poly1305 authenticated encryption. Cryptographically signs entire headers to prevent TTL spoofing.",
                icon: <Lock className="w-5 h-5" />
              },
              {
                title: "NRZI Link",
                desc: "Non-return-to-zero inverted bit encoding with clock recovery routines designed for low-cost hardware oscillators.",
                icon: <Layers className="w-5 h-5" />
              }
            ].map((f, i) => (
              <div key={i} className="space-y-4">
                <div className="text-primary font-semibold">{f.icon}</div>
                <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA Footer Section */}
          <div className="mt-40 border rounded-xl overflow-hidden bg-muted/30 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <div className="p-12 md:p-16 flex flex-col items-center text-center space-y-8">
              <h2 className="text-3xl font-semibold tracking-tight max-w-xl">
                Start implementing the Hermes protocol today.
              </h2>
              <div className="flex flex-wrap justify-center gap-4 w-full pt-2">
                <Button asChild className="h-10 px-8 font-semibold tracking-tight rounded-md shadow-sm">
                  <Link to="/docs/rfc/01-introduction">Get Started</Link>
                </Button>
                <Button variant="outline" asChild className="h-10 px-8 font-semibold tracking-tight rounded-md bg-transparent border-border/60">
                  <a href="/hermes/hermes-protocol-spec.pdf" target="_blank">Download PDF Spec</a>
                </Button>
              </div>
            </div>
          </div>

        </main>
      </div>
    </HomeLayout>
  );
}
