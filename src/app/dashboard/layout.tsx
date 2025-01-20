"use client";

import { ReactNode, useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import SidebarNav from "@/components/SidebarNav";
import TopHeader from "@/components/TopHeader";
import { LoadingProvider, useLoading } from "@/components/ui/LoadingProvider";
import { AnimatedPage } from "@/components/ui/AnimatedPage";

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const { withLoading, setLoading } = useLoading();

  const [orgIds, setOrgIds] = useState<string[]>([]);
  const [orgCheckDone, setOrgCheckDone] = useState(false);

  // Handle auth loading state
  useEffect(() => {
    setLoading(authLoading || !orgCheckDone);
  }, [authLoading, orgCheckDone, setLoading]);

  // Handle auth redirects and org check
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/public/auth/sign-in");
    } else if (!authLoading && user) {
      checkOrganizations(user.uid);
    }
  }, [user, authLoading]);

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

  if (authLoading || !orgCheckDone) {
    return null;
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
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader />
        <main className="flex-1 p-6 overflow-y-auto">
          <AnimatedPage>{children}</AnimatedPage>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <LoadingProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </LoadingProvider>
  );
}
