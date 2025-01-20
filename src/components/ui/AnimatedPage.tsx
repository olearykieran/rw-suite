// src/components/ui/AnimatedPage.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";

type AnimatedPageProps = {
  children: ReactNode;
  className?: string;
};

export function AnimatedPage({ children, className = "" }: AnimatedPageProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`
        opacity-0 transition-all duration-500 ease-out
        ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
