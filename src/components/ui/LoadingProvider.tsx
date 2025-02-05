// src/components/ui/LoadingProvider.tsx
"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
} from "react";
import { LoadingOverlay } from "./LoadingOverlay";

// Define the shape of our loading context.
type LoadingContextType = {
  setLoading: (loading: boolean) => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Configuration for debounce and minimum display times (in milliseconds)
const DEBOUNCE_DELAY = 300; // Delay before showing the overlay
const MIN_DISPLAY_TIME = 300; // Minimum time to display the overlay

export function LoadingProvider({ children }: { children: ReactNode }) {
  // Use a counter to track concurrent loading events.
  const [loadingCount, setLoadingCount] = useState(0);
  const isLoading = loadingCount > 0;

  // For managing the overlay display with debounce and minimum display time.
  const [showLoader, setShowLoader] = useState(false);
  const [loaderStartTime, setLoaderStartTime] = useState<number | null>(null);

  // Functions to increment and decrement the loading counter.
  const startLoading = useCallback(() => {
    setLoadingCount((prev) => prev + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingCount((prev) => Math.max(prev - 1, 0));
  }, []);

  // Expose a function to set loading state via a boolean.
  const setLoading = useCallback(
    (loading: boolean) => {
      if (loading) {
        startLoading();
      } else {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  // Debounce and minimum display logic for the overlay.
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      // When loading starts, delay showing the overlay.
      timer = setTimeout(() => {
        setShowLoader(true);
        setLoaderStartTime(Date.now());
      }, DEBOUNCE_DELAY);
    } else {
      if (showLoader && loaderStartTime !== null) {
        const elapsed = Date.now() - loaderStartTime;
        const remainingTime = MIN_DISPLAY_TIME - elapsed;
        if (remainingTime > 0) {
          timer = setTimeout(() => {
            setShowLoader(false);
            setLoaderStartTime(null);
          }, remainingTime);
        } else {
          setShowLoader(false);
          setLoaderStartTime(null);
        }
      } else {
        setShowLoader(false);
      }
    }
    return () => {
      clearTimeout(timer);
    };
  }, [isLoading, showLoader, loaderStartTime]);

  // Wrap an asynchronous function so that the loading state is automatically managed.
  const withLoading = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      startLoading();
      try {
        const result = await fn();
        return result;
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  return (
    <LoadingContext.Provider value={{ setLoading, withLoading }}>
      {/* Render the loading overlay as a shimmer effect over the content area */}
      {showLoader && <LoadingOverlay />}
      {children}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};
