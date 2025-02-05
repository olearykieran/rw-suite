// src/app/page.tsx
"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * RootPage handles the initial authentication check.
 * It redirects to either the dashboard or public page once the auth state is determined.
 */
export default function RootPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/public");
      }
    }
  }, [user, loading, router]);

  return null;
}
