// src/components/ui/LoadingOverlay.tsx
"use client";

import React from "react";
import { ShimmerCard } from "./ShimmerCard";

/**
 * LoadingOverlay displays a shimmer effect overlay for the content area.
 * It is designed to be positioned absolutely within a relatively positioned container.
 */
export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300 ease-in-out">
      {/* Adjust the width/number of shimmer cards as needed */}
      <div className="w-full max-w-3xl">
        <ShimmerCard />
      </div>
    </div>
  );
}
