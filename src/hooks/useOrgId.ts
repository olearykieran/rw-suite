// hooks/useCurrentOrganization.ts
import { useState, useEffect } from "react";
import { firestore } from "@/lib/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useUserProfile } from "./useUserProfile"; // Your auth hook

export function useCurrentOrganization() {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const { profile } = useUserProfile();

  useEffect(() => {
    async function fetchUserOrgs() {
      if (!profile) return;

      try {
        const orgsRef = collection(firestore, "organizations");
        const membershipQuery = query(
          collection(orgsRef, "members"),
          where("userId", "==", profile.displayName)
        );
        const snapshot = await getDocs(membershipQuery);
        if (!snapshot.empty) {
          setCurrentOrgId(snapshot.docs[0].ref.parent.parent?.id || null);
        }
      } catch (err) {
        console.error("Error fetching user organizations:", err);
      }
    }

    fetchUserOrgs();
  }, [profile]);

  return currentOrgId;
}
