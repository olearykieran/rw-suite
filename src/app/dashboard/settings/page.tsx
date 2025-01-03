"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/lib/firebaseConfig";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useUserProfile } from "@/hooks/useUserProfile";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

export default function SettingsPage() {
  const [user] = useAuthState(auth);
  const { profile, loading, error } = useUserProfile();
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setRole(profile.role || "");
    }
  }, [profile]);

  async function handleSave() {
    if (!user) return;
    try {
      const ref = doc(firestore, "users", user.uid);
      await updateDoc(ref, {
        displayName,
        role,
        updatedAt: serverTimestamp(),
      });
      alert("Profile updated!");
    } catch (err: any) {
      console.error("Settings update error:", err);
      alert(err.message);
    }
  }

  if (!user) {
    return <div className="p-6">Please sign in.</div>;
  }
  if (loading) {
    return <div className="p-6 text-sm">Loading user profile…</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>

      <Card>
        <div className="space-y-4">
          <div>
            <label className="block font-medium">Display Name</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium">Role</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>

          <GrayButton onClick={handleSave}>Save Settings</GrayButton>
        </div>
      </Card>
    </PageContainer>
  );
}
