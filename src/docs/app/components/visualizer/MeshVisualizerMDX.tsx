'use client';

import React from 'react';
import MeshVisualizer from './MeshVisualizer';

interface MeshVisualizerMDXProps { }

export function MeshVisualizerMDX(props: MeshVisualizerMDXProps) {
    return (
        <div className="not-prose my-6 max-w-4xl mx-auto">
            <MeshVisualizer />
        </div>
    );
}

export default MeshVisualizerMDX;
