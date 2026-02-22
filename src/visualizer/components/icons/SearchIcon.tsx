import React from 'react';

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 7.5v6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5h-6" />
  </svg>
);

export default SearchIcon;