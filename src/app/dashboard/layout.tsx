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
      // Not signed in => go to sign in
      router.replace("/(public)/auth/sign-in");
    } else if (!loading && user) {
      checkOrganizations(user.uid);
    }
  }, [user, loading]);

  async function checkOrganizations(uid: string) {
    // We'll do a quick naive approach: get all org docs and see if user is in members
    // For production, you'd do a narrower query or store a reference in user doc.
    const orgColl = collection(firestore, "organizations");
    const orgSnap = await getDocs(orgColl);
    const myOrgs: string[] = [];
    for (const orgDoc of orgSnap.docs) {
      const membersColl = collection(orgDoc.ref, "members");
      const membersSnap = await getDocs(membersColl);
      // see if the user is in that members subcollection
      if (membersSnap.docs.find((d) => d.id === uid)) {
        myOrgs.push(orgDoc.id);
      }
    }
    setOrgIds(myOrgs);
    setOrgCheckDone(true);
  }

  if (loading || !orgCheckDone) {
    return <div className="p-4">Loading your account...</div>;
  }

  if (orgIds.length === 0) {
    return (
      <div className="p-4">
        <p className="text-red-500">
          You are not a member of any organization. Please sign up or ask your admin for
          an invite.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
