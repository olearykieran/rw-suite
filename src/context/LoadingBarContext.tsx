"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface LoadingBarContextProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const LoadingBarContext = createContext<LoadingBarContextProps | undefined>(undefined);

/**
 * LoadingBarProvider wraps your app (or dashboard layout) so that any component
 * can trigger the top loading bar.
 */
export function LoadingBarProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <LoadingBarContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </LoadingBarContext.Provider>
  );
}

/**
 * useLoadingBar is a custom hook to access the global loading bar state.
 */
export function useLoadingBar() {
  const context = useContext(LoadingBarContext);
  if (!context) {
    throw new Error("useLoadingBar must be used within a LoadingBarProvider");
  }
  return context;
}
