// src/app/dashboard/organizations/[orgId]/projects/page.tsx

"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

export default function ProjectsPage() {
  const { orgId } = useParams() as { orgId: string };
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProjects() {
      if (!orgId) return;
      try {
        const ref = collection(firestore, "organizations", orgId, "projects");
        const snap = await getDocs(ref);
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setProjects(data);
      } catch (err: any) {
        console.error("Fetch projects error:", err);
        setError("Failed to load projects.");
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [orgId]);

  if (loading) {
    return <div className="p-6 text-sm">Loading projects...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
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

      <h1 className="text-2xl font-bold mt-4">Projects under Org {orgId}</h1>

      <div>
        <Link href={`/dashboard/organizations/${orgId}/projects/new`}>
          <GrayButton>Create New Project</GrayButton>
        </Link>
      </div>

      {projects.length === 0 && (
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
          No projects found. Create one!
        </p>
      )}

      <div className="space-y-3 mt-4">
        {projects.map((p) => (
          <Card key={p.id}>
            <p className="font-semibold text-lg">{p.name || p.id}</p>
            {p.status && <p className="text-sm">Status: {p.status}</p>}
            {p.mainProjectId && (
              <p className="text-sm">Sub-project of: {p.mainProjectId}</p>
            )}
            <Link
              href={`/dashboard/organizations/${orgId}/projects/${p.id}`}
              className="
                text-blue-600 underline text-sm mt-2 inline-block
                hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300
              "
            >
              View Project
            </Link>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
