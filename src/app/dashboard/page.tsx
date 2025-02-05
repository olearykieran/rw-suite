// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";

// Shared UI components.
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

/**
 * DashboardHomePage is the main landing page for your dashboard.
 *
 * If a sub‑project has been previously selected (stored in localStorage), the
 * page will automatically redirect to that sub‑project without rendering the
 * default dashboard message.
 */
export default function DashboardHomePage() {
  // useAuthState provides the current user. The second value (loading) isn't used here.
  const [user] = useAuthState(auth);
  const [welcome, setWelcome] = useState("");
  // redirecting flag prevents rendering of the dashboard content if an auto-redirect is in progress.
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      // Set a welcome message using the user's email.
      setWelcome(`Welcome to RW Suite, ${user.email}!`);

      // Retrieve selected sub‑project values from localStorage.
      const orgId = localStorage.getItem("selectedOrgId");
      const projectId = localStorage.getItem("selectedProjectId");
      const subProjectId = localStorage.getItem("selectedSubProjectId");

      // If all three values exist, auto-redirect to the sub‑project page.
      if (orgId && projectId && subProjectId) {
        setRedirecting(true);
        router.replace(
          `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
        );
      }
    }
  }, [user, router]);

  // If the user is not signed in, show a prompt to sign in.
  if (!user) {
    return (
      <PageContainer>
        <h1 className="text-2xl font-bold">Please sign in.</h1>
      </PageContainer>
    );
  }

  // While redirecting, render nothing.
  if (redirecting) {
    return null;
  }

  // Render the main dashboard content.
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
