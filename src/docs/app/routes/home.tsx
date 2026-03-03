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
      <div className="relative w-full flex-1 flex flex-col bg-background text-foreground selection:bg-primary/20 overflow-hidden">

        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
        </div>

        <main className="relative z-10 container mx-auto px-6 pt-24 pb-32 max-w-6xl">

          {/* Main Hero */}
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            <div className="flex-[1.2] text-center lg:text-left space-y-10">
              <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full border border-primary/10 bg-muted/30 backdrop-blur-sm transition-all hover:bg-muted/50 group cursor-default">
                <Badge variant="secondary" className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border-none">v1.0.0</Badge>
                <span className="text-[11px] font-medium text-muted-foreground/80">Exhaustive RFC Specifications released</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
              </div>

              <div className="space-y-6">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.05]">
                  Engineered for <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-foreground via-foreground to-muted-foreground/40 italic">Extreme Resilience.</span>
                </h1>
                <p className="text-muted-foreground/80 text-lg md:text-xl max-w-2xl leading-relaxed font-light">
                  Hermes Link is a high-availability 1.2kbps FSK protocol for
                  embedded RF environments. Decentralized mesh flooding with
                  nested AEAD security and RS(128,96) error correction.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Button asChild size="lg" className="h-12 px-10 font-bold text-xs tracking-widest uppercase rounded-full shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all">
                  <Link to="/docs/rfc/01-introduction"> Read the RFC </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-10 font-bold text-xs tracking-widest uppercase rounded-full border-border/60 hover:bg-muted/30 transition-all backdrop-blur-sm">
                  <Link to="/simulator"> Mesh Simulator </Link>
                </Button>
              </div>
            </div>

            <div className="flex-1 w-full max-w-sm hidden lg:block relative group">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <ProtocolStackHero />
            </div>
          </div>

          {/* Core Technical Specifications Section */}
          <div className="mt-48 grid grid-cols-1 md:grid-cols-2 gap-20 items-center border-t pt-32 border-border/10">
            <div className="space-y-12">
              <div className="space-y-6">
                <div className="p-3 w-fit rounded-xl bg-primary/5 text-primary border border-primary/10">
                  <Terminal className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">The Low-Level Philosophy</h2>
                <p className="text-muted-foreground leading-relaxed text-lg font-light">
                  Developed for the Beken BK4819 transceivers, Hermes prioritizes
                  mathematical delivery assurance over raw throughput. Every bit on the air
                  is hardened against burst interference and physical tampering.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/80">Spectral Integrity</h4>
                  </div>
                  <p className="text-xs text-muted-foreground/70 leading-relaxed font-medium">
                    Integrated PN15 scrambling ensures DC neutrality across long packets, effectively eliminating bit-slip in high-noise floor narrow-band scenarios.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/80">Reed-Solomon FEC</h4>
                  </div>
                  <p className="text-xs text-muted-foreground/70 leading-relaxed font-medium">
                    Utilizing RS(128,96) block coding at the end of the pipeline to recover up to 12% frame corruption without expensive re-transmissions.
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent rounded-2xl blur-2xl" />
              <PacketStructureVisual />
            </div>
          </div>

          {/* Functional Philosophy - Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-48">
            {[
              {
                title: "Controlled Flooding",
                desc: "SNR-weighted backoff timers and deduplication caches ensure packets travel the mesh with zero coordinator overhead.",
                icon: <Network className="w-6 h-6" />,
                color: "text-emerald-400"
              },
              {
                title: "Nested AEAD Trust",
                desc: "ChaCha20-Poly1305 encryption provides total unlinkability between hops while maintaining end-to-end payload privacy.",
                icon: <Lock className="w-6 h-6" />,
                color: "text-blue-400"
              },
              {
                title: "FSK Air Interface",
                desc: "12389Hz discriminator tuning for 1200bps FSK. Carefully timed frequency shifts for maximum receiver lock stability.",
                icon: <Activity className="w-6 h-6" />,
                color: "text-rose-400"
              }
            ].map((f, i) => (
              <Card key={i} className="bg-muted/10 border-border/40 hover:bg-muted/20 hover:border-border transition-all duration-300 group overflow-hidden">
                <CardHeader className="space-y-4">
                  <div className={`${f.color} transition-transform group-hover:scale-110 duration-500`}>{f.icon}</div>
                  <CardTitle className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed italic">
                    {f.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA Footer Section */}
          <div className="mt-48 relative rounded-3xl overflow-hidden border border-primary/10 bg-gradient-to-b from-muted/5 to-muted/20 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-[40%] h-full bg-primary/5 rounded-full blur-[100px] transform translate-x-1/2" />
            <div className="p-16 md:p-24 flex flex-col items-center text-center space-y-10 relative z-10">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight max-w-2xl mx-auto">
                  Build of a more resilient world.
                </h2>
                <p className="text-muted-foreground text-lg max-w-xl mx-auto font-light">
                  Join the open-source community developing Hermes Link for the next generation of critical digital communication.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-6 w-full">
                <Button asChild size="lg" className="h-12 px-10 font-bold tracking-widest rounded-full shadow-lg shadow-primary/20">
                  <Link to="/docs/rfc/01-introduction">Get Started</Link>
                </Button>
                <Button variant="outline" asChild size="lg" className="h-12 px-10 font-bold tracking-widest rounded-full border-border/60 hover:bg-muted/30 font-mono text-[10px]">
                  <a href="/hermes-protocol-spec.pdf" target="_blank">View PDF Spec</a>
                </Button>
              </div>
            </div>
          </div>

        </main>
      </div>
    </HomeLayout>
  );
}
