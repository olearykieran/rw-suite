"use client";
import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <section
      {...props}
      className={`
        border border-neutral-800
        rounded-lg
        space-y-4
        p-6
        bg-neutral-900
        ${className}
      `}
    >
      {children}
    </section>
  );
}
