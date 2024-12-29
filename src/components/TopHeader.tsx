// src/components/TopHeader.tsx
"use client";

import { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import { UserIcon, BellIcon } from "@heroicons/react/24/outline";

export default function TopHeader() {
  const [user] = useAuthState(auth);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await auth.signOut();
  };

  return (
    <header className="w-full border-b border-neutral-200 bg-white h-14 flex items-center px-4 justify-between">
      {/* Left side (page title) */}
      <div>
        <h2 className="text-lg font-semibold">RW Suite Dashboard</h2>
      </div>

      {/* Right side (notification bell, user icon) */}
      <div className="flex items-center gap-4 relative">
        {/* Notification Bell */}
        <button className="relative p-1 rounded hover:bg-neutral-100">
          <BellIcon className="h-6 w-6 text-neutral-600" />
          {/* If you want a small dot to indicate notifications, you could do: 
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" /> */}
        </button>

        {/* User icon / avatar */}
        <button
          className="h-8 w-8 rounded-full bg-neutral-300 flex items-center justify-center"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <UserIcon className="h-5 w-5 text-neutral-600" />
        </button>

        {dropdownOpen && (
          <div className="absolute top-12 right-0 w-48 bg-white shadow-lg border rounded p-2">
            <p className="text-sm text-neutral-500 mb-1">{user?.email}</p>
            <hr className="my-2" />
            <button
              onClick={handleSignOut}
              className="block text-left w-full px-2 py-1 hover:bg-neutral-100 text-sm"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
