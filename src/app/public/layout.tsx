"use client";

import { ReactNode, useState, useEffect } from "react";
import { LoadingProvider } from "@/components/ui/LoadingProvider";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

/**
 * PublicLayoutContent renders the fixed header and the main content.
 * The header remains fixed at the top of the viewport while the main content scrolls underneath.
 * A dark mode toggle is added to the header in this version.
 */
function PublicLayoutContent({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // On mount, check for the theme stored in localStorage.
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Toggle dark mode and update localStorage.
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed Header with Dark Mode Toggle */}
      <header className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 md:px-8 border-b bg-black border-white z-50">
        <div className="text-xl text-white font-bold">RW Suite</div>
        <nav className="flex items-center space-x-4 text-white text-sm">
          <button
            onClick={toggleTheme}
            className="p-2 rounded hover:bg-white/10"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? (
              <SunIcon className="h-6 w-6" />
            ) : (
              <MoonIcon className="h-6 w-6" />
            )}
          </button>
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
