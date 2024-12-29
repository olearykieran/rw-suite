// src/app/dashboard/organizations/[orgId]/projects/[projectId]/rfis/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RfiListPage() {
  const { orgId, projectId } = useParams() as { orgId: string; projectId: string };
  const [rfis, setRfis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchRfis = async () => {
      try {
        if (!orgId || !projectId) return;
        const rfisRef = collection(
          firestore,
          "organizations",
          orgId,
          "projects",
          projectId,
          "rfis"
        );
        const snap = await getDocs(rfisRef);
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setRfis(data);
      } catch (err: any) {
        console.error("Fetch RFIs error:", err);
        setError("Failed to load RFIs");
      } finally {
        setLoading(false);
      }
    };
    fetchRfis();
  }, [orgId, projectId]);

  if (loading) {
    return <div className="p-4">Loading RFIs...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <main className="p-4 space-y-4">
      {/* Back to Project */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}`}
        className="text-blue-600 underline"
      >
        &larr; Back to Project
      </Link>

      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">RFIs</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/rfis/new`}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Create New RFI
        </Link>
      </div>

      <ul className="mt-4 space-y-2">
        {rfis.map((rfi) => (
          <li key={rfi.id} className="border p-3 rounded">
            <h3 className="font-semibold">{rfi.subject || "Untitled RFI"}</h3>
            <p className="text-sm text-gray-600">Status: {rfi.status || "open"}</p>
            <Link
              href={`/dashboard/organizations/${orgId}/projects/${projectId}/rfis/${rfi.id}`}
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              View Details
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
