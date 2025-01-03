"use client";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface GrayButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string; // optional in case user doesn't provide any
}

export function GrayButton({ children, className = "", ...props }: GrayButtonProps) {
  return (
    <button
      className={`
        bg-gray-300 text-black
        hover:bg-gray-400
        dark:bg-gray-700 dark:text-white
        dark:hover:bg-gray-600
        px-4 py-2 rounded
        transition-colors
        ${className}   /* Merge additional classes here */
      `}
      {...props}
    >
      {children}
    </button>
  );
}
