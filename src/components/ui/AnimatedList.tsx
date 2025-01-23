// src/components/ui/AnimatedList.tsx
"use client";

import React, { ReactNode, useEffect, useState } from "react";

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

/** Define the shape of your AnimatedList props. */
type AnimatedListProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  itemClassName?: string;
  isLoading?: boolean;
  emptyMessage?: ReactNode;

  /**
   * WrapperComponent (optional) => if present,
   * we'll wrap the rendered items in this instead of a default <div>.
   */
  WrapperComponent?: React.ComponentType<{ children: ReactNode }>;
};

export function AnimatedList<T>({
  items,
  renderItem,
  className = "",
  itemClassName = "",
  isLoading = false,
  emptyMessage,
  WrapperComponent,
}: AnimatedListProps<T>) {
  const [showItems, setShowItems] = useState(false);

  useEffect(() => {
    if (items.length > 0 && !isLoading) {
      // Start animation only when items are fully loaded
      const timer = setTimeout(() => setShowItems(true), 100);
      return () => clearTimeout(timer);
    }
  }, [items.length, isLoading]);

  // If not loading and no items, show empty message
  if (items.length === 0 && !isLoading) {
    return <>{emptyMessage}</>;
  }

  // Prepare the list of item elements
  const itemElements = items.map((item, index) => (
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
  ));

  // Build our final content => by default a <div> with spacing
  const content = <div className={`space-y-3 ${className}`}>{itemElements}</div>;

  // If the user provided a custom WrapperComponent, wrap our content in it
  if (WrapperComponent) {
    return <WrapperComponent>{content}</WrapperComponent>;
  }

  // Otherwise, just return the default content
  return content;
}
