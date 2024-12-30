// src/app/dashboard/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/lib/firebaseConfig";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function SettingsPage() {
  const [user] = useAuthState(auth);
  const { profile, loading, error } = useUserProfile();
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
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

  if (!user) return <div className="p-4">Please sign in.</div>;
  if (loading) return <div className="p-4">Loading user profile…</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <main className="p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>

      <div className="space-y-4">
        <div>
          <label className="block font-medium">Display Name</label>
          <input
            className="border p-2 w-full"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium">Role</label>
          <input
            className="border p-2 w-full"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded">
          Save Settings
        </button>
      </div>
    </main>
  );
}
