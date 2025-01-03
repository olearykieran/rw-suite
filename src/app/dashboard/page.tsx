// src/app/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

export default function DashboardHomePage() {
  const [user] = useAuthState(auth);
  const [welcome, setWelcome] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (user) {
      setWelcome(`Welcome to RW Suite, ${user.email}!`);

      // If you want to check for sub-project selection and auto-redirect:
      const orgId = localStorage.getItem("selectedOrgId");
      const projectId = localStorage.getItem("selectedProjectId");
      const subProjectId = localStorage.getItem("selectedSubProjectId");

      if (orgId && projectId && subProjectId) {
        router.replace(
          `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
        );
      }
    }
  }, [user, router]);

  if (!user) {
    return (
      <PageContainer>
        <h1 className="text-2xl font-bold">Please sign in.</h1>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="text-3xl font-bold">{welcome}</h1>

      <Card>
        <p className="leading-relaxed text-sm">
          This is your main dashboard. From here, you can view organizations, manage
          projects, check RFIs, submittals, finances, and more.
        </p>
      </Card>
    </PageContainer>
  );
}
