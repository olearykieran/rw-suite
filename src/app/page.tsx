"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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

  return (
    <div className="p-4">
      <p>Loading...</p>
    </div>
  );
}
