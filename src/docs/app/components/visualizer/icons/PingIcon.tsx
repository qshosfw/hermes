import React from 'react';

const PingIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.25c4.142 0 7.5 3.358 7.5 7.5s-3.358 7.5-7.5 7.5-7.5-3.358-7.5-7.5 3.358-7.5 7.5-7.5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.25a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c5.799 0 10.5 4.701 10.5 10.5S17.799 23.25 12 23.25 1.5 18.549 1.5 12.75 6.201 2.25 12 2.25Z" opacity="0.3" />
  </svg>
);

export default PingIcon;