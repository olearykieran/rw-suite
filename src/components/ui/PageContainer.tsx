"use client";
import { ReactNode, HTMLAttributes } from "react";

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function PageContainer({
  children,
  className = "",
  ...props
}: PageContainerProps) {
  // Merge incoming classNames with some default spacing/centering
  return (
    <div
      {...props}
      className={`
        w-full max-w-5xl mx-auto px-4 py-6 space-y-8 
        ${className}
      `}
    >
      {children}
    </div>
  );
}
