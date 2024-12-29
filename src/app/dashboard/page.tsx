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

      // Check if there's a selectedProjectId in local storage
      const selectedProjectId = localStorage.getItem("selectedProjectId");
      const selectedOrgId = localStorage.getItem("selectedOrgId");

      if (selectedProjectId && selectedOrgId) {
        // redirect to that project
        router.replace(
          `/dashboard/organizations/${selectedOrgId}/projects/${selectedProjectId}`
        );
      }
    }
  }, [user, router]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{welcome}</h1>
      <p className="text-neutral-600">
        This is your main dashboard. From here, you can view your organizations, manage
        projects, check RFIs, submittals, finances, and more.
      </p>
    </section>
  );
}
