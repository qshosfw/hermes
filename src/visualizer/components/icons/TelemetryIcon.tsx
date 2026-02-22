import React from 'react';

const TelemetryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v18h18" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 9l-4.28 8.559a.75.75 0 0 1-1.34 0l-2.78-5.559-2.14 4.28a.75.75 0 0 1-1.34 0L3.75 10.5" />
  </svg>
);

export default TelemetryIcon;