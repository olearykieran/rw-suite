"use client";

import Link from "next/link";
import {
  HomeIcon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  UserIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { useOrgId } from "@/hooks/useOrgId";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const effectiveOrgId = useOrgId();

  if (!open) return null; // If not open, render nothing

  // Updated nav items: "Vendors" is replaced with "Contractors"
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
      name: "Contractors",
      // Using effectiveOrgId to build the route
      href: `/dashboard/organizations/${effectiveOrgId}/contractors`,
      icon: <UserIcon className="h-5 w-5" />,
    },
    {
      name: "Invoices",
      href: "/invoices",
      icon: <DocumentTextIcon className="h-5 w-5" />,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: <Cog6ToothIcon className="h-5 w-5" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-64 bg-[var(--background)] text-[var(--foreground)] shadow-xl h-full">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <span className="text-lg font-bold">RW Suite</span>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-[var(--foreground)]/[0.1]"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose} // Close the drawer on navigation
                className={`
                  flex items-center gap-3 px-4 py-3 transition-colors
                  ${
                    isActive
                      ? "bg-[var(--foreground)]/[0.1] font-medium"
                      : "hover:bg-[var(--foreground)]/[0.05]"
                  }
                `}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
