// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";

export default function DashboardHomePage() {
  const [user] = useAuthState(auth);
  const [welcome, setWelcome] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (user) {
      setWelcome(`Welcome to RW Suite, ${user.email}!`);

      // If you want to check for sub-project instead:
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

  return (
    <section className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-800">{welcome}</h1>
      <p className="text-gray-700 leading-relaxed">
        This is your main dashboard. From here, you can view organizations, manage
        projects, check RFIs, submittals, finances, and more.
      </p>
    </section>
  );
}
