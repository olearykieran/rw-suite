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
    return <div className="p-6 text-gray-700">Loading organization...</div>;
  }
  if (!org) {
    return <div className="p-6 text-red-600">Organization not found.</div>;
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">
        Organization: {org.name || org.id}
      </h1>
      <p className="text-gray-700">Additional organization details can go here...</p>

      <Link
        href={`/dashboard/organizations/${org.id}/projects`}
        className="inline-block px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
      >
        View Projects
      </Link>
    </main>
  );
}
