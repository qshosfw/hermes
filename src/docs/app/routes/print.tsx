'use client';

import type { Route } from './+types/print';
import { source } from '@/lib/source';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Mermaid } from 'fumadocs-mermaid/ui';
import React, { useEffect, useState, Suspense } from 'react';
import browserCollections from 'fumadocs-mdx:collections/browser';
import { FileText, Shield, Globe, Cpu } from 'lucide-react';

export function meta({ }: Route.MetaArgs) {
    return [
        { title: 'RFC: Hermes Protocol Specification' },
        { name: 'description', content: 'Official Formal Specification for the Hermes Link Protocol' },
    ];
}

class MermaidErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
        console.warn("Mermaid diagram rendering failed:", error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 font-mono text-xs overflow-auto my-4">
                    <p className="font-bold mb-2 text-black">Failed to render Mermaid diagram:</p>
                    <pre className="whitespace-pre-wrap">{this.state.error?.message || "Unknown error"}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

const SafeMermaid = (props: any) => (
    <MermaidErrorBoundary>
        <Mermaid {...props} />
    </MermaidErrorBoundary>
);

const clientLoader = browserCollections.docs.createClientLoader({
    component(
        { frontmatter, default: Mdx },
        { path }: { path: string }
    ) {
        return (
            <div className="print-section print:break-before-page w-full py-8">
                <div className="border-b border-black/20 pb-1 mb-6 flex justify-between items-baseline">
                    <span className="text-[10pt] font-serif uppercase tracking-wider text-black/60">
                        {frontmatter.title}
                    </span>
                    <span className="text-[9pt] font-mono text-black/40">
                        [Hermes RFC Spec]
                    </span>
                </div>

                <div className="prose prose-neutral max-w-none font-serif text-black print-latex-body prose-headings:font-serif prose-headings:text-black prose-headings:uppercase prose-headings:tracking-widest prose-p:text-justify prose-a:text-black prose-a:underline prose-code:font-mono prose-code:text-[0.9em] prose-code:bg-neutral-50 prose-pre:bg-neutral-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:text-black leading-relaxed">
                    <Mdx components={{ ...defaultMdxComponents, Mermaid: SafeMermaid }} />
                </div>
            </div>
        );
    },
});

function PrintSection({ page }: { page: any }) {
    return clientLoader.useContent(page.path, { path: page.path });
}

export default function PrintLayout() {
    const [isReady, setIsReady] = useState(false);
    const pages = source.getPages();

    useEffect(() => {
        console.log("RFC Aggregate: Found", pages.length, "documentation modules.");
        const timer = setTimeout(() => {
            console.log("RFC Aggregate: Setting IS_READY to true.");
            setIsReady(true);
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isReady) {
            console.log("RFC Aggregate: Triggering window.print().");
            const t = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(t);
        }
    }, [isReady]);

    return (
        <div className="bg-white min-h-screen text-black print:text-black print:bg-white font-serif tracking-tight selection:bg-neutral-200">
            {/* RFC Institutional Styles */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

                :root {
                    --font-serif: 'Crimson Pro', 'Georgia', serif;
                    --font-mono: 'JetBrains Mono', monospace;
                }

                @media screen {
                    body {
                        background-color: #f5f5f5;
                    }
                }

                @media print {
                    @page {
                        size: A4;
                        margin: 2.5cm 2cm;
                    }
                    
                    body {
                        font-family: var(--font-serif);
                        font-size: 11pt;
                        line-height: 1.5;
                        color: black !important;
                        background: white !important;
                    }

                    h1, h2, h3, h4, h5, h6 {
                        page-break-after: avoid;
                    }

                    pre, blockquote {
                        page-break-inside: avoid;
                    }

                    .print-section {
                        page-break-inside: auto;
                    }

                    /* Section-prefix numbering handles via CSS Counters */
                    body {
                        counter-reset: section;
                    }

                    /* Aggressive UI removal */
                    button, nav, header, footer, .no-print {
                        display: none !important;
                    }

                    /* Markdown Overrides for Proper RFC look */
                    .prose {
                        font-size: 11pt;
                    }
                    
                    /* Code styling for print */
                    pre, code {
                        background-color: #fafafa !important;
                        border: 0.5pt solid #eee !important;
                        font-family: var(--font-mono) !important;
                        font-size: 9.5pt !important;
                    }

                    /* Table handling */
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 10pt !important;
                    }
                    th, td {
                        border: 0.5pt solid #ddd !important;
                        padding: 6pt !important;
                    }
                }

                .font-serif { font-family: var(--font-serif); }
                .font-mono { font-family: var(--font-mono); }
            `}</style>

            <main className="max-w-[850px] mx-auto p-16 print:p-0 bg-white shadow-xl print:shadow-none min-h-screen ring-1 ring-black/5 print:ring-0">

                {/* RFC FORMAL COVER PAGE */}
                <div className="min-h-screen flex flex-col print:break-after-page mb-24 print:mb-0 relative py-12">

                    {/* Header Block */}
                    <div className="flex justify-between border-b-2 border-black pb-8 mb-16 items-start">
                        <div className="space-y-1 font-mono text-[10pt] uppercase tracking-tighter text-black/70">
                            <p>Network Working Group</p>
                            <p>Request for Comments: 0001</p>
                            <p>Category: Standards Track</p>
                            <p>ISSN: 2070-1721</p>
                        </div>
                        <div className="text-right space-y-1 font-mono text-[10pt] text-black/70">
                            <p>Hermes Project</p>
                            <p>March 2026</p>
                        </div>
                    </div>

                    {/* Title Block */}
                    <div className="text-center py-20 space-y-6">
                        <h1 className="text-5xl font-bold tracking-normal uppercase font-serif border-y-4 border-black py-12 mb-12">
                            Hermes Link Protocol<br />
                            <span className="text-2xl font-normal lowercase italic tracking-normal">(Version 1.1)</span>
                        </h1>

                        <div className="max-w-xl mx-auto space-y-8">
                            <div className="flex items-center justify-center space-x-12 opacity-80">
                                <Shield className="w-12 h-12" />
                                <Globe className="w-12 h-12" />
                                <Cpu className="w-12 h-12" />
                            </div>
                        </div>
                    </div>

                    {/* Abstract Block */}
                    <div className="mt-auto bg-neutral-50 p-12 border border-black/10 rounded-sm italic">
                        <h3 className="font-mono text-xs uppercase tracking-[0.3em] font-bold mb-4 text-black/60">Abstract</h3>
                        <p className="text-[12pt] leading-relaxed text-black/80 font-serif">
                            This document specifies Hermes Link, a resilient, encrypted digital mesh protocol designed specifically for
                            hardware-constrained VHF/UHF transceivers. Hermes integrates AES-256 equivalent security via ChaCha20-Poly1305,
                            Reed-Solomon forward error correction, and link-quality aware controlled flooding to provide a robust
                            communication substrate for disaster-recovery, off-grid telemetry, and secure tactical messaging.
                        </p>

                        <div className="mt-8 flex justify-between items-end border-t border-black/5 pt-6 font-mono text-[9pt] text-black/40">
                            <div>
                                <p className="uppercase tracking-widest text-black/60 font-bold mb-1">Status of this Memo</p>
                                <p>This is an Internet Standards Track document.</p>
                            </div>
                            <div className="text-right">
                                <p>© 2026 QSHOSFW Project</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTENT PAGES */}
                <div className="space-y-12">
                    <Suspense fallback={null}>
                        {pages.map(page => (
                            <PrintSection key={page.url} page={page} />
                        ))}
                    </Suspense>
                </div>

            </main>

            {/* PREVIEW LOADING OVERLAY */}
            {!isReady && (
                <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 print:hidden text-black transition-opacity duration-300">
                    <div className="space-y-8 flex flex-col items-center max-w-[500px] text-center">
                        <div className="w-24 h-24 border-t-2 border-black rounded-full animate-spin"></div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold uppercase tracking-widest font-serif">Compiling Formal RFC Spec</h3>
                            <p className="text-sm text-neutral-500 font-serif lowercase italic">
                                assembling 28 modules, typesetting serif typography, and calculating page flows...
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
