"use client";

import { ReactNode, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import SidebarNav from "@/components/SidebarNav";
import TopHeader from "@/components/TopHeader";
import { AnimatedPage } from "@/components/ui/AnimatedPage";
import { useParams, useRouter } from "next/navigation";

/**
 * Special layout for the research page that doesn't enforce authentication.
 * This allows the research page to be publicly accessible while maintaining the original UI.
 */
export default function ResearchLayout({ children }: { children: ReactNode }) {
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  console.log("Research layout rendering", { user, authLoading, orgId, projectId, subProjectId });

  // Show loading state while checking authentication
  if (authLoading) {
    console.log("Research layout - auth loading");
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  // For unauthenticated users, show a simplified layout
  if (!user) {
    console.log("Research layout - unauthenticated user");
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white dark:bg-gray-800 shadow-sm z-10 p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Research Materials
            </h1>
          </div>
          <main className="flex-1 p-6 overflow-y-auto relative">
            <AnimatedPage>{children}</AnimatedPage>
          </main>
        </div>
      </div>
    );
  }

  // For authenticated users, use the full dashboard layout
  console.log("Research layout - authenticated user");
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader />
        <main className="flex-1 p-6 overflow-y-auto relative">
          <AnimatedPage>{children}</AnimatedPage>
        </main>
      </div>
    </div>
  );
}
