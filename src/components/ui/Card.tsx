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
        bg-white dark:bg-neutral-900
        border border-neutral-200 dark:border-neutral-800
        rounded-lg
        space-y-4
        p-6
        ${className}
      `}
    >
      {children}
    </section>
  );
}
