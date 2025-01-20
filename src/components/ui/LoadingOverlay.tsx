// LoadingOverlay.tsx
import React from "react";

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-50 transition-opacity duration-300 ease-in-out">
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse-fast flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-neutral-300 dark:border-neutral-600 border-t-blue-500 animate-spin" />
          <div className="text-neutral-600 dark:text-neutral-300 font-medium">
            Loading...
          </div>
        </div>
      </div>
    </div>
  );
}
