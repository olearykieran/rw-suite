// src/app/dashboard/organizations/page.tsx

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const ref = collection(firestore, "organizations");
        const snap = await getDocs(ref);
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setOrgs(data);
      } catch (err: any) {
        console.error("Fetch orgs error:", err);
        setError("Failed to load organizations.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  if (loading) {
    return <div className="p-6 text-sm">Loading organizations...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold">Organizations</h1>

      {orgs.length === 0 && (
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
          No organizations found.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {orgs.map((org) => (
          <Card key={org.id}>
            <p className="font-semibold text-lg">{org.name || org.id}</p>
            <Link
              href={`/dashboard/organizations/${org.id}`}
              className="
                text-blue-600 hover:underline text-sm mt-2 inline-block
                hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300
              "
            >
              View Organization
            </Link>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
