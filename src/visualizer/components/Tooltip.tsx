import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Since we use position: fixed, we use viewport coordinates directly.
      // Do not add window.scrollY.
      setCoords({
        top: rect.top - 8, // 8px gap above
        left: rect.left + rect.width / 2,
      });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // Update position on scroll/resize if visible
  useEffect(() => {
    if (isVisible) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        className={className || "inline-flex items-center"}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        {children}
      </div>
      {isVisible && createPortal(
        <div
          className="fixed z-[9999] px-3 py-2 text-xs font-medium text-neutral-200 bg-neutral-950 border border-neutral-800 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.5)] pointer-events-none transform -translate-x-1/2 -translate-y-full animate-fade-in w-max max-w-[280px] leading-relaxed"
          style={{ top: coords.top, left: coords.left }}
        >
          {content}
          <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-neutral-950 border-r border-b border-neutral-800 transform rotate-45 clip-path-triangle"></div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Tooltip;