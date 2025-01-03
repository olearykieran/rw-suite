// src/app/dashboard/organizations/[orgId]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import { useParams } from "next/navigation";
import Link from "next/link";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

export default function OrganizationDetailPage() {
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { orgId } = useParams() as { orgId: string };

  useEffect(() => {
    const fetchOrg = async () => {
      if (!orgId) return;
      try {
        const ref = doc(firestore, "organizations", orgId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setOrg({ id: snap.id, ...snap.data() });
        } else {
          setError("Organization not found.");
        }
      } catch (err) {
        console.error("Fetch organization error:", err);
        setError("Failed to load organization.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, [orgId]);

  if (loading) {
    return <div className="p-6 text-sm">Loading organization...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!org) {
    return <div className="p-6">Organization not found.</div>;
  }

  return (
    <PageContainer>
      {/* Back to all organizations */}
      <Link
        href="/dashboard/organizations"
        className="
          text-sm font-medium text-blue-600 underline
          hover:text-blue-700 dark:text-blue-400
          dark:hover:text-blue-300 transition-colors
        "
      >
        &larr; Back to Organizations
      </Link>

      <h1 className="text-2xl font-bold mt-4">Organization: {org.name || org.id}</h1>

      <Card>
        <p className="text-sm">Additional organization details can go here...</p>
      </Card>

      <Link
        className="mt-6 inline-block"
        href={`/dashboard/organizations/${org.id}/projects`}
      >
        <GrayButton>View Projects</GrayButton>
      </Link>
    </PageContainer>
  );
}
