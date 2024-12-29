// src/app/dashboard/organizations/[orgId]/projects/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

export default function ProjectsPage() {
  const { orgId } = useParams() as { orgId: string };
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      if (!orgId) return;
      const ref = collection(firestore, "organizations", orgId, "projects");
      const snap = await getDocs(ref);
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProjects(data);
      setLoading(false);
    }
    fetchProjects();
  }, [orgId]);

  if (loading) {
    return <div className="p-4">Loading projects...</div>;
  }

  return (
    <main className="p-4">
      <h1 className="text-xl mb-4">Projects under Org {orgId}</h1>

      <div className="mb-4">
        <Link
          href={`/dashboard/organizations/${orgId}/projects/new`}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Create New Project
        </Link>
      </div>

      {projects.length === 0 && <p>No projects found. Create one!</p>}

      <ul className="space-y-2">
        {projects.map((p) => (
          <li key={p.id} className="border p-2 rounded">
            <p className="font-semibold text-lg">{p.name || p.id}</p>
            {p.status && <p className="text-sm text-gray-600">Status: {p.status}</p>}
            {p.mainProjectId && (
              <p className="text-sm text-gray-500">Sub-project of: {p.mainProjectId}</p>
            )}
            <Link
              href={`/dashboard/organizations/${orgId}/projects/${p.id}`}
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              View Project
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
