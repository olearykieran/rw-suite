// src/hooks/useRole.ts
"use client";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebaseConfig";

export function useRole(orgId: string | undefined) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    const user = auth.currentUser;
    if (!user) {
      setRole(null);
      return;
    }

    const fetchRole = async () => {
      const roleDoc = doc(firestore, "organizations", orgId, "userRoles", user.uid);
      const snap = await getDoc(roleDoc);
      if (snap.exists()) {
        setRole(snap.data().role);
      } else {
        setRole(null);
      }
    };

    fetchRole();
  }, [orgId]);

  return role;
}
