// src/components/SidebarNav.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

export default function SidebarNav() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Instead of "your-org", we link to /dashboard/organizations for the org listing
  // Then user picks an org and sees that org's projects
  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <HomeIcon className="h-5 w-5" />,
    },
    {
      name: "Organizations",
      href: "/dashboard/organizations",
      icon: <BuildingOffice2Icon className="h-5 w-5" />,
    },
    {
      name: "Vendors",
      href: "/dashboard/vendors", // or /dashboard/organizations for vendor listing if you prefer
      icon: <UserGroupIcon className="h-5 w-5" />,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: <Cog6ToothIcon className="h-5 w-5" />,
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? "w-20" : "w-64"
      } flex flex-col h-full bg-white border-r border-neutral-200 transition-all duration-300 relative`}
    >
      {/* Logo / Branding */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <span
          className={`text-lg font-bold whitespace-nowrap transition-all duration-300 ${
            isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
          }`}
        >
          RW Suite
        </span>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded hover:bg-neutral-100 relative z-10"
          aria-label="Toggle sidebar"
        >
          <svg
            className="h-6 w-6 text-neutral-600 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5l-7 7 7 7" />
            )}
          </svg>
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors 
                ${isActive ? "bg-neutral-100 font-medium" : "hover:bg-neutral-50"} 
              `}
            >
              {item.icon}
              <span
                className={`transition-all duration-300 ${
                  isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User profile at the bottom */}
      <div className="p-4 border-t border-neutral-200 flex items-center gap-3">
        <div
          className={`h-8 w-8 bg-neutral-300 rounded-full flex-shrink-0 transition-all duration-300 ${
            isCollapsed ? "opacity-0" : "opacity-100"
          }`}
        />
        <div
          className={`text-sm transition-all duration-300 ${
            isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
          }`}
        >
          <div className="font-semibold">John Doe</div>
          <div className="text-neutral-500">PM / Admin</div>
        </div>
      </div>
    </aside>
  );
}
