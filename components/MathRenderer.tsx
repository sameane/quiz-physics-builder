import React, { useEffect, useRef, memo } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '', inline = false }) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 1. Manually set the content. This ensures we start with the raw LaTeX string
    // and prevents React from interfering with MathJax's subsequent DOM manipulations.
    el.innerHTML = content;

    // 2. Trigger MathJax typesetting on this specific element
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([el])
        .catch((err: any) => console.warn('MathJax typesetting error:', err));
    }
  }, [content]);

  const Tag = inline ? 'span' : 'div';

  // We do NOT use dangerouslySetInnerHTML here. 
  // We let the useEffect manage the content to decouple React's render cycle 
  // from MathJax's DOM changes.
  return (
    <Tag 
      ref={containerRef as any} 
      className={className} 
    />
  );
};

// React.memo is crucial here. It prevents the component from re-rendering (and resetting the DOM)
// when the parent updates but the content prop hasn't changed.
export default memo(MathRenderer);