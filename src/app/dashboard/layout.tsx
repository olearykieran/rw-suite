"use client";

import { ReactNode, useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import SidebarNav from "@/components/SidebarNav";
import TopHeader from "@/components/TopHeader";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  const [orgIds, setOrgIds] = useState<string[]>([]);
  const [orgCheckDone, setOrgCheckDone] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/public/auth/sign-in");
    } else if (!loading && user) {
      checkOrganizations(user.uid);
    }
  }, [user, loading]);

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

  if (loading || !orgCheckDone) {
    return <div className="p-6 text-[var(--foreground)]">Loading your account...</div>;
  }

  if (orgIds.length === 0) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">
          You are not a member of any organization. Please sign up or ask your admin for
          an invite.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* 
        Sidebar is hidden on mobile due to the
        `hidden sm:flex` class inside SidebarNav
      */}
      <SidebarNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 
          The TopHeader includes the mobile hamburger for opening 
          the mobile drawer (MobileNavDrawer). 
        */}
        <TopHeader />

        {/* Main page content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
