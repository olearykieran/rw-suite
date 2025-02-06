// src/app/public/layout.tsx
"use client";

import { ReactNode } from "react";
import { LoadingProvider } from "@/components/ui/LoadingProvider";

function PublicLayoutContent({ children }: { children: ReactNode }) {
  return (
    <div>
      <header className="w-full h-16 flex items-center px-8 justify-between border-b border-gray-500">
        <div className="text-xl text-white font-bold">RW Suite</div>
        <nav className="text-white text-sm space-x-4">
          <a href="/public/about" className="hover:underline">
            About
          </a>
          <a href="/public/auth/sign-in" className="hover:underline">
            Sign In
          </a>
          <a href="/public/auth/sign-up" className="hover:underline">
            Sign Up
          </a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <LoadingProvider>
      <PublicLayoutContent>{children}</PublicLayoutContent>
    </LoadingProvider>
  );
}
