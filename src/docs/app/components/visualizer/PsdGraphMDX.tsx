'use client';

import React from 'react';
import PsdGraph from './PsdGraph';

interface PsdGraphMDXProps { }

export function PsdGraphMDX(props: PsdGraphMDXProps) {
    return (
        <div className="not-prose my-8">
            <PsdGraph />
        </div>
    );
}

export default PsdGraphMDX;
