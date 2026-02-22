'use client';

import type { Route } from './+types/print';
import { source } from '@/lib/source';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Mermaid } from 'fumadocs-mermaid/ui';
import React, { useEffect, useState, Suspense } from 'react';
import browserCollections from 'fumadocs-mdx:collections/browser';
import { FileText } from 'lucide-react';

export function meta({ }: Route.MetaArgs) {
    return [
        { title: 'Hermes Protocol - Complete Print Specification' },
        { name: 'description', content: 'Aggregated Hermes Protocol Documentation for PDF Export' },
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
                    <p className="font-bold mb-2">Failed to render Mermaid diagram:</p>
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
            <div className="print-section print:break-before-page w-full pt-12 pb-8">
                <div className="border-b-2 border-black pb-2 mb-8">
                    <h1 className="text-3xl font-bold font-serif text-black uppercase tracking-widest leading-tight">{frontmatter.title}</h1>
                    {frontmatter.description && (
                        <p className="text-sm tracking-wide text-neutral-600 mt-2 font-serif uppercase">
                            {frontmatter.description}
                        </p>
                    )}
                </div>
                {/* 
                  The max-w-none allows MDX components to stretch full A4 width. 
                  We override fonts to serif for a LaTeX aesthetic.
                */}
                <div className="prose prose-neutral max-w-none font-serif text-black print-latex-body prose-headings:font-serif prose-headings:text-black prose-p:text-justify prose-a:text-black prose-a:underline prose-code:font-mono prose-code:text-[0.85em] prose-pre:bg-neutral-100 prose-pre:border prose-pre:border-neutral-300 prose-pre:text-black">
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
        // Since we are loading massive MDX components client-side, give them exactly 3.5 
        // seconds to fetch, parse, and paint to the DOM, including any Mermaid charts.
        const timer = setTimeout(() => {
            setIsReady(true);
        }, 3500);

        return () => clearTimeout(timer);
    }, []);

    // Secondary effect to fire window.print() after React cleans up the loading overlay DOM
    useEffect(() => {
        if (isReady) {
            const t = setTimeout(() => {
                window.print();
            }, 250);
            return () => clearTimeout(t);
        }
    }, [isReady]);

    return (
        <div className="bg-white min-h-screen text-black print:text-black print:bg-white font-serif tracking-tight">
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 2.5cm;
                    }
                    /* Base styles for LaTeX feel */
                    body {
                        font-size: 11pt;
                        line-height: 1.6;
                        color: black !important;
                        background: white !important;
                    }
                    /* Number pages via CSS counters if possible */
                    @page {
                        @bottom-right {
                            content: counter(page);
                            font-family: serif;
                            font-size: 10pt;
                        }
                    }
                    /* Aggressive Light Mode overwrite for React Components natively trapped in dark mode */
                    .print-section [class*="bg-neutral-8"],
                    .print-section [class*="bg-neutral-9"],
                    .print-section [class*="bg-neutral-950"],
                    .print-section [class*="bg-black"] {
                        background-color: transparent !important;
                        border: 1px solid #d4d4d8 !important;
                    }
                    .print-section [class*="text-neutral-"],
                    .print-section [class*="text-white"],
                    .print-section [class*="text-amber-"],
                    .print-section [class*="text-rose-"],
                    .print-section [class*="text-sky-"],
                    .print-section [class*="text-emerald-"] {
                        color: black !important;
                    }
                    .print-section svg text {
                        fill: black !important;
                        color: black !important;
                    }
                    /* Code/Pre formatting overrides */
                    pre, code {
                        background-color: #f4f4f5 !important;
                        border: 1px solid #e4e4e7 !important;
                        white-space: pre-wrap !important;
                        word-break: break-all !important;
                        overflow-x: hidden !important;
                    }
                    input, textarea, select {
                        background-color: transparent !important;
                        border: 1px solid transparent !important;
                        border-bottom: 1px solid #e4e4e7 !important;
                        color: black !important;
                        box-shadow: none !important;
                    }
                    /* Hide anything interactive during physical print */
                    button, input[type="checkbox"], .no-print, nav, header {
                        display: none !important;
                    }
                }
            `}</style>

            <main className="max-w-[750px] mx-auto p-12 print:p-0">

                {/* LaTeX-style Cover Page */}
                <div className="min-h-screen flex flex-col items-center justify-center text-center space-y-8 print:break-after-page mb-24 print:mb-0">
                    <div className="mb-8 opacity-80">
                        <FileText className="w-24 h-24 mx-auto text-black" />
                    </div>

                    <div className="border-t-4 border-b-4 border-black py-10 w-full mb-8">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-widest uppercase text-black">
                            Hermes Protocol
                        </h1>
                        <h2 className="text-xl md:text-2xl font-normal tracking-wider text-black max-w-[600px] mx-auto leading-relaxed">
                            Formal specification for a highly-resilient<br />
                            Low Power Radio Network architecture.
                        </h2>
                    </div>

                    <div className="text-md text-black/80 font-bold uppercase tracking-widest mt-16 space-y-2">
                        <p>Request For Comments (RFC)</p>
                        <p>Generated Document Specification</p>
                    </div>

                    <div className="absolute bottom-24 text-sm text-black/60 font-bold tracking-[0.2em] uppercase">
                        {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>

                {/* Aggregated Content within a single Suspense so they wait for each other */}
                <Suspense fallback={null}>
                    {pages.map(page => (
                        <PrintSection key={page.url} page={page} />
                    ))}
                </Suspense>

            </main>

            {/* Non-print UI Loading Box */}
            {!isReady && (
                <div className="fixed inset-0 bg-neutral-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 print:hidden text-white transition-opacity duration-300">
                    <div className="space-y-6 flex flex-col items-center max-w-[400px] text-center">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-4 border-neutral-700/50"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-white border-t-transparent animate-[spin_1.5s_linear_infinite]"></div>
                        </div>
                        <h3 className="text-xl font-bold uppercase tracking-widest font-mono">Generating PDF Spec</h3>
                        <p className="text-xs text-neutral-400 font-mono">
                            Aggregating all dynamic MDX modules, compiling Markdown trees, and injecting LaTeX print typography constraints.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
