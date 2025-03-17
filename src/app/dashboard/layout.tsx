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
  const isResearchPage = typeof window !== 'undefined' && 
    window.location.pathname.includes('/research') &&
    window.location.pathname.includes('/subprojects/');
    
  console.log("Dashboard layout rendering", { 
    user, 
    authLoading, 
    isResearchPage, 
    path: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
  });

  useEffect(() => {
    // Skip authentication check for research pages
    if (isResearchPage) {
      console.log("Dashboard layout - bypassing auth for research page");
      return;
    }
    
    if (!authLoading && !user) {
      router.replace("/public/auth/sign-in");
    } else if (!authLoading && user) {
      checkOrganizations(user.uid);
    }
  }, [user, authLoading, router, isResearchPage]);

  async function checkOrganizations(uid: string) {
    try {
      const orgColl = collection(firestore, "organizations");
      const orgSnap = await getDocs(orgColl);
      const myOrgs: string[] = [];
      for (const orgDoc of orgSnap.docs) {
        const membersColl = collection(orgDoc.ref, "members");
        const membersSnap = await getDocs(membersColl);
        if (membersSnap.docs.find((d) => d.id === uid)) {
          myOrgs.push(orgDoc.id);
        }
      }
      setOrgIds(myOrgs);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setOrgCheckDone(true);
    }
  }

  if (authLoading || (!orgCheckDone && !isResearchPage)) {
    return null;
  }

  if (orgIds.length === 0 && !isResearchPage) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">
          You are not a member of any organization. Please sign up or ask your admin for
          an invite.
        </p>
      </div>
    );
  }

  if (isResearchPage) {
    return children;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // Wrap with both providers.
  return (
    <LoadingBarProvider>
      <SelectedProjectProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </SelectedProjectProvider>
    </LoadingBarProvider>
  );
}
