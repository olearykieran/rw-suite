// src/app/dashboard/organizations/[orgId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function OrganizationDetailPage() {
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();

  useEffect(() => {
    const fetchOrg = async () => {
      const orgId = params.orgId as string;
      if (!orgId) return;
      const ref = doc(firestore, "organizations", orgId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setOrg({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    };
    fetchOrg();
  }, [params.orgId]);

  if (loading) {
    return <div className="p-4">Loading organization...</div>;
  }
  if (!org) {
    return <div className="p-4">Organization not found.</div>;
  }

  return (
    <main className="p-4">
      <h1 className="text-xl mb-4">Organization: {org.name || org.id}</h1>
      <p>Additional org details can go here.</p>

      <Link
        href={`/dashboard/organizations/${org.id}/projects`}
        className="mt-4 inline-block underline text-blue-600"
      >
        View Projects
      </Link>
    </main>
  );
}
