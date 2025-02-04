"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  HomeIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function SidebarNav() {
  const pathname = usePathname();
  const params = useParams() as { orgId?: string };
  const [isCollapsed, setIsCollapsed] = useState(false);

  // For the "Contractors" link, extract orgId from the URL if available.
  let orgIdFromPath = "";
  if (pathname.startsWith("/dashboard/organizations/")) {
    const parts = pathname.split("/");
    // Expected structure: /dashboard/organizations/{orgId}/...
    orgIdFromPath = parts[3] || "";
  }

  // Real user profile from Firestore
  const { profile, loading, error } = useUserProfile();

  // Navigation items
  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: <HomeIcon className="h-5 w-5" /> },
    {
      name: "Organizations",
      href: "/dashboard/organizations",
      icon: <BuildingOffice2Icon className="h-5 w-5" />,
    },
    {
      name: "Vendors",
      href: "/dashboard/vendors",
      icon: <UserGroupIcon className="h-5 w-5" />,
    },

    {
      name: "Contractors",
      href: "/dashboard/organizations/" + orgIdFromPath + "/contractors",
      icon: <UserIcon className="h-5 w-5" />,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: <Cog6ToothIcon className="h-5 w-5" />,
    },
  ];

  return (
    <aside
      className={`
        hidden sm:flex flex-col h-full
        border-r border-gray-500
        bg-[var(--background)] text-[var(--foreground)]
        transition-all duration-300
        ${isCollapsed ? "w-16" : "w-64"}
      `}
    >
      {/* Top row: brand + toggle */}
      <div className="flex items-center justify-between p-3 border-b border-gray-500">
        <span
          className={`
            text-lg font-bold whitespace-nowrap
            ${isCollapsed ? "hidden" : "block"}
          `}
        >
          RW Suite
        </span>
        <div className="flex-shrink-0">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-0 rounded hover:bg-[var(--foreground)]/[0.1]"
            aria-label="Toggle sidebar"
          >
            <svg
              className="h-6 w-6 text-[var(--foreground)] pointer-events-none"
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
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 text-sm
                transition-colors
                ${
                  isActive
                    ? "bg-[var(--foreground)]/[0.1] font-medium"
                    : "hover:bg-[var(--foreground)]/[0.05]"
                }
              `}
            >
              {item.icon}
              <span
                className={`
                  ${isCollapsed ? "hidden" : "block"}
                  transition-all duration-300
                `}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom user profile */}
      <div className="p-4 border-t border-gray-500 flex items-center gap-3">
        <div
          className={`
            h-8 w-8 bg-neutral-300 rounded-full flex-shrink-0
            ${isCollapsed ? "hidden" : ""}
          `}
        />
        <div className={`${isCollapsed ? "hidden" : "block"} text-sm`}>
          {loading && <div className="text-xs">Loading…</div>}
          {error && <div className="text-xs text-red-500">{error}</div>}
          {!loading && !error && profile && (
            <>
              <div className="font-semibold">{profile.displayName}</div>
              <div className="opacity-70">{profile.role || "No role set"}</div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
