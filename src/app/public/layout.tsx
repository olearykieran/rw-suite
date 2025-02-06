"use client";

import { ReactNode } from "react";
import { LoadingProvider } from "@/components/ui/LoadingProvider";

/**
 * PublicLayoutContent renders the fixed header and the main content.
 * The header remains fixed at the top of the viewport while the main content scrolls underneath.
 */
function PublicLayoutContent({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed Header: remains at the top of the viewport */}
      <header className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 md:px-8 border-b bg-black border-white z-50">
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

      {/* Main content starts below the fixed header */}
      <main className="flex-1 mt-16 px-4 md:px-8">{children}</main>
    </div>
  );
}

/**
 * PublicLayout wraps the application in the LoadingProvider and renders the PublicLayoutContent.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <LoadingProvider>
      <PublicLayoutContent>{children}</PublicLayoutContent>
    </LoadingProvider>
  );
}
