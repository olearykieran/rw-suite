"use client";

import { ReactNode, useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import SidebarNav from "@/components/SidebarNav";
import TopHeader from "@/components/TopHeader";
import { AnimatedPage } from "@/components/ui/AnimatedPage";
import { LoadingBarProvider } from "@/context/LoadingBarContext";
import { SelectedProjectProvider } from "@/context/SelectedProjectContext"; // <-- Import the provider

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const [orgIds, setOrgIds] = useState<string[]>([]);
  const [orgCheckDone, setOrgCheckDone] = useState(false);

  // Check if the current path is a research page
  const isResearchPage =
    typeof window !== "undefined" &&
    window.location.pathname.includes("/research") &&
    window.location.pathname.includes("/subprojects/");

  // Check if the current path is a ticket-sales-report page
  const isTicketSalesReportPage =
    typeof window !== "undefined" &&
    window.location.pathname.includes("/ticket-sales-report") &&
    window.location.pathname.includes("/subprojects/");

  // Check if the current path is an analytics page
  const isAnalyticsPage =
    typeof window !== "undefined" &&
    window.location.pathname.includes("/analytics") &&
    window.location.pathname.includes("/subprojects/");

  console.log("Dashboard layout rendering", {
    user,
    authLoading,
    isResearchPage,
    isTicketSalesReportPage,
    isAnalyticsPage,
    path: typeof window !== "undefined" ? window.location.pathname : "unknown",
  });

  useEffect(() => {
    // Skip authentication check for public pages
    if (isResearchPage || isTicketSalesReportPage || isAnalyticsPage) {
      console.log("Dashboard layout - bypassing auth for public access page");
      return;
    }

    if (!authLoading && !user) {
      router.replace("/public/auth/sign-in");
    } else if (!authLoading && user) {
      checkOrganizations(user.uid);
    }
  }, [
    user,
    authLoading,
    router,
    isResearchPage,
    isTicketSalesReportPage,
    isAnalyticsPage,
  ]);

  // Check if the user is part of any organizations
  async function checkOrganizations(uid: string) {
    // Only check organizations once per session
    if (orgCheckDone) return;

    try {
      const userOrgsRef = collection(firestore, `users/${uid}/organizations`);
      const snapshot = await getDocs(userOrgsRef);
      const ids = snapshot.docs.map((doc) => doc.id);
      setOrgIds(ids);
      setOrgCheckDone(true);

      // If no organizations exist, redirect to create one
      if (ids.length === 0) {
        router.push("/dashboard/organizations/new");
      }
    } catch (error) {
      console.error("Error checking organizations:", error);
    }
  }

  // Loading UI
  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // When the user is signed out, and it's not a public access page, don't render anything
  if (!user && !isResearchPage && !isTicketSalesReportPage && !isAnalyticsPage) {
    return null;
  }

  // For signed-in users, show the full dashboard layout
  return (
    <div className="flex h-screen w-full overflow-hidden dark:bg-gray-900">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader />
        <main className="flex-1 p-6 overflow-y-auto relative">
          <AnimatedPage>{children}</AnimatedPage>
        </main>
      </div>
    </div>
  );
}

/**
 * The main Dashboard layout that wraps all dashboard pages.
 * It provides authentication, UI structure, and context providers.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <LoadingBarProvider>
      <SelectedProjectProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </SelectedProjectProvider>
    </LoadingBarProvider>
  );
}
