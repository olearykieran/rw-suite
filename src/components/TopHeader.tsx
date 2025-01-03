// src/components/TopHeader.tsx
"use client";

import { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import { UserIcon, BellIcon, Bars3Icon } from "@heroicons/react/24/outline";
import MobileNavDrawer from "./MobileNavDrawer";

export default function TopHeader() {
  const [user] = useAuthState(auth);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = async () => {
    await auth.signOut();
  };

  return (
    <header
      className="
        w-full h-14 flex items-center px-4 justify-between
        border-b border-gray-500
        bg-[var(--background)] text-[var(--foreground)]
      "
    >
      <div className="flex items-center gap-4">
        {/* Hamburger button => only show on mobile */}
        <button
          className="sm:hidden p-2 rounded hover:bg-[var(--foreground)]/[0.1]"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        {/* Page title */}
        <h2 className="text-lg font-semibold">RW Suite Dashboard</h2>
      </div>

      {/* Right side: notification bell, user icon */}
      <div className="flex items-center gap-4 relative">
        <button className="relative p-1 rounded hover:bg-[var(--foreground)]/[0.1]">
          <BellIcon className="h-6 w-6" />
        </button>

        {/* User icon */}
        <button
          className="h-8 w-8 rounded-full bg-neutral-300 flex items-center justify-center"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <UserIcon className="h-5 w-5 text-black" />
        </button>

        {dropdownOpen && (
          <div
            className="
              absolute top-12 right-0 w-48 
              bg-[var(--background)] text-[var(--foreground)]
              shadow-lg border border-neutral-200 
              rounded p-2
            "
          >
            <p className="text-sm opacity-70 mb-1">{user?.email}</p>
            <hr className="my-2 border-neutral-300" />
            <button
              onClick={handleSignOut}
              className="block text-left w-full px-2 py-1 hover:bg-[var(--foreground)]/[0.1] text-sm"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* The mobile nav drawer */}
      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
