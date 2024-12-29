// src/app/dashboard/organizations/[orgId]/projects/[projectId]/layout.tsx
"use client";

import { ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const { orgId, projectId } = useParams() as { orgId: string; projectId: string };

  return (
    <div className="flex">
      {/* Sub-Nav for this project */}

      {/* The main content for whichever route the user is in */}
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}
