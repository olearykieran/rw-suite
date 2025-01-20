// src/components/ui/AnimatedList.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";

// Utility function to get animation delay class
function getAnimationDelay(index: number): string {
  const delays = [
    "delay-[0ms]",
    "delay-[50ms]",
    "delay-[100ms]",
    "delay-[150ms]",
    "delay-[200ms]",
    "delay-[250ms]",
    "delay-[300ms]",
    "delay-[350ms]",
    "delay-[400ms]",
    "delay-[450ms]",
  ];
  return delays[index % delays.length] || "delay-[500ms]";
}

type AnimatedListProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  itemClassName?: string;
  isLoading?: boolean;
  emptyMessage?: ReactNode;
};

export function AnimatedList<T>({
  items,
  renderItem,
  className = "",
  itemClassName = "",
  isLoading = false,
  emptyMessage,
}: AnimatedListProps<T>) {
  const [showItems, setShowItems] = useState(false);

  useEffect(() => {
    if (items.length > 0 && !isLoading) {
      // Only start animation when items are loaded
      const timer = setTimeout(() => setShowItems(true), 100);
      return () => clearTimeout(timer);
    }
  }, [items.length, isLoading]);

  if (items.length === 0 && !isLoading) {
    return emptyMessage;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, index) => (
        <div
          key={index}
          className={`
            opacity-0 transition-all duration-500 ease-out
            ${showItems ? "opacity-100 translate-y-0" : "translate-y-4"}
            ${getAnimationDelay(index)}
            ${itemClassName}
          `}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}
