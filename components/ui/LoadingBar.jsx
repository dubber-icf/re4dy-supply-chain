/* components/ui/LoadingBar.jsx */
import React, { useEffect, useState } from 'react';

// NOTE: Custom loading bar without external dependencies
// Uses CSS transitions for smooth animation
export function LoadingBar({
  isLoading,
  color = '#005EB8',
  height = '3px',
  className = ''
}) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval;
    let timeout;

    if (isLoading) {
      setVisible(true);
      setProgress(10);

      // Simulate progress with realistic timing
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);
    } else {
      // Complete the progress bar
      setProgress(100);

      // Hide after animation completes
      timeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 ${className}`}
      style={{ height }}
      role="progressbar"
      aria-label="Loading progress"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: color,
          boxShadow: `0 0 10px ${color}40`
        }}
      />
    </div>
  );
}

/* 👇👇  THE ONE-LINE FIX  👇👇 */
export default LoadingBar;