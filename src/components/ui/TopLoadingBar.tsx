// src/components/ui/TopLoadingBar.tsx
"use client";

import { useEffect, useState } from "react";

interface TopLoadingBarProps {
  /**
   * Set to true to start the loading animation.
   */
  isLoading: boolean;
}

export function TopLoadingBar({ isLoading }: TopLoadingBarProps) {
  // progress holds the current width percentage of the loading bar.
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    if (isLoading) {
      // Start the loading animation.
      setProgress(0);
      timer = setInterval(() => {
        // Increase progress by a random value; cap at 90%
        setProgress((prev) => {
          const increment = Math.random() * 10;
          const next = prev + increment;
          return next < 90 ? next : 90;
        });
      }, 200);
    } else {
      // When loading is done, quickly fill the bar and then hide it.
      setProgress(100);
      const timeout = setTimeout(() => {
        setProgress(0);
      }, 300);
      return () => clearTimeout(timeout);
    }

    return () => clearInterval(timer);
  }, [isLoading]);

  // If progress is 0, render nothing.
  if (progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 z-50" style={{ width: "100%" }}>
      <div
        style={{
          height: "3px",
          width: `${progress}%`,
          background: "linear-gradient(90deg, #4b5563, #10100E, #FFFFE3)",
          transition: "width 0.2s ease-out",
        }}
      />
    </div>
  );
}
