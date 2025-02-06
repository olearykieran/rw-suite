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

  // Existing profile fields
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");

  // New issuer info fields
  const [issuerName, setIssuerName] = useState("");
  const [issuerTitle, setIssuerTitle] = useState("");
  const [issuerCompany, setIssuerCompany] = useState("");
  const [issuerPhone, setIssuerPhone] = useState("");
  const [issuerEmail, setIssuerEmail] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setRole(profile.role || "");
      // Set additional issuer info (if they exist in the profile)
      setIssuerName(profile.issuerName || "");
      setIssuerTitle(profile.issuerTitle || "");
      setIssuerCompany(profile.issuerCompany || "");
      setIssuerPhone(profile.issuerPhone || "");
      setIssuerEmail(profile.issuerEmail || "");
    }
  }, [profile]);

  async function handleSave() {
    if (!user) return;
    try {
      const ref = doc(firestore, "users", user.uid);
      await updateDoc(ref, {
        displayName,
        role,
        issuerName,
        issuerTitle,
        issuerCompany,
        issuerPhone,
        issuerEmail,
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
    return <div className="p-6 ">Loading user profile…</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>

      <Card>
        <div className="space-y-4">
          {/* Display Name & Role */}
          <div>
            <label className="block font-medium">Display Name</label>
            <input
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-medium">Role</label>
            <input
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>

          {/* Issuer Info */}
          <div>
            <label className="block font-medium">Issuer Name</label>
            <input
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              value={issuerName}
              onChange={(e) => setIssuerName(e.target.value)}
              placeholder="your name"
            />
          </div>
          <div>
            <label className="block font-medium">Issuer Title</label>
            <input
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              value={issuerTitle}
              onChange={(e) => setIssuerTitle(e.target.value)}
              placeholder="your position"
            />
          </div>
          <div>
            <label className="block font-medium">Issuer Company</label>
            <input
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              value={issuerCompany}
              onChange={(e) => setIssuerCompany(e.target.value)}
              placeholder="company name"
            />
          </div>
          <div>
            <label className="block font-medium">Issuer Phone</label>
            <input
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              value={issuerPhone}
              onChange={(e) => setIssuerPhone(e.target.value)}
              placeholder="phone number"
            />
          </div>
          <div>
            <label className="block font-medium">Issuer Email</label>
            <input
              type="email"
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              value={issuerEmail}
              onChange={(e) => setIssuerEmail(e.target.value)}
              placeholder="your email"
            />
          </div>

          <GrayButton onClick={handleSave}>Save Settings</GrayButton>
        </div>
      </Card>
    </PageContainer>
  );
}
