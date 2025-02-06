// src/components/TopHeader.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import {
  UserIcon,
  BellIcon,
  Bars3Icon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";
import MobileNavDrawer from "./MobileNavDrawer";
import { TopLoadingBar } from "@/components/ui/TopLoadingBar";
import { useLoadingBar } from "@/context/LoadingBarContext";
import { usePathname } from "next/navigation";

export default function TopHeader() {
  const [user] = useAuthState(auth);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Use the global loading bar state.
  const { isLoading, setIsLoading } = useLoadingBar();

  // Get the current pathname.
  const pathname = usePathname();

  // Whenever the route changes, clear the loading state.
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, setIsLoading]);

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

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setDropdownOpen(false);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* TopLoadingBar rendered in the header */}
      <TopLoadingBar isLoading={isLoading} />

      <header
        className="
          w-full h-14 flex items-center px-4 justify-between
          border-b border-gray-500
          text-[var(--foreground)]
        "
      >
        {/* Left side: Mobile menu button & dashboard title */}
        <div className="flex items-center gap-4">
          <button
            className="sm:hidden p-2 rounded hover:bg-[var(--foreground)]/[0.1]"
            onClick={() => {
              setIsLoading(true); // trigger loading before opening the drawer
              setDrawerOpen(true);
              // (The useEffect above will clear the loading state on route change.)
              setTimeout(() => setIsLoading(false), 500);
            }}
            aria-label="Open menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">RW Suite Dashboard</h2>
        </div>

        {/* Right side: Theme toggle, notifications, and user dropdown */}
        <div className="flex items-center gap-4 relative">
          <button
            onClick={toggleTheme}
            className="p-2 rounded hover:bg-[var(--foreground)]/[0.1]"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? (
              <SunIcon className="h-6 w-6" />
            ) : (
              <MoonIcon className="h-6 w-6" />
            )}
          </button>

          <button className="relative p-1 rounded hover:bg-[var(--foreground)]/[0.1]">
            <BellIcon className="h-6 w-6" />
          </button>

          <div ref={containerRef} className="relative">
            <button
              className="h-8 w-8 rounded-full bg-neutral-300 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(!dropdownOpen);
              }}
            >
              <UserIcon className="h-5 w-5 text-black" />
            </button>
            {dropdownOpen && (
              <div
                className="
    absolute top-12 right-0 min-w-[12rem] max-w-[20rem] w-auto z-[9999]
    bg-[var(--background)] text-[var(--foreground)]
    shadow-lg border border-neutral-200 
    rounded p-2
  "
              >
                <p
                  className="opacity-70 mb-1 truncate max-w-[16rem] cursor-pointer"
                  title={user?.email ?? "No email available"}
                >
                  {user?.email ?? "No email available"}
                </p>
                <hr className="my-2 border-neutral-300" />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSignOut();
                  }}
                  className="
      block text-left w-full px-2 py-1 
      hover:bg-[var(--foreground)]/[0.1] 
    "
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </header>
    </>
  );
}
